import {
  BROWSERS,
  MEMBERSHIP_FRESH_MS,
  type Funnel,
  type ReportFilters,
  type UsageReport,
  type UsageParty,
} from "jelly-party-lib";

const DAY = 86_400_000;
export async function usageReport(
  db: D1Database,
  from: string,
  to: string,
  filters: ReportFilters = {},
): Promise<UsageReport> {
  const start = Date.parse(from);
  const end = Date.parse(to) + DAY;
  if (
    ![from, to].every((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)) ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    new Date(start).toISOString().slice(0, 10) !== from ||
    new Date(end - DAY).toISOString().slice(0, 10) !== to ||
    end <= start ||
    end - start > 366 * DAY
  )
    throw new RangeError("Choose a date range of up to one year.");
  const page = filters.page ?? 0;
  const source = filters.source ?? "production";
  if (
    !Number.isSafeInteger(page) ||
    page < 0 ||
    page > 10000 ||
    !["production", "test", "all"].includes(source) ||
    (filters.browser && !BROWSERS.includes(filters.browser)) ||
    (filters.site && !/^[a-z0-9.-]{1,253}$/.test(filters.site)) ||
    (filters.version &&
      !/^(?:unknown|\d{1,4}\.\d{1,4}\.\d{1,4}(?:\.\d{1,4})?)$/.test(filters.version))
  )
    throw new RangeError("Invalid report filters.");
  const now = Date.now();
  const conditions = ["(? = 'all' OR source = ?)"];
  const params: (string | number)[] = [source, source];
  for (const field of ["site", "browser", "version"] as const) {
    if (filters[field]) {
      conditions.push(`${field} = ?`);
      params.push(filters[field]!);
    }
  }
  // Filters select matching parties. Their lifetime measures retain both peers and all sites.
  const matched = `WITH matched AS (SELECT DISTINCT party_key FROM events WHERE ${conditions.join(" AND ")}), selected AS (SELECT e.* , e.rowid AS sequence FROM events e JOIN matched USING(party_key))`;
  const cohort = `${matched}, recent AS (
    SELECT party_key, MIN(occurred_at) AS startedAt FROM selected WHERE kind = 'party_created' AND occurred_at >= ? AND occurred_at < ? GROUP BY party_key
  ), evidence AS (
    SELECT e.party_key, MAX(e.occurred_at) AS lastEvent, MAX(p.observed_at) AS observedAt
    FROM selected e JOIN recent USING(party_key) LEFT JOIN party_presence p USING(party_key) GROUP BY e.party_key
  ), membership AS (
    SELECT e.party_key, e.value, e.occurred_at,
      LEAD(e.occurred_at, 1, MAX(v.lastEvent, COALESCE(v.observedAt, 0))) OVER (PARTITION BY e.party_key ORDER BY e.occurred_at, e.revision, e.sequence) AS next_at,
      ROW_NUMBER() OVER (PARTITION BY e.party_key ORDER BY e.occurred_at DESC, e.revision DESC, e.sequence DESC) AS latest
    FROM selected e JOIN recent USING(party_key) JOIN evidence v USING(party_key) WHERE e.kind = 'party_size'
  ), presence AS (
    SELECT party_key, SUM(CASE WHEN value > 0 THEN MAX(0, next_at - occurred_at) ELSE 0 END) AS durationMs,
      SUM(CASE WHEN value >= 2 THEN MAX(0, next_at - occurred_at) ELSE 0 END) AS togetherMs,
      MIN(CASE WHEN value >= 2 THEN occurred_at END) AS togetherAt,
      MAX(value) AS peak, MAX(CASE WHEN latest = 1 THEN value ELSE 0 END) AS connected
    FROM membership GROUP BY party_key
  ), parties AS (
    SELECT r.party_key AS key, r.startedAt, COALESCE(p.durationMs, 0) AS durationMs, COALESCE(p.togetherMs, 0) AS togetherMs,
      p.togetherAt - r.startedAt AS joinDelay, COALESCE(p.peak, 0) AS peak, COALESCE(p.connected, 0) AS connected,
      MAX(v.lastEvent, COALESCE(v.observedAt, 0)) AS observedAt,
      CASE WHEN COALESCE(p.connected, 0) = 0 THEN 'ended' WHEN v.observedAt >= ? THEN 'active' ELSE 'uncertain' END AS status,
      SUM(e.kind = 'participant_joined') AS participants, SUM(e.kind = 'chat_sent') AS messages,
      MAX(e.kind = 'sync_result' AND e.outcome = 'applied') AS synced, GROUP_CONCAT(DISTINCT e.site) AS sites
    FROM recent r JOIN selected e ON e.party_key = r.party_key JOIN evidence v ON v.party_key = r.party_key LEFT JOIN presence p ON p.party_key = r.party_key GROUP BY r.party_key
  )`;
  const cohortQuery = (a: number, b: number, sql: string) =>
    db.prepare(cohort + sql).bind(...params, a, b, now - MEMBERSHIP_FRESH_MS);
  const funnelSql = ` SELECT COUNT(*) AS started, COALESCE(SUM(peak >= 2),0) AS together,
    COALESCE(SUM(togetherMs >= 300000),0) AS fiveMinutes, COALESCE(SUM(togetherMs >= 300000 AND synced),0) AS synced,
    COALESCE(SUM(status = 'uncertain'),0) AS uncertain,
    (SELECT AVG(joinDelay) FROM (SELECT joinDelay, ROW_NUMBER() OVER (ORDER BY joinDelay) AS rank, COUNT(*) OVER () AS n FROM parties WHERE joinDelay IS NOT NULL) WHERE rank IN ((n+1)/2, (n+2)/2)) AS medianTimeToJoinMs FROM parties`;
  const totals = (a: number, b: number) =>
    db
      .prepare(
        `${matched} SELECT kind, SUM(value) AS count FROM selected WHERE occurred_at >= ? AND occurred_at < ? AND kind != 'party_size' GROUP BY kind`,
      )
      .bind(...params, a, b);
  const results = await db.batch([
    totals(start, end),
    totals(start - (end - start), start),
    cohortQuery(start, end, funnelSql),
    cohortQuery(start - (end - start), start, funnelSql),
    db
      .prepare(
        `${matched} SELECT strftime('%Y-%m-%d', occurred_at / 1000, 'unixepoch') AS day, SUM(kind = 'party_created') AS parties, SUM(kind = 'participant_joined') AS participants, SUM(kind = 'chat_sent') AS messages FROM selected WHERE occurred_at >= ? AND occurred_at < ? GROUP BY day ORDER BY day`,
      )
      .bind(...params, start, end),
    db
      .prepare(
        `${matched} SELECT site, COUNT(DISTINCT party_key) AS parties, SUM(kind = 'participant_joined') AS participants FROM selected WHERE occurred_at >= ? AND occurred_at < ? GROUP BY site ORDER BY parties DESC, site`,
      )
      .bind(...params, start, end),
    cohortQuery(
      start,
      end,
      " SELECT peak, COUNT(*) AS parties FROM parties GROUP BY peak ORDER BY peak",
    ),
    cohortQuery(
      start,
      end,
      ` SELECT * FROM parties ORDER BY startedAt DESC, key LIMIT 101 OFFSET ${page * 100}`,
    ),
    db
      .prepare(
        `${matched} SELECT site, browser, version, kind, outcome, COUNT(*) AS count FROM selected e WHERE
          (occurred_at >= ? AND occurred_at < ? AND kind IN ('invite_opened','permission_granted','permission_denied','permission_required','join_attempt','video_ready','video_missing','connection_recovered','sync_attempt'))
          OR (kind = 'sync_result' AND command_id != '' AND EXISTS (SELECT 1 FROM events a WHERE a.kind = 'sync_attempt' AND a.command_id = e.command_id AND a.occurred_at >= ? AND a.occurred_at < ?))
          GROUP BY site,browser,version,kind,outcome ORDER BY count DESC,site,browser,version,kind,outcome`,
      )
      .bind(...params, start, end, start, end),
    db
      .prepare(
        "SELECT DISTINCT site, browser, version FROM events WHERE (? = 'all' OR source = ?) ORDER BY site,browser,version",
      )
      .bind(source, source),
    db.prepare(`${matched} SELECT MAX(occurred_at) AS lastEventAt FROM selected`).bind(...params),
    db
      .prepare(`${matched}, attempts AS (
      SELECT a.command_id, a.site, a.browser, a.version,
        MAX(CASE WHEN r.outcome = 'applied' THEN 1 ELSE 0 END) AS applied,
        MAX(CASE WHEN r.outcome IN ('autoplay-blocked','video-missing','permission-required') THEN 1 ELSE 0 END) AS blocked,
        MAX(CASE WHEN r.outcome IN ('failed','timeout') THEN 1 ELSE 0 END) AS failed
      FROM selected a LEFT JOIN events r ON r.command_id = a.command_id AND r.kind = 'sync_result'
      WHERE a.kind = 'sync_attempt' AND a.command_id != '' AND a.occurred_at >= ? AND a.occurred_at < ?
      GROUP BY a.command_id,a.site,a.browser,a.version
    ) SELECT site,browser,version,COUNT(*) AS attempts,SUM(applied) AS applied,SUM(blocked) AS blocked,SUM(failed) AS failed
      FROM attempts GROUP BY site,browser,version ORDER BY attempts DESC,site,browser,version`)
      .bind(...params, start, end),
  ]);
  const daily = results[4].results as UsageReport["daily"];
  const days = new Map(daily.map((day) => [day.day, day]));
  const rows = results[7].results as Array<Omit<UsageParty, "sites"> & { sites: string }>;
  const choices = results[9].results as Array<{ site: string; browser: string; version: string }>;
  const funnel = results[2].results[0] as Funnel;
  return {
    from,
    to,
    generatedAt: now,
    lastEventAt: (results[10].results[0] as { lastEventAt: number | null }).lastEventAt,
    totals: results[0].results as UsageReport["totals"],
    previousTotals: results[1].results as UsageReport["totals"],
    funnel,
    previousFunnel: results[3].results[0] as Funnel,
    daily: Array.from({ length: (end - start) / DAY }, (_, i) => {
      const day = new Date(start + i * DAY).toISOString().slice(0, 10);
      return days.get(day) ?? { day, parties: 0, participants: 0, messages: 0 };
    }),
    sites: results[5].results as UsageReport["sites"],
    sizes: results[6].results as UsageReport["sizes"],
    parties: rows
      .slice(0, 100)
      .map(
        ({
          key,
          startedAt,
          durationMs,
          togetherMs,
          participants,
          peak,
          connected,
          status,
          observedAt,
          messages,
          sites,
        }) => ({
          key,
          startedAt,
          durationMs,
          togetherMs,
          participants,
          peak,
          connected,
          status,
          observedAt,
          messages,
          sites: sites.split(",").sort(),
        }),
      ),
    outcomes: results[8].results as UsageReport["outcomes"],
    playbackResults: results[11].results as UsageReport["playbackResults"],
    filters: {
      sites: [...new Set(choices.map((r) => r.site))].sort(),
      browsers: [...new Set(choices.map((r) => r.browser))].sort(),
      versions: [...new Set(choices.map((r) => r.version))].sort(),
    },
    hasMoreParties: rows.length > 100,
    page,
    totalParties: funnel.started,
  };
}

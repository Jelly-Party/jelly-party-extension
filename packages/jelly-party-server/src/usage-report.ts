import {
  BROWSERS,
  MEMBERSHIP_FRESH_MS,
  type Funnel,
  type PlaybackSummary,
  type ReportFilters,
  type UsageParty,
  type UsagePartyPage,
  type UsageReport,
} from "jelly-party-lib";

const DAY = 86_400_000;
const PARTY_PAGE_SIZE = 100;
const SYNC_RESULT_WINDOW_MS = 300_000;

function dateRange(from: string, to: string): { start: number; end: number } {
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
  return { start, end };
}

function validateFilters(filters: ReportFilters): void {
  if (
    (filters.source && !["production", "test", "all"].includes(filters.source)) ||
    (filters.browser && !BROWSERS.includes(filters.browser)) ||
    (filters.site && !/^[a-z0-9.-]{1,253}$/.test(filters.site)) ||
    (filters.version &&
      !/^(?:unknown|\d{1,4}\.\d{1,4}\.\d{1,4}(?:\.\d{1,4})?)$/.test(filters.version))
  )
    throw new RangeError("Invalid report filters.");
}

function eventFilter(alias: string, filters: ReportFilters) {
  const conditions: string[] = [];
  const params: string[] = [];
  const source = filters.source ?? "production";
  if (source !== "all") {
    conditions.push(`${alias}.source = ?`);
    params.push(source);
  }
  for (const field of ["site", "browser", "version"] as const) {
    const value = filters[field];
    if (value) {
      conditions.push(`${alias}.${field} = ?`);
      params.push(value);
    }
  }
  return { sql: conditions.length ? ` AND ${conditions.join(" AND ")}` : "", params };
}

// Site and client filters select matching parties. Their summaries retain the full
// party history within the requested traffic source.
function partyFilter(alias: string, filters: ReportFilters) {
  const source = eventFilter(alias, { source: filters.source });
  if (!filters.site && !filters.browser && !filters.version) return source;
  const matching = eventFilter("m", filters);
  return {
    sql: `${source.sql} AND EXISTS (SELECT 1 FROM events m WHERE m.party_key = ${alias}.party_key${matching.sql})`,
    params: [...source.params, ...matching.params],
  };
}

function partyStarts(filters: ReportFilters) {
  const matching = partyFilter("e", filters);
  return {
    sql: `SELECT party_key, MIN(occurred_at) AS startedAt FROM events e
      WHERE kind = 'party_created' AND occurred_at >= ? AND occurred_at < ?${matching.sql}
      GROUP BY party_key`,
    params: matching.params,
  };
}

// These events require an active party socket. Invite and permission reports may
// arrive after everyone disconnected, and cannot extend a presence interval.
const membershipEvidence = `'party_created','participant_joined','party_size','chat_sent',
  'play','pause','seek','video_changed','video_ready','video_missing','connection_recovered',
  'sync_attempt','sync_result'`;

function partyMeasures(recent: string, source: string) {
  return `WITH recent AS (${recent}), cohort_events AS (
    SELECT e.*, e.rowid AS sequence FROM recent JOIN events e USING(party_key) WHERE 1 = 1${source}
  ), activity AS (
    SELECT party_key,
      MAX(CASE WHEN kind IN (${membershipEvidence}) THEN occurred_at END) AS lastMembershipEvent,
      SUM(kind = 'participant_joined') AS participants, SUM(kind = 'chat_sent') AS messages,
      GROUP_CONCAT(DISTINCT site) AS sites
    FROM cohort_events GROUP BY party_key
  ), membership AS (
    SELECT e.party_key, e.value, e.occurred_at,
      LEAD(e.occurred_at, 1, MAX(a.lastMembershipEvent, COALESCE(p.observed_at, 0)))
        OVER (PARTITION BY e.party_key ORDER BY e.occurred_at, e.revision, e.sequence) AS next_at,
      ROW_NUMBER() OVER (PARTITION BY e.party_key ORDER BY e.occurred_at DESC, e.revision DESC, e.sequence DESC) AS latest
    FROM cohort_events e JOIN activity a USING(party_key) LEFT JOIN party_presence p USING(party_key)
    WHERE e.kind = 'party_size'
  ), presence AS (
    SELECT party_key, SUM(CASE WHEN value > 0 THEN MAX(0, next_at - occurred_at) ELSE 0 END) AS durationMs,
      SUM(CASE WHEN value >= 2 THEN MAX(0, next_at - occurred_at) ELSE 0 END) AS togetherMs,
      MIN(CASE WHEN value >= 2 THEN occurred_at END) AS togetherAt,
      MAX(value) AS peak, MAX(CASE WHEN latest = 1 THEN value ELSE 0 END) AS connected
    FROM membership GROUP BY party_key
  ), parties AS (
    SELECT r.party_key AS key, r.startedAt, COALESCE(p.durationMs, 0) AS durationMs,
      COALESCE(p.togetherMs, 0) AS togetherMs, p.togetherAt - r.startedAt AS joinDelay,
      COALESCE(p.peak, 0) AS peak, COALESCE(p.connected, 0) AS connected,
      MAX(a.lastMembershipEvent, COALESCE(s.observed_at, 0)) AS observedAt,
      CASE WHEN COALESCE(p.connected, 0) = 0 THEN 'ended'
        WHEN s.observed_at >= ? THEN 'active' ELSE 'uncertain' END AS status,
      a.participants, a.messages, a.sites
    FROM recent r JOIN activity a USING(party_key) LEFT JOIN presence p USING(party_key)
      LEFT JOIN party_presence s USING(party_key)
  )`;
}

const funnelSummary = `COUNT(*) AS started, COUNT(*) FILTER (WHERE peak >= 2) AS together,
  COUNT(*) FILTER (WHERE togetherMs >= 300000) AS fiveMinutes,
  COUNT(*) FILTER (WHERE status = 'uncertain') AS uncertain,
  (SELECT AVG(joinDelay) FROM (
    SELECT joinDelay, ROW_NUMBER() OVER (ORDER BY joinDelay) AS rank, COUNT(*) OVER () AS n
    FROM parties WHERE joinDelay IS NOT NULL
  ) WHERE rank IN ((n+1)/2, (n+2)/2)) AS medianTimeToJoinMs`;

const sizesSummary = `(SELECT json_group_array(json_object('peak', peak, 'parties', n)) FROM (
  SELECT peak, COUNT(*) AS n FROM parties GROUP BY peak ORDER BY peak
)) AS sizes`;

// Both aliases need the nonempty predicate for SQLite to use events_command.
const attributedResult = `r.command_id = a.command_id AND r.command_id != '' AND r.kind = 'sync_result'
  AND r.party_key = a.party_key AND r.source = a.source`;

const playbackCounts = `COUNT(*) AS attempts, COUNT(DISTINCT party_key) AS parties,
  COUNT(DISTINCT party_key) FILTER (WHERE result IN ('blocked','failed','unanswered')) AS affectedParties,
  COUNT(*) FILTER (WHERE result = 'applied') AS applied,
  COUNT(*) FILTER (WHERE result = 'applied' AND issueAt <= appliedAt) AS recovered,
  COUNT(*) FILTER (WHERE result = 'blocked') AS blocked,
  COUNT(*) FILTER (WHERE result = 'failed') AS failed,
  COUNT(*) FILTER (WHERE result = 'superseded') AS superseded,
  COUNT(*) FILTER (WHERE result = 'unanswered') AS unanswered,
  COUNT(*) FILTER (WHERE result = 'unsupported') AS unsupported,
  COUNT(*) FILTER (WHERE result = 'pending') AS pending`;

function playbackQuery(
  db: D1Database,
  start: number,
  end: number,
  filters: ReportFilters,
  now: number,
): D1PreparedStatement {
  const attempt = eventFilter("a", filters);
  return db
    .prepare(`
    WITH attempts AS (
      SELECT a.party_key, a.site, a.browser, a.version, a.occurred_at,
        MIN(r.occurred_at) FILTER (WHERE r.outcome = 'applied') AS appliedAt,
        MIN(r.occurred_at) FILTER (WHERE r.outcome IN
          ('autoplay-blocked','video-missing','permission-required','failed','timeout')) AS issueAt,
        MAX(r.outcome IN ('autoplay-blocked','video-missing','permission-required')) AS blocked,
        MAX(r.outcome = 'failed') AS failed,
        MAX(r.outcome = 'timeout') AS timedOut,
        MAX(r.outcome = 'superseded') AS superseded
      FROM events a LEFT JOIN events r ON ${attributedResult}
      WHERE a.kind = 'sync_attempt' AND a.command_id != ''
        AND a.occurred_at >= ? AND a.occurred_at < ?${attempt.sql}
      GROUP BY a.rowid
    ), classified AS (
      SELECT *, CASE
        WHEN appliedAt IS NOT NULL THEN 'applied'
        WHEN failed THEN 'failed'
        WHEN blocked THEN 'blocked'
        WHEN NOT (CAST(version AS INTEGER) > 2 OR
          (CAST(version AS INTEGER) = 2 AND CAST(substr(version, instr(version, '.') + 1) AS INTEGER) >= 4))
          THEN 'unsupported'
        WHEN superseded THEN 'superseded'
        WHEN timedOut OR occurred_at <= ? THEN 'unanswered'
        ELSE 'pending'
      END AS result FROM attempts
    )
    SELECT * FROM (
      SELECT NULL AS site, NULL AS browser, NULL AS version, ${playbackCounts} FROM classified
      UNION ALL
      SELECT site, browser, version, ${playbackCounts} FROM classified GROUP BY site, browser, version
    )
    ORDER BY site IS NOT NULL, attempts DESC, site, browser, version
  `)
    .bind(start, end, ...attempt.params, now - SYNC_RESULT_WINDOW_MS);
}

function outcomeQuery(db: D1Database, start: number, end: number, filters: ReportFilters) {
  const event = eventFilter("e", filters);
  const attempt = eventFilter("a", filters);
  return db
    .prepare(`
    WITH details AS (
      SELECT e.site, e.browser, e.version, e.kind, e.outcome FROM events e
      WHERE e.occurred_at >= ? AND e.occurred_at < ?${event.sql}
        AND e.kind IN ('invite_opened','permission_granted','permission_denied','permission_required',
          'join_attempt','video_ready','video_missing','connection_recovered','sync_attempt')
      UNION ALL
      SELECT a.site, a.browser, a.version, r.kind, r.outcome FROM events a
      JOIN events r ON ${attributedResult}
      WHERE a.kind = 'sync_attempt' AND a.command_id != ''
        AND a.occurred_at >= ? AND a.occurred_at < ?${attempt.sql}
    )
    SELECT site, browser, version, kind, outcome, COUNT(*) AS count FROM details
    GROUP BY site, browser, version, kind, outcome ORDER BY count DESC, site, browser, version, kind, outcome
  `)
    .bind(start, end, ...event.params, start, end, ...attempt.params);
}

export async function usageReport(
  db: D1Database,
  from: string,
  to: string,
  filters: ReportFilters = {},
): Promise<UsageReport> {
  const { start, end } = dateRange(from, to);
  validateFilters(filters);
  const now = Date.now();
  const previous = start - (end - start);
  const starts = partyStarts(filters);
  const source = eventFilter("e", { source: filters.source });
  const events = eventFilter("e", filters);
  const partyEvents = partyFilter("e", filters);
  const cohort = partyMeasures(starts.sql, source.sql);
  const cohortQuery = (a: number, b: number, sql: string) =>
    db
      .prepare(cohort + sql)
      .bind(a, b, ...starts.params, ...source.params, now - MEMBERSHIP_FRESH_MS);
  const activity = `FROM events e WHERE occurred_at >= ? AND occurred_at < ?${partyEvents.sql}`;
  const [
    totalsResult,
    funnelResult,
    previousFunnel,
    daily,
    sites,
    outcomes,
    choices,
    latest,
    playback,
  ] = await db.batch([
    db
      .prepare(`SELECT occurred_at < ? AS previous, kind, SUM(value) AS count ${activity}
        AND kind != 'party_size' GROUP BY previous, kind`)
      .bind(start, previous, end, ...partyEvents.params),
    cohortQuery(start, end, ` SELECT ${funnelSummary}, ${sizesSummary} FROM parties`),
    cohortQuery(previous, start, ` SELECT ${funnelSummary} FROM parties`),
    db
      .prepare(`SELECT strftime('%Y-%m-%d', occurred_at / 1000, 'unixepoch') AS day,
        SUM(kind = 'party_created') AS parties, SUM(kind = 'participant_joined') AS participants,
        SUM(kind = 'chat_sent') AS messages ${activity} GROUP BY day ORDER BY day`)
      .bind(start, end, ...partyEvents.params),
    db
      .prepare(`SELECT site, COUNT(DISTINCT party_key) AS parties,
        SUM(kind = 'participant_joined') AS participants ${activity} GROUP BY site ORDER BY parties DESC, site`)
      .bind(start, end, ...partyEvents.params),
    outcomeQuery(db, start, end, filters),
    db
      .prepare(`SELECT DISTINCT site, browser, version FROM events e WHERE 1 = 1${source.sql}
        ORDER BY site, browser, version`)
      .bind(...source.params),
    db
      .prepare(`SELECT MAX(occurred_at) AS lastEventAt FROM events e
        WHERE occurred_at >= ? AND occurred_at < ?${events.sql}`)
      .bind(start, end, ...events.params),
    playbackQuery(db, start, end, filters, now),
  ]);
  const allTotals = totalsResult.results as Array<
    UsageReport["totals"][number] & { previous: number }
  >;
  const { sizes, ...funnel } = funnelResult.results[0] as Funnel & { sizes: string };
  const days = new Map((daily.results as UsageReport["daily"]).map((day) => [day.day, day]));
  const options = choices.results as Array<{ site: string; browser: string; version: string }>;
  const [playbackTotal, ...playbackResults] = playback.results as [
    PlaybackSummary & { site: null; browser: null; version: null },
    ...UsageReport["playbackResults"],
  ];
  const { site: _site, browser: _browser, version: _version, ...playbackSummary } = playbackTotal;
  return {
    from,
    to,
    generatedAt: now,
    lastEventAt: (latest.results[0] as { lastEventAt: number | null }).lastEventAt,
    totals: allTotals.filter((t) => !t.previous).map(({ kind, count }) => ({ kind, count })),
    previousTotals: allTotals.filter((t) => t.previous).map(({ kind, count }) => ({ kind, count })),
    funnel,
    previousFunnel: previousFunnel.results[0] as Funnel,
    daily: Array.from({ length: (end - start) / DAY }, (_, i) => {
      const day = new Date(start + i * DAY).toISOString().slice(0, 10);
      return days.get(day) ?? { day, parties: 0, participants: 0, messages: 0 };
    }),
    sites: sites.results as UsageReport["sites"],
    sizes: JSON.parse(sizes) as UsageReport["sizes"],
    outcomes: outcomes.results as UsageReport["outcomes"],
    playback: playbackSummary,
    playbackResults,
    filters: {
      sites: [...new Set(options.map((r) => r.site))].sort(),
      browsers: [...new Set(options.map((r) => r.browser))].sort(),
      versions: [...new Set(options.map((r) => r.version))].sort(),
    },
  };
}

export async function usagePartyPage(
  db: D1Database,
  from: string,
  to: string,
  filters: ReportFilters = {},
): Promise<UsagePartyPage> {
  const { start, end } = dateRange(from, to);
  validateFilters(filters);
  const page = filters.page ?? 0;
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000)
    throw new RangeError("Invalid party history page.");
  const starts = partyStarts(filters);
  const source = eventFilter("e", { source: filters.source });
  const offset = page * PARTY_PAGE_SIZE;
  const recent = starts.sql + " ORDER BY startedAt DESC, party_key LIMIT ? OFFSET ?";
  const [count, pageResult] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS total FROM (${starts.sql})`).bind(start, end, ...starts.params),
    db
      .prepare(
        partyMeasures(recent, source.sql) + " SELECT * FROM parties ORDER BY startedAt DESC, key",
      )
      .bind(
        start,
        end,
        ...starts.params,
        PARTY_PAGE_SIZE,
        offset,
        ...source.params,
        Date.now() - MEMBERSHIP_FRESH_MS,
      ),
  ]);
  const totalParties = (count.results[0] as { total: number }).total;
  const rows = pageResult.results as Array<
    Omit<UsageParty, "sites"> & { sites: string; joinDelay: number | null }
  >;
  return {
    parties: rows.map(({ sites, joinDelay: _joinDelay, ...party }) => ({
      ...party,
      sites: sites.split(",").sort(),
    })),
    hasMoreParties: offset + PARTY_PAGE_SIZE < totalParties,
    page,
    totalParties,
  };
}

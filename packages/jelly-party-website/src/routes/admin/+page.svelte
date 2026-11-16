<script lang="ts">
import { onMount } from "svelte";
import {
  MEMBERSHIP_FRESH_MS,
  type LiveSnapshot,
  type PlaybackSummary,
  type UsageEvent,
  type UsagePartyPage,
  type UsageReport,
} from "jelly-party-lib";

const day = (offset = 0) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
let from = $state(day(6));
let to = $state(day());
let draftFrom = $state(day(6));
let draftTo = $state(day());
let period = $state("7 days");
let custom = $state(false);
let site = $state("");
let browser = $state("");
let version = $state("");
let source = $state("production");
let loadedFilters = $state("");
let loadedQuery = "";
let live = $state.raw<LiveSnapshot | null>(null);
let report = $state.raw<UsageReport | null>(null);
let partyPage = $state.raw<UsagePartyPage | null>(null);
let partiesOpen = $state(false);
let connection = $state("Connecting");
let error = $state("");
let partyError = $state("");
let loading = $state(false);
let loadingParties = $state(false);
let reconnect: (() => void) | undefined;
let historyRequest: AbortController | undefined;
let partyRequest: AbortController | undefined;
let requestedPartyPage = 0;
let now = $state(Date.now());
let snapshotStale = $derived(live !== null && now - live.updatedAt > 75_000);
let maxDaily = $derived(Math.max(1, ...(report?.daily.map((entry) => entry.parties) ?? [])));

const number = (value: number) => value.toLocaleString();
const shortDate = (value: string) => new Date(value).toLocaleDateString(undefined, {
  month: "short", day: "numeric", timeZone: "UTC",
});
const started = (value: number) => new Date(value).toLocaleString(undefined, {
  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
});
const website = (value: string) => (value === "unknown" ? "Unclassified" : value);
const client = (browser: string, version: string) =>
  browser === "unknown" ? "Unknown client" : `${browser} / ${version}`;

function age(value: number) {
  const seconds = Math.max(0, Math.floor((now - value) / 1_000));
  if (seconds < 60) return "just now";
  if (seconds < 3_600) return `${Math.floor(seconds / 60)} min ago`;
  return `${Math.floor(seconds / 3_600)}h ago`;
}

function duration(ms: number) {
  if (ms === 0) return "0 min";
  if (ms < 60_000) return "<1 min";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
}

function total(kind: UsageEvent, previous = false) {
  return (previous ? report?.previousTotals : report?.totals)?.find((entry) => entry.kind === kind)?.count ?? 0;
}

function change(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "No change" : "No previous activity";
  const delta = Math.round((current - previous) / previous * 100);
  return `${delta > 0 ? "+" : ""}${delta}% vs previous period`;
}

const share = (part: number, whole: number) => whole ? part / whole * 100 : 0;
const percent = (part: number, whole: number) => whole ? `${Math.round(share(part, whole))}%` : "—";
const resolved = (summary: PlaybackSummary) =>
  summary.applied + summary.blocked + summary.failed + summary.unanswered;

function rateChange(part: number, starts: number, previous: number, previousStarts: number) {
  if (!starts || !previousStarts) return "Comparison unavailable";
  const delta = Math.round(share(part, starts) - share(previous, previousStarts));
  return `${delta > 0 ? "+" : ""}${delta} pp vs previous period`;
}

const outcomeLabels: Partial<Record<UsageEvent, string>> = {
  invite_opened: "Invitation opened in extension",
  permission_granted: "Access available",
  permission_denied: "Access declined",
  permission_required: "Access required",
  join_attempt: "Started join from invitation",
  video_ready: "Video found",
  video_missing: "Video missing during detection",
  connection_recovered: "Connection recovered",
  sync_attempt: "Playback sent",
};

function selectPeriod(value: string) {
  period = value;
  custom = false;
  to = day(value === "Yesterday" ? 1 : 0);
  from = day(value === "Yesterday" ? 1 : value === "30 days" ? 29 : value === "7 days" ? 6 : 0);
  void loadHistory();
}

function requestError(status: number, fallback: string) {
  if (status === 401 || status === 403) return "Your session expired. Reload to sign in.";
  if (status === 400) return "Check the filters and choose a date range of up to one year.";
  return fallback;
}

async function loadHistory(preserveFilters = false) {
  historyRequest?.abort();
  const current = new AbortController();
  historyRequest = current;
  loading = true;
  error = "";
  const query = preserveFilters && loadedQuery
    ? new URLSearchParams(loadedQuery)
    : new URLSearchParams({ from, to, source });
  if (!preserveFilters) {
    for (const [key, value] of Object.entries({ site, browser, version })) {
      if (value) query.set(key, value);
    }
  }
  const description = preserveFilters
    ? loadedFilters
    : [site && website(site), browser, version, source === "production" ? "Production" : source === "test" ? "Test traffic" : "All traffic"].filter(Boolean).join(" · ");
  try {
    const response = await fetch(`/admin/api/stats?${query}`, { signal: current.signal });
    if (!response.ok) throw new Error(requestError(response.status, "Could not load history. Try refreshing."));
    const next: UsageReport = await response.json();
    if (historyRequest !== current || current.signal.aborted) return;
    report = next;
    loadedFilters = description;
    loadedQuery = query.toString();
    partyRequest?.abort();
    partyRequest = undefined;
    loadingParties = false;
    partyPage = null;
    partyError = "";
    if (partiesOpen) void loadParties();
  } catch (cause) {
    if (!current.signal.aborted) error = cause instanceof Error ? cause.message : "Could not load history.";
  } finally {
    if (historyRequest === current) loading = false;
  }
}

async function loadParties(page = 0) {
  if (!loadedQuery) return;
  partyRequest?.abort();
  requestedPartyPage = page;
  const current = new AbortController();
  partyRequest = current;
  loadingParties = true;
  partyError = "";
  const query = new URLSearchParams(loadedQuery);
  query.set("page", String(page));
  try {
    const response = await fetch(`/admin/api/parties?${query}`, { signal: current.signal });
    if (!response.ok) throw new Error(requestError(response.status, "Could not load party records."));
    const next: UsagePartyPage = await response.json();
    if (partyRequest === current && !current.signal.aborted) partyPage = next;
  } catch (cause) {
    if (!current.signal.aborted) partyError = cause instanceof Error ? cause.message : "Could not load party records.";
  } finally {
    if (partyRequest === current) loadingParties = false;
  }
}

onMount(() => {
  let socket: WebSocket | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let lastMessage = Date.now();
  const connect = () => {
    if (retry) clearTimeout(retry);
    if (socket) {
      socket.onclose = null;
      socket.close();
    }
    connection = live ? "Reconnecting" : "Connecting";
    const url = new URL("/admin/api/live", location.href);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const current = new WebSocket(url);
    socket = current;
    lastMessage = Date.now();
    current.onopen = () => {
      if (socket === current) connection = "Connected";
    };
    current.onmessage = (event) => {
      if (socket !== current) return;
      lastMessage = Date.now();
      if (event.data === "pong") return;
      try {
        live = JSON.parse(event.data);
        connection = "Connected";
      } catch {
        connection = "Unavailable";
      }
    };
    current.onclose = (event) => {
      if (stopped || socket !== current) return;
      connection = event.code === 1008 ? "Sign in again" : "Disconnected";
      if (event.code !== 1008) retry = setTimeout(connect, 5_000);
    };
    current.onerror = () => {
      if (socket === current) connection = "Disconnected";
    };
  };
  const ticker = setInterval(() => {
    now = Date.now();
    if (!socket) return;
    if (
      (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) &&
      now - lastMessage > 45_000
    ) {
      connection = "Disconnected";
      socket.close();
    } else if (socket.readyState === WebSocket.OPEN) {
      socket.send("ping");
    }
  }, 15_000);
  reconnect = connect;
  connect();
  void loadHistory();
  return () => {
    stopped = true;
    clearInterval(ticker);
    if (retry) clearTimeout(retry);
    socket?.close();
    historyRequest?.abort();
    partyRequest?.abort();
  };
});
</script>

<svelte:head>
  <title>Party activity · Jelly Party</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto max-w-6xl px-5 py-8 sm:px-10 sm:py-12">
  <header class="mb-8">
    <a href="/" class="jp-brand">
      <img src="/jelly-party.svg" alt="" class="h-9 w-9" />
      <span class="text-lg font-750">Jelly Party <span class="ml-2 text-slate-400 font-400">/ activity</span></span>
    </a>
  </header>

  <section aria-labelledby="live-title" class="jp-panel p-5 sm:p-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 id="live-title" class="m-0 text-2xl font-750">Right now</h1>
      <div class="flex items-center gap-3 text-sm">
        <span role="status" class={connection === "Connected" ? "text-jelly-mint" : "text-amber-200"}>
          <span aria-hidden="true">●</span> {connection}
        </span>
        {#if connection === "Sign in again"}
          <a href="/admin" class="jp-link" data-sveltekit-reload>Sign in</a>
        {:else if connection !== "Connected" || snapshotStale}
          <button class="jp-link cursor-pointer border-0 bg-transparent" onclick={() => reconnect?.()}>Reconnect</button>
        {/if}
      </div>
    </div>
    <dl class="my-6 grid grid-cols-3 gap-3 sm:gap-8" class:opacity-50={connection !== "Connected" || snapshotStale}>
      {#each [{ name: "Participants", value: live?.peers, id: "participants" }, { name: "Parties", value: live?.parties, id: "parties" }, { name: "Parties with 2+ people", value: live?.together, id: "parties-with-2+-people" }] as metric}
        <div class="flex flex-col-reverse justify-end">
          <dt class="mt-2 text-sm text-slate-300">{metric.name}</dt>
          <dd class="m-0 text-3xl text-jelly-mint font-750 tabular-nums sm:text-5xl" data-testid={`live-${metric.id}`}>
            {metric.value === undefined ? "—" : number(metric.value)}
          </dd>
        </div>
      {/each}
    </dl>
    {#if live}
      <p class="text-xs text-slate-400">
        Production · Snapshot generated {age(live.updatedAt)}.
        {#if live.observedAt} Last membership evidence {age(live.observedAt)}.{/if}
        {#if snapshotStale || connection !== "Connected"}
          <span class="text-amber-200">Showing older counts.</span>
        {/if}
      </p>
      {#if live.uncertainParties}
        <p class="jp-notice">
          Membership could not be confirmed for {number(live.uncertainParties)}
          {live.uncertainParties === 1 ? "party" : "parties"}
          ({number(live.uncertainPeers)} last reported participants). Live counts exclude them.
        </p>
      {/if}
      {#if live.sites.length}
        <ul class="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Live participants by website">
          {#each live.sites as entry}
            <li class="rounded-full bg-white/5 px-3 py-1.5 text-sm">
              {website(entry.site)} <strong class="ml-1 text-jelly-mint">{number(entry.peers)}</strong>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="m-0 text-sm text-slate-400">No confirmed active parties in this snapshot.</p>
      {/if}
    {:else}
      <p class="m-0 text-xs text-slate-400">Waiting for the first membership snapshot.</p>
    {/if}
  </section>

  <section aria-labelledby="history-title" class="mt-10">
    <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
      <h2 id="history-title" class="m-0 text-2xl font-750">Party history</h2>
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Date range">
        {#each ["Today", "Yesterday", "7 days", "30 days"] as choice}
          <button class="period-button" class:selected={period === choice && !custom}
            aria-pressed={period === choice && !custom} onclick={() => selectPeriod(choice)}>{choice}</button>
        {/each}
        <button class="period-button" class:selected={custom || period === "Custom"} aria-expanded={custom} onclick={() => {
          draftFrom = from;
          draftTo = to;
          custom = !custom;
        }}>Custom</button>
      </div>
    </div>
    {#if custom}
      <form class="mb-5 flex flex-wrap items-center gap-3 rounded-lg bg-white/5 p-3" onsubmit={(event) => {
        event.preventDefault();
        from = draftFrom;
        to = draftTo;
        period = "Custom";
        custom = false;
        void loadHistory();
      }}>
        <input aria-label="Start date" type="date" bind:value={draftFrom} max={draftTo} required class="jp-field" />
        <span aria-hidden="true">→</span>
        <input aria-label="End date" type="date" bind:value={draftTo} min={draftFrom} max={day()} required class="jp-field" />
        <button class="jp-button-primary">View</button>
      </form>
    {/if}
    <form class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5" onsubmit={(event) => {
      event.preventDefault();
      void loadHistory();
    }}>
      <label class="min-w-0 text-xs text-slate-400">Website
        <select class="jp-field mt-2 w-full" bind:value={site}>
          <option value="">All websites</option>
          {#each report?.filters.sites ?? [] as choice}<option value={choice}>{website(choice)}</option>{/each}
        </select>
      </label>
      <label class="min-w-0 text-xs text-slate-400">Browser
        <select class="jp-field mt-2 w-full" bind:value={browser}>
          <option value="">All browsers</option>
          {#each report?.filters.browsers ?? [] as choice}<option value={choice}>{choice}</option>{/each}
        </select>
      </label>
      <label class="min-w-0 text-xs text-slate-400">Extension version
        <select class="jp-field mt-2 w-full" bind:value={version}>
          <option value="">All versions</option>
          {#each report?.filters.versions ?? [] as choice}<option value={choice}>{choice}</option>{/each}
        </select>
      </label>
      <label class="min-w-0 text-xs text-slate-400">Traffic
        <select class="jp-field mt-2 w-full" bind:value={source}>
          <option value="production">Production</option><option value="test">Test</option><option value="all">All traffic</option>
        </select>
      </label>
      <button class="jp-button-primary col-span-2 self-end sm:col-span-1" disabled={loading}>Apply filters</button>
    </form>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <span class="text-sm text-slate-400" data-testid="loaded-range">
        {#if report}{shortDate(report.from)}{report.from !== report.to ? ` to ${shortDate(report.to)}` : ""} · UTC · {loadedFilters}
        {:else}Dates and times are in UTC{/if}
      </span>
      <button class="jp-link cursor-pointer border-0 bg-transparent text-sm" disabled={loading} onclick={() => void loadHistory(true)}>
        {loading ? "Loading…" : "Refresh"}
      </button>
    </div>
    {#if error}
      <p role="alert" class="jp-notice">{error}{report ? " The last successful report is still shown with its original dates and filters." : ""}</p>
    {/if}

    {#if report}
      {@const playback = report.playback}
      <p class="mb-5 mt-2 text-xs text-slate-400">
        Report loaded {age(report.generatedAt)}.
        {report.lastEventAt ? `Latest event in this range ${started(report.lastEventAt)} UTC.` : "No matching events in this range."}
      </p>
      <div aria-busy={loading} class:opacity-50={loading}>
        <section aria-labelledby="activation-title" class="jp-panel p-5 sm:p-6">
          <h3 id="activation-title" class="m-0 text-base font-650">Party starts and participation</h3>
          <ol class="m-0 mt-5 grid list-none gap-5 p-0 sm:grid-cols-3">
            {#each [
              { name: "Parties started", count: report.funnel.started, previous: report.previousFunnel.started },
              { name: "Reached 2 people", count: report.funnel.together, previous: report.previousFunnel.together },
              { name: "5 minutes together", count: report.funnel.fiveMinutes, previous: report.previousFunnel.fiveMinutes },
            ] as stage, index}
              <li>
                <div class="text-sm text-slate-300">{stage.name}</div>
                <div class="my-1 flex flex-wrap items-baseline gap-x-2">
                  <strong class="text-3xl font-700 tabular-nums">{number(stage.count)}</strong>
                  {#if index > 0 && report.funnel.started}
                    <span class="text-xs text-slate-400">{percent(stage.count, report.funnel.started)} of starts</span>
                  {/if}
                </div>
                <div class="mb-2 h-1.5 overflow-hidden rounded-full bg-white/8" aria-hidden="true">
                  <div class="h-full rounded-full bg-jelly-purple" style:width={`${share(stage.count, report.funnel.started)}%`}></div>
                </div>
                <p class="m-0 text-xs text-slate-400">
                  {index === 0 ? change(stage.count, stage.previous) : rateChange(stage.count, report.funnel.started, stage.previous, report.previousFunnel.started)}
                </p>
              </li>
            {/each}
          </ol>
          <p class="mb-0 mt-5 text-xs text-slate-400">
            Outcomes include lifetime activity for parties started in these dates. Website and client filters select parties by matching activity.
            Previous period is the preceding date range of equal length.{report.to === day() ? " Today is partial." : ""}
          </p>
          {#if report.funnel.medianTimeToJoinMs !== null || report.funnel.uncertain}
            <p class="mb-0 mt-2 text-xs text-slate-400">
              {#if report.funnel.medianTimeToJoinMs !== null}
                Median time to a second participant was {duration(report.funnel.medianTimeToJoinMs)}.
              {/if}
              {#if report.funnel.uncertain}
                Time together is a lower bound for {number(report.funnel.uncertain)}
                {report.funnel.uncertain === 1 ? "party with" : "parties with"} uncertain membership.
              {/if}
            </p>
          {/if}
        </section>

        <section aria-labelledby="playback-title" class="jp-panel mt-5 min-w-0 p-5 sm:p-6">
          <h3 id="playback-title" class="m-0 text-base font-650">Playback reliability</h3>
          {#if playback.attempts}
            <dl class="my-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <dt class="text-sm text-slate-300">Applied</dt>
                <dd class="mx-0 my-1 text-3xl font-700 tabular-nums">{percent(playback.applied, resolved(playback))}</dd>
                <dd class="m-0 text-xs text-slate-400">
                  {#if resolved(playback)}{number(playback.applied)} of {number(resolved(playback))} eligible attempts
                  {:else}No eligible attempts{/if}
                </dd>
              </div>
              <div>
                <dt class="text-sm text-slate-300">Parties with issues</dt>
                <dd class="mx-0 my-1 text-3xl font-700 tabular-nums">{number(playback.affectedParties)}</dd>
                <dd class="m-0 text-xs text-slate-400">Of {number(playback.parties)} parties with playback attempts</dd>
              </div>
              <div class="col-span-2 sm:col-span-1">
                <dt class="text-sm text-slate-300">Attempts by outcome</dt>
                <dd class="mx-0 mb-0 mt-2 text-sm">
                  <span class:text-amber-200={playback.affectedParties > 0}>{number(playback.blocked)} blocked · {number(playback.failed)} failed · {number(playback.unanswered)} unanswered</span>
                </dd>
                <dd class="mx-0 mb-0 mt-1 text-xs text-slate-400">{number(playback.recovered)} applied after an earlier issue</dd>
              </div>
            </dl>
            <p class="my-2 text-xs text-slate-400">
              {number(playback.attempts)} attempts in this range, one per receiving player for each command. The applied rate excludes
              {number(playback.unsupported)} without telemetry support, {number(playback.superseded)} superseded, and {number(playback.pending)} pending.
              Applied confirms a playback change on the receiving player.
            </p>
            {#if report.playbackResults.length}
              <details class="mt-4 border-t border-white/10 pt-4">
                <summary class="detail-summary">Playback by website, browser, and version</summary>
                <div class="mt-3 overflow-x-auto">
                  <table class="party-table compact w-full min-w-900px text-left text-sm" aria-label="Playback results">
                    <thead><tr>
                      <th scope="col">Website</th><th scope="col">Client</th><th scope="col">Parties affected</th><th scope="col">Attempts</th>
                      <th scope="col">Applied</th><th scope="col">Recovered</th><th scope="col">Blocked</th>
                      <th scope="col">Failed</th><th scope="col">Unanswered</th><th scope="col">Unsupported</th>
                      <th scope="col">Superseded</th><th scope="col">Pending</th>
                    </tr></thead>
                    <tbody>
                      {#each report.playbackResults as group}
                        <tr>
                          <td>{website(group.site)}</td><td class="whitespace-nowrap">{client(group.browser, group.version)}</td>
                          <td class="whitespace-nowrap">{number(group.affectedParties)} of {number(group.parties)}</td>
                          <td>{number(group.attempts)}</td>
                          <td class="whitespace-nowrap">{number(group.applied)}{resolved(group) ? ` (${percent(group.applied, resolved(group))})` : ""}</td>
                          <td>{number(group.recovered)}</td><td>{number(group.blocked)}</td>
                          <td>{number(group.failed)}</td><td>{number(group.unanswered)}</td>
                          <td>{number(group.unsupported)}</td><td>{number(group.superseded)}</td><td>{number(group.pending)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </details>
            {/if}
          {:else}
            <p class="mb-0 text-sm text-slate-400">No remote playback attempts matched these dates and filters.</p>
          {/if}
        </section>

        <details class="jp-panel mt-5 p-5 sm:p-6">
          <summary class="detail-summary">Onboarding and playback event counts</summary>
          {#if report.outcomes.length}
            <p class="my-3 text-xs text-slate-400">
              Invitation events start at the extension’s join screen. A player can report multiple outcomes while loading or recovering.
            </p>
            <div class="overflow-x-auto">
              <table class="party-table w-full min-w-620px text-left text-sm" aria-label="Outcome details">
                <thead><tr><th scope="col">Website</th><th scope="col">Client</th><th scope="col">Event</th><th scope="col">Count</th></tr></thead>
                <tbody>
                  {#each report.outcomes as entry}
                    <tr>
                      <td>{website(entry.site)}</td><td>{client(entry.browser, entry.version)}</td>
                      <td>{entry.outcome ? entry.outcome.replaceAll("-", " ") : outcomeLabels[entry.kind] ?? entry.kind}</td>
                      <td>{number(entry.count)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <p class="mb-0 text-sm text-slate-400">No outcome events matched.</p>
          {/if}
        </details>

        <details class="jp-panel mt-5 p-5 sm:p-6" ontoggle={(event) => {
          partiesOpen = event.currentTarget.open;
          if (partiesOpen && !partyPage && !loadingParties) void loadParties();
        }}>
          <summary class="detail-summary">Party records</summary>
          <p class="mb-4 mt-3 text-xs text-slate-400">
            Records show lifetime activity for matching starts. Connected means at least one participant. Together means at least two at the same time.
          </p>
          <div aria-busy={loadingParties}>
            {#if partyError}
              <p role="alert" class="jp-notice">
                {partyError}
                <button class="jp-link cursor-pointer border-0 bg-transparent" onclick={() => void loadParties(requestedPartyPage)}>Retry</button>
              </p>
            {/if}
            {#if partyPage}
              {#if partyPage.parties.length}
                <div class="overflow-x-auto">
                  <table aria-label="Recent parties" class="party-table w-full min-w-800px text-left text-sm">
                    <thead><tr>
                      <th scope="col">Started (UTC)</th><th scope="col">Websites</th><th scope="col">Participations</th>
                      <th scope="col">Connected</th><th scope="col">Together</th><th scope="col">Status</th><th scope="col">Messages</th>
                    </tr></thead>
                    <tbody>
                      {#each partyPage.parties as party (party.key)}
                        <tr>
                          <td class="whitespace-nowrap"><time datetime={new Date(party.startedAt).toISOString()}>{started(party.startedAt)}</time></td>
                          <td class="max-w-64 break-words">{party.sites.map(website).join(", ")}</td>
                          <td>{number(party.participants)} <span class="text-xs text-slate-400">peak {party.peak}</span></td>
                          <td class="whitespace-nowrap">{duration(party.durationMs)}</td>
                          <td class="whitespace-nowrap">{duration(party.togetherMs)}</td>
                          <td class={party.status === "uncertain" ? "text-amber-200" : party.status === "active" ? "text-jelly-mint" : "text-slate-400"}
                            title={`Last evidence ${started(party.observedAt)} UTC`}>
                            {party.status === "active" && now - party.observedAt > MEMBERSHIP_FRESH_MS ? "Refresh to confirm" : party.status}
                          </td>
                          <td>{number(party.messages)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
                <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <button class="period-button" disabled={loadingParties || partyPage.page === 0}
                    onclick={() => void loadParties((partyPage?.page ?? 0) - 1)}>Previous page</button>
                  <span>{loadingParties ? "Loading…" : `Page ${partyPage.page + 1} · ${number(partyPage.totalParties)} starts`}</span>
                  <button class="period-button" disabled={loadingParties || !partyPage.hasMoreParties}
                    onclick={() => void loadParties((partyPage?.page ?? 0) + 1)}>Next page</button>
                </div>
              {:else}
                <p class="mb-0 text-sm text-slate-400">No party starts matched.</p>
              {/if}
            {:else if loadingParties}
              <p class="mb-0 text-sm text-slate-400">Loading party records…</p>
            {/if}
          </div>
        </details>

        <details class="jp-panel mt-5 p-5 sm:p-6">
          <summary class="detail-summary">Activity and websites</summary>
          <div class="mt-5 grid gap-6 lg:grid-cols-2">
            <div>
              <h4 class="m-0 text-sm font-650">Parties started by day</h4>
              <div class="mt-3 max-h-72 overflow-y-auto space-y-3">
                {#each report.daily as entry}
                  <div class="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-xs">
                    <span class="text-slate-400">{entry.day}</span>
                    <div class="h-2 overflow-hidden rounded-full bg-white/8" aria-hidden="true">
                      <div class="h-full rounded-full bg-jelly-purple" style:width={`${share(entry.parties, maxDaily)}%`}></div>
                    </div>
                    <span class="text-right">{number(entry.parties)}</span>
                  </div>
                {/each}
              </div>
            </div>
            <div>
              <h4 class="m-0 text-sm font-650">Peak party size</h4>
              {#if report.sizes.length}
                <div class="mt-3 space-y-2">
                  {#each report.sizes as size}
                    <div class="flex justify-between gap-3 text-sm">
                      <span>{size.peak} {size.peak === 1 ? "person" : "people"}</span>
                      <span>{number(size.parties)} {size.parties === 1 ? "party" : "parties"}</span>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="mt-3 text-sm text-slate-400">No parties recorded.</p>
              {/if}
            </div>
          </div>
          <dl class="mb-0 mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div>
              <dt class="text-slate-400">Participations</dt>
              <dd class="m-0">{number(total("participant_joined"))} · {change(total("participant_joined"), total("participant_joined", true))}</dd>
            </div>
            <div>
              <dt class="text-slate-400">Chat messages</dt>
              <dd class="m-0">{number(total("chat_sent"))} · {change(total("chat_sent"), total("chat_sent", true))}</dd>
            </div>
            <div>
              <dt class="text-slate-400">Playback commands received</dt>
              <dd class="m-0">{number(total("play"))} play · {number(total("pause"))} pause · {number(total("seek"))} seek</dd>
            </div>
          </dl>
          <p class="my-3 text-xs text-slate-400">Activity totals cover the selected dates. Each person counts once per party they join.</p>
          {#if report.sites.length}
            <div class="overflow-x-auto">
              <table class="party-table w-full text-left text-sm" aria-label="Websites">
                <thead><tr><th scope="col">Website</th><th scope="col">Parties</th><th scope="col">Participations</th></tr></thead>
                <tbody>
                  {#each report.sites as entry}
                    <tr><td>{website(entry.site)}</td><td>{number(entry.parties)}</td><td>{number(entry.participants)}</td></tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </details>
      </div>
    {:else if loading}
      <p class="text-sm text-slate-400">Loading history…</p>
    {/if}
  </section>
</div>

<style>
.period-button {
  border: 1px solid transparent;
  border-radius: 0.5rem;
  background: transparent;
  color: #94a3b8;
  padding: 0.5rem 0.75rem;
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}
.period-button:hover { background: #ffffff0a; color: #f1f5f9; }
.period-button.selected { background: #a78bfa1a; border-color: #a78bfa40; color: #c4b5fd; }
.period-button:disabled { opacity: 0.4; cursor: default; }
.period-button:focus-visible, .detail-summary:focus-visible { outline: 2px solid #a78bfa; outline-offset: 4px; }
.detail-summary { cursor: pointer; font-weight: 650; }
.party-table th { color: #94a3b8; font-size: 0.75rem; font-weight: 500; background: #ffffff03; }
.party-table th, .party-table td { padding: 0.75rem 1rem; }
.party-table td { border-top: 1px solid #ffffff0a; }
.party-table tbody tr:hover { background: #ffffff03; }
.party-table.compact th, .party-table.compact td { padding-inline: 0.65rem; }
select { color-scheme: dark; }
</style>

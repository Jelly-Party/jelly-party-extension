<script lang="ts">
import { onMount } from 'svelte';
import type { LiveSnapshot, UsageReport, UsageEvent } from 'jelly-party-lib';

const today = new Date().toISOString().slice(0, 10);
let from = $state(new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10));
let to = $state(today);
let period = $state('7 days');
let custom = $state(false);
const day = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
const shortDate = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
const started = (value: number) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
const duration = (ms: number) => {
  if (ms < 60000) return '<1 min';
  const minutes = Math.floor(ms / 60000);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;
};
function selectPeriod(value: string) {
  period = value;
  custom = false;
  to = day(value === 'Yesterday' ? 1 : 0);
  from = day(value === 'Yesterday' ? 1 : value === '30 days' ? 29 : value === '7 days' ? 6 : 0);
  void loadHistory();
}
let live = $state<LiveSnapshot | null>(null);
let report = $state<UsageReport | null>(null);
let connection = $state('Connecting');
let error = $state('');
let loading = $state(false);
let reconnect: (() => void) | undefined;
let controller: AbortController | undefined;
const number = (value: number) => value.toLocaleString();
const total = (kind: UsageEvent) => report?.totals.find((entry) => entry.kind === kind)?.count ?? 0;
let maxDaily = $derived(Math.max(1, ...((report?.daily ?? []).map((day) => day.parties))));

async function loadHistory() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  loading = true;
  error = '';
  try {
    const response = await fetch(`/admin/api/stats?${new URLSearchParams({ from, to })}`, { signal: current.signal });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Your session expired. Reload this page to sign in.' : 'Could not load history. Try again.');
    report = await response.json();
  } catch (cause) {
    if (!current.signal.aborted) error = cause instanceof Error ? cause.message : 'Could not load history.';
  } finally {
    if (controller === current) loading = false;
  }
}

onMount(() => {
  let socket: WebSocket | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const connect = () => {
    if (retry) clearTimeout(retry);
    if (socket) { socket.onclose = null; socket.close(); }
    connection = live ? 'Reconnecting' : 'Connecting';
    const url = new URL('/admin/api/live', location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(url);
    socket.onmessage = (event) => {
      try { live = JSON.parse(event.data); connection = 'Live'; }
      catch { connection = 'Unavailable'; }
    };
    socket.onclose = (event) => {
      if (stopped) return;
      connection = event.code === 1008 ? 'Sign in again' : 'Disconnected';
      if (event.code !== 1008) retry = setTimeout(connect, 5000);
    };
    socket.onerror = () => { connection = 'Disconnected'; };
  };
  reconnect = connect;
  connect();
  void loadHistory();
  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    socket?.close();
    controller?.abort();
  };
});
</script>

<svelte:head>
  <title>Party activity · Jelly Party</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto max-w-6xl px-5 py-8 sm:px-10 sm:py-12">
  <header class="mb-10 flex flex-wrap items-center justify-between gap-5">
    <a href="/" class="jp-brand"><img src="/jelly-party.svg" alt="Jelly Party" class="h-9 w-9" /><span class="text-lg font-750">Jelly Party <span class="ml-2 text-slate-400 font-400">/ activity</span></span></a>
    <span class="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-400">Private dashboard</span>
  </header>

  <section aria-labelledby="live-title" class="jp-panel overflow-hidden p-6 sm:p-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 id="live-title" class="m-0 text-2xl font-750">Right now</h1>
      <div class="flex items-center gap-3 text-sm">
        <span role="status" class={connection === 'Live' ? 'text-jelly-mint' : 'text-amber-200'}>● {connection}</span>
        {#if connection === 'Sign in again'}<a href="/admin" class="jp-link" data-sveltekit-reload>Sign in</a>{:else if connection !== 'Live'}<button class="jp-link border-0 bg-transparent cursor-pointer" onclick={() => reconnect?.()}>Reconnect</button>{/if}
      </div>
    </div>
    <div class="my-8 grid grid-cols-3 gap-3 sm:gap-8">
      {#each [['Participants', live?.peers], ['Parties', live?.parties], ['With friends', live?.together]] as [label, value]}
        <div><div class="text-3xl text-jelly-mint font-750 tabular-nums sm:text-5xl" data-testid={`live-${String(label).toLowerCase().replaceAll(' ', '-')}`}>{value === undefined ? '—' : number(Number(value))}</div><div class="mt-2 text-sm text-slate-300">{label}</div></div>
      {/each}
    </div>
    {#if live?.sites.length}
      <div class="flex flex-wrap gap-2" aria-label="Live websites">
        {#each live.sites as site}<span class="rounded-full bg-white/5 px-3 py-1.5 text-sm"><span class="text-slate-300">{site.site === 'unknown' ? 'Other' : site.site}</span><strong class="ml-2 text-jelly-mint tabular-nums">{number(site.peers)}</strong></span>{/each}
      </div>
    {:else if live}<p class="m-0 text-sm text-slate-400">No active parties.</p>{/if}

  </section>

  <section aria-labelledby="history-title" class="mt-12">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-5">
      <h2 id="history-title" class="m-0 text-2xl font-750">Party history</h2>
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Date range">
        {#each ['Today', 'Yesterday', '7 days', '30 days'] as choice}
          <button class="period-button" class:selected={period === choice && !custom} aria-pressed={period === choice && !custom} onclick={() => selectPeriod(choice)}>{choice}</button>
        {/each}
        <button class="period-button" class:selected={custom || period === 'Custom'} aria-expanded={custom} onclick={() => custom = !custom}>Custom</button>
      </div>
    </div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <span class="text-sm text-slate-400">{shortDate(from)}{from !== to ? ` – ${shortDate(to)}` : ''}</span>
      <button class="jp-link cursor-pointer border-0 bg-transparent text-sm" disabled={loading} onclick={() => void loadHistory()}>{loading ? 'Loading…' : 'Refresh'}</button>
    </div>
    {#if custom}
      <form class="mb-6 flex flex-wrap items-center gap-3 rounded-lg bg-white/5 p-3" onsubmit={(event) => { event.preventDefault(); period = 'Custom'; custom = false; void loadHistory(); }}>
        <input aria-label="Start date" type="date" bind:value={from} max={to} required class="jp-field" />
        <span class="text-slate-500" aria-hidden="true">→</span>
        <input aria-label="End date" type="date" bind:value={to} min={from} max={today} required class="jp-field" />
        <button class="jp-button-primary" disabled={loading}>View</button>
      </form>
    {/if}
    {#if error}<p role="alert" class="jp-notice">{error}</p>{/if}
    {#if report}
      <div class="grid grid-cols-3 gap-3 sm:gap-4">
        {#each [['Parties started', total('party_created')], ['Participants', total('participant_joined')], ['Chat messages', total('chat_sent')]] as [label, value]}
          <div class="rounded-lg border border-white/10 p-3 sm:p-5"><div class="min-h-10 text-sm text-slate-400 sm:min-h-0">{label}</div><div class="mt-2 text-3xl font-700 tabular-nums">{number(Number(value))}</div></div>
        {/each}
      </div>
      <div class="jp-panel mt-6 min-w-0 overflow-hidden">
        <div class="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
          <h3 class="m-0 text-base font-650">Recent parties</h3>
          {#if report.hasMoreParties}<span class="text-xs text-slate-400">Latest 100</span>{/if}
        </div>
        {#if report.parties.length}
          <div class="overflow-x-auto">
            <table aria-label="Recent parties" class="party-table w-full min-w-640px text-left text-sm">
              <thead><tr><th>Started</th><th>Websites</th><th>Participants</th><th>Duration</th><th class="text-right">Messages</th></tr></thead>
              <tbody>{#each report.parties as party (party.key)}
                <tr>
                  <td class="whitespace-nowrap"><time datetime={new Date(party.startedAt).toISOString()}>{started(party.startedAt)}</time></td>
                  <td class="max-w-64 break-words">{party.sites.map(site => site === 'unknown' ? 'Other' : site).join(', ')}</td>
                  <td class="tabular-nums">{number(party.participants)}<span class="ml-2 text-xs text-slate-500" title="Most people connected at once">· peak {party.peak}</span></td>
                  <td class="whitespace-nowrap tabular-nums">{duration(party.durationMs)}{#if party.connected > 0}<span class="ml-2 text-xs text-jelly-mint">Active</span>{/if}</td>
                  <td class="text-right tabular-nums">{number(party.messages)}</td>
                </tr>
              {/each}</tbody>
            </table>
          </div>
        {:else}<p class="m-0 px-6 pb-6 text-sm text-slate-400">No parties started in this period.</p>{/if}
      </div>
      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <div class="jp-panel p-6"><h3 class="m-0 text-base font-650">Parties started by day</h3>
          {#if report.daily.length}<div class="mt-5 max-h-72 overflow-y-auto space-y-3">
            {#each report.daily as day}<div class="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-xs"><span class="text-slate-400">{day.day}</span><div class="h-3 overflow-hidden rounded-full bg-white/5"><div class="h-full rounded-full bg-jelly-purple" style:width={`${day.parties / maxDaily * 100}%`}></div></div><span class="text-right tabular-nums">{number(day.parties)}</span></div>{/each}
          </div>{:else}<p class="mt-5 text-sm text-slate-400">No activity in this date range.</p>{/if}
        </div>
        <div class="jp-panel p-6"><h3 class="m-0 text-base font-650">Websites used</h3>
          {#if report.sites.length}<table aria-label="Websites" class="mt-4 w-full text-left text-sm"><thead class="text-xs text-slate-500"><tr><th class="py-2 font-500">Website</th><th class="text-right font-500">Parties</th><th class="text-right font-500">Participants</th></tr></thead><tbody>{#each report.sites as site}<tr class="border-t border-white/5"><td class="py-3 text-slate-300">{site.site === 'unknown' ? 'Other' : site.site}</td><td class="text-right tabular-nums">{number(site.parties)}</td><td class="text-right tabular-nums">{number(site.participants)}</td></tr>{/each}</tbody></table>{:else}<p class="mt-5 text-sm text-slate-400">No websites recorded yet.</p>{/if}
        </div>
      </div>

    {:else if loading}<p class="text-slate-400">Loading history…</p>{/if}
  </section>
</div>

<style>
.period-button { border: 1px solid transparent; border-radius: .5rem; background: transparent; color: #94a3b8; padding: .5rem .75rem; font: inherit; font-size: .875rem; cursor: pointer; }
.period-button:hover { background: #ffffff0a; color: #f1f5f9; }
.period-button.selected { background: #a78bfa1a; border-color: #a78bfa40; color: #c4b5fd; }
.period-button:focus-visible { outline: 2px solid #a78bfa; outline-offset: 2px; }
.party-table th { color: #94a3b8; font-size: .75rem; font-weight: 500; padding: .75rem 1.5rem; background: #ffffff03; }
.party-table td { padding: 1rem 1.5rem; border-top: 1px solid #ffffff0a; }
.party-table tbody tr:hover { background: #ffffff03; }
</style>

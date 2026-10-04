<script lang="ts">
import { onMount } from 'svelte';
import type { LiveSnapshot, UsageReport, UsageEvent } from 'jelly-party-lib';
const day = (offset = 0) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
let from = $state(day(6));
let to = $state(day());
let draftFrom = $state(day(6));
let draftTo = $state(day());
let period = $state('7 days');
let custom = $state(false);
let site = $state('');
let browser = $state('');
let version = $state('');
let source = $state('production');
let loadedFilters = $state('');
let loadedQuery = '';
let live = $state<LiveSnapshot | null>(null);
let report = $state<UsageReport | null>(null);
let connection = $state('Connecting');
let error = $state('');
let loading = $state(false);
let reconnect: (() => void) | undefined;
let controller: AbortController | undefined;
let now = $state(Date.now());
const number = (value: number) => value.toLocaleString();
const shortDate = (value: string) => new Date(value).toLocaleDateString(undefined, {month:'short',day:'numeric',timeZone:'UTC'});
const started = (value: number) => new Date(value).toLocaleString(undefined, {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
const age = (value: number) => {const seconds=Math.max(0,Math.floor((now-value)/1000));return seconds < 60 ? 'just now' : seconds < 3600 ? `${Math.floor(seconds/60)} min ago` : `${Math.floor(seconds/3600)}h ago`;};
const duration = (ms: number) => {if(ms < 60000) return '<1 min';const minutes=Math.floor(ms/60000);return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes/60)}h${minutes%60 ? ` ${minutes%60}m` : ''}`;};
const total = (kind: UsageEvent, previous=false) => (previous ? report?.previousTotals : report?.totals)?.find(e=>e.kind === kind)?.count ?? 0;
const change = (current:number,previous:number) => previous === 0 ? current === 0 ? 'No change' : 'No previous activity' : `${current >= previous ? '+' : ''}${Math.round((current-previous)/previous*100)}% vs previous period`;
const label = (value:string) => value.replaceAll('_',' ').replaceAll('-',' ');
const percent = (part:number,whole:number) => whole ? `${Math.round(part/whole*100)}%` : '—';
let maxDaily = $derived(Math.max(1,...(report?.daily.map(d=>d.parties) ?? [])));
let syncGroups = $derived(report?.playbackResults ?? []);
function selectPeriod(value:string) {
  period=value;custom=false;
  to=day(value === 'Yesterday' ? 1 : 0);
  from=day(value === 'Yesterday' ? 1 : value === '30 days' ? 29 : value === '7 days' ? 6 : 0);
  void loadHistory();
}
async function loadHistory(page=0, preserveFilters=false) {
  controller?.abort();
  const current=new AbortController();controller=current;loading=true;error='';
  const query=preserveFilters && loadedQuery ? new URLSearchParams(loadedQuery) : new URLSearchParams({from,to,source});
  query.set("page",String(page));
  if(!preserveFilters) for(const [key,value] of Object.entries({site,browser,version})) if(value) query.set(key,value);
  const description=preserveFilters ? loadedFilters : [site,browser,version,source === 'production' ? 'Production' : source === 'test' ? 'Test traffic' : 'All traffic'].filter(Boolean).join(' · ');
  try {
    const response=await fetch(`/admin/api/stats?${query}`,{signal:current.signal});
    if(!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Your session expired. Reload this page to sign in.' : response.status === 400 ? 'Choose a valid date range of up to one year.' : 'Could not load history. Try again.');
    const next:UsageReport=await response.json();
    if(controller !== current || current.signal.aborted) return;
    report=next;loadedFilters=description;loadedQuery=query.toString();
  } catch(cause) {if(!current.signal.aborted) error=cause instanceof Error ? cause.message : 'Could not load history.';}
  finally {if(controller === current) loading=false;}
}
onMount(()=>{
  let socket:WebSocket | undefined;
  let retry:ReturnType<typeof setTimeout> | undefined;
  let stopped=false;
  let lastMessage=Date.now();
  const connect=()=>{
    if(retry) clearTimeout(retry);
    if(socket) {socket.onclose=null;socket.close();}
    connection=live ? 'Reconnecting' : 'Connecting';
    const url=new URL('/admin/api/live',location.href);url.protocol=location.protocol === 'https:' ? 'wss:' : 'ws:';
    const current=new WebSocket(url);socket=current;lastMessage=Date.now();
    current.onmessage=event=>{
      if(socket !== current) return;
      lastMessage=Date.now();
      if(event.data === 'pong') return;
      try {live=JSON.parse(event.data);connection='Live';} catch {connection='Unavailable';}
    };
    current.onclose=event=>{
      if(stopped || socket !== current) return;
      connection=event.code === 1008 ? 'Sign in again' : 'Disconnected';
      if(event.code !== 1008) retry=setTimeout(connect,5000);
    };
    current.onerror=()=>{if(socket === current) connection='Disconnected';};
  };
  const ticker=setInterval(()=>{
    now=Date.now();
    if(socket?.readyState === WebSocket.OPEN) {
      if(now-lastMessage>45000) {connection='Disconnected';socket.close();}
      else socket.send('ping');
    }
  },15000);
  reconnect=connect;connect();void loadHistory();
  return ()=>{stopped=true;clearInterval(ticker);if(retry) clearTimeout(retry);socket?.close();controller?.abort();};
});
</script>

<svelte:head><title>Party activity · Jelly Party</title><meta name="robots" content="noindex, nofollow" /></svelte:head>
<div class="mx-auto max-w-6xl px-5 py-8 sm:px-10 sm:py-12">
  <header class="mb-10 flex flex-wrap items-center justify-between gap-5">
    <a href="/" class="jp-brand"><img src="/jelly-party.svg" alt="Jelly Party" class="h-9 w-9" /><span class="text-lg font-750">Jelly Party <span class="ml-2 text-slate-400 font-400">/ activity</span></span></a>
    <span class="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-400">Private dashboard</span>
  </header>
  <section aria-labelledby="live-title" class="jp-panel overflow-hidden p-6 sm:p-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 id="live-title" class="m-0 text-2xl font-750">Right now</h1>
      <div class="flex items-center gap-3 text-sm"><span role="status" class={connection === 'Live' ? 'text-jelly-mint' : 'text-amber-200'}>● {connection}</span>
        {#if connection === 'Sign in again'}<a href="/admin" class="jp-link" data-sveltekit-reload>Sign in</a>{:else if connection !== 'Live'}<button class="jp-link border-0 bg-transparent cursor-pointer" onclick={()=>reconnect?.()}>Reconnect</button>{/if}
      </div>
    </div>
    <div class="my-8 grid grid-cols-3 gap-3 sm:gap-8" class:opacity-50={connection !== 'Live'}>
      {#each [['Participants',live?.peers],['Parties',live?.parties],['Parties with 2+ people',live?.together]] as [name,value]}
        <div><div class="text-3xl text-jelly-mint font-750 tabular-nums sm:text-5xl" data-testid={`live-${String(name).toLowerCase().replaceAll(' ','-')}`}>{value === undefined ? '—' : number(Number(value))}</div><div class="mt-2 text-sm text-slate-300">{name}</div></div>
      {/each}
    </div>
    {#if live}
      <p class="text-xs text-slate-400">Production · Membership checked each minute. Dashboard updated {age(live.updatedAt)}. Last membership evidence: {live.observedAt ? age(live.observedAt) : 'none'}.{connection !== 'Live' ? ' Showing the last received counts.' : ''}</p>
      {#if live.uncertainParties}<p class="jp-notice">{number(live.uncertainParties)} parties have unconfirmed membership ({number(live.uncertainPeers)} last reported participants). They are excluded from the current counts.</p>{/if}
      {#if live.sites.length}<div class="flex flex-wrap gap-2" aria-label="Live websites">{#each live.sites as entry}<span class="rounded-full bg-white/5 px-3 py-1.5 text-sm">{entry.site === 'unknown' ? 'Unclassified' : entry.site}<strong class="ml-2 text-jelly-mint">{number(entry.peers)}</strong></span>{/each}</div>{:else}<p class="m-0 text-sm text-slate-400">No confirmed active parties.</p>{/if}
    {/if}
  </section>

  <section aria-labelledby="history-title" class="mt-12">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-5"><h2 id="history-title" class="m-0 text-2xl font-750">Party history</h2>
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Date range">
        {#each ['Today','Yesterday','7 days','30 days'] as choice}<button class="period-button" class:selected={period === choice && !custom} aria-pressed={period === choice && !custom} onclick={()=>selectPeriod(choice)}>{choice}</button>{/each}
        <button class="period-button" class:selected={custom || period === 'Custom'} aria-expanded={custom} onclick={()=>{draftFrom=from;draftTo=to;custom=!custom;}}>Custom</button>
      </div>
    </div>
    {#if custom}<form class="mb-6 flex flex-wrap items-center gap-3 rounded-lg bg-white/5 p-3" onsubmit={event=>{event.preventDefault();from=draftFrom;to=draftTo;period='Custom';custom=false;void loadHistory();}}>
      <input aria-label="Start date" type="date" bind:value={draftFrom} max={draftTo} required class="jp-field" /><span aria-hidden="true">→</span><input aria-label="End date" type="date" bind:value={draftTo} min={draftFrom} max={day()} required class="jp-field" /><button class="jp-button-primary">View</button>
    </form>{/if}
    <form class="mb-5 grid gap-3 sm:grid-cols-5" onsubmit={event=>{event.preventDefault();void loadHistory();}}>
      <label class="text-xs text-slate-400">Website<select class="jp-field mt-2 w-full" bind:value={site}><option value="">All websites</option>{#each report?.filters.sites ?? [] as choice}<option value={choice}>{choice}</option>{/each}</select></label>
      <label class="text-xs text-slate-400">Browser<select class="jp-field mt-2 w-full" bind:value={browser}><option value="">All browsers</option>{#each report?.filters.browsers ?? [] as choice}<option value={choice}>{choice}</option>{/each}</select></label>
      <label class="text-xs text-slate-400">Extension version<select class="jp-field mt-2 w-full" bind:value={version}><option value="">All versions</option>{#each report?.filters.versions ?? [] as choice}<option value={choice}>{choice}</option>{/each}</select></label>
      <label class="text-xs text-slate-400">Traffic<select class="jp-field mt-2 w-full" bind:value={source}><option value="production">Production</option><option value="test">Test</option><option value="all">All traffic</option></select></label>
      <button class="jp-button-primary self-end" disabled={loading}>Apply filters</button>
    </form>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <span class="text-sm text-slate-400" data-testid="loaded-range">{#if report}{shortDate(report.from)}{report.from !== report.to ? ` to ${shortDate(report.to)}` : ''} · UTC · {loadedFilters}{:else}Dates and times are in UTC{/if}</span>
      <button class="jp-link cursor-pointer border-0 bg-transparent text-sm" disabled={loading} onclick={()=>void loadHistory(report?.page ?? 0, true)}>{loading ? 'Loading…' : 'Refresh'}</button>
    </div>
    {#if error}<p role="alert" class="jp-notice">{error}{report ? ' The last successful report is still shown with its original dates.' : ''}</p>{/if}
    {#if report}
      <p class="text-xs text-slate-400">History loaded {age(report.generatedAt)}. {report.lastEventAt ? `Latest matching event: ${started(report.lastEventAt)} UTC.` : 'No matching events.'} Filters select parties with matching events; party rows and the funnel show their lifetime outcomes.</p>
      <div aria-busy={loading} class:opacity-50={loading}>
        <div class="grid grid-cols-3 gap-3 sm:gap-4">
          {#each [['Parties started','party_created'],['Participations','participant_joined'],['Chat messages','chat_sent']] as [name,kind]}
            <div class="rounded-lg border border-white/10 p-3 sm:p-5"><div class="text-sm text-slate-400">{name}</div><div class="mt-2 text-3xl font-700 tabular-nums">{number(total(kind as UsageEvent))}</div><div class="mt-2 text-xs text-slate-400">{change(total(kind as UsageEvent),total(kind as UsageEvent,true))}</div></div>
          {/each}
        </div>
        <p class="text-xs text-slate-400">Activity totals cover the selected dates. Participations count each person once per party, not unique users across parties. Comparisons use the preceding equal-length period; today is partial.</p>
        <div class="jp-panel mt-6 p-6"><h3 class="m-0 text-base font-650">From starting to watching together</h3>
          <div class="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {#each [['Started',report.funnel.started,report.previousFunnel.started],['Reached 2 people',report.funnel.together,report.previousFunnel.together],['5 minutes together',report.funnel.fiveMinutes,report.previousFunnel.fiveMinutes],['5 minutes + applied sync',report.funnel.synced,report.previousFunnel.synced]] as [name,count,previous]}
              <div><div class="text-sm text-slate-400">{name}</div><div class="mt-2 text-2xl font-700">{number(Number(count))}</div><div class="mt-1 text-xs text-slate-400">{percent(Number(count),report.funnel.started)} of starts · {change(Number(count),Number(previous))}</div></div>
            {/each}
          </div>
          <p class="mb-0 mt-5 text-xs text-slate-400">Median time to a second participant: {report.funnel.medianTimeToJoinMs === null ? 'No joins recorded' : duration(report.funnel.medianTimeToJoinMs)}. Together means connected simultaneously. Applied sync confirms at least one remote change, not continuous watch quality. Older clients did not report outcomes.{report.funnel.uncertain ? ` ${report.funnel.uncertain} parties have uncertain membership; their durations are lower bounds.` : ''}</p>
        </div>
        <div class="jp-panel mt-6 min-w-0 overflow-hidden">
          <div class="flex items-center justify-between gap-3 px-5 py-5 sm:px-6"><h3 class="m-0 text-base font-650">Recent parties</h3><span class="text-xs text-slate-400">{number(report.totalParties)} matching starts</span></div>
          {#if report.parties.length}<div class="overflow-x-auto"><table aria-label="Recent parties" class="party-table w-full min-w-800px text-left text-sm">
            <thead><tr><th>Started (UTC)</th><th>Websites</th><th>Participations</th><th>Connected</th><th>Together</th><th>Status</th><th>Messages</th></tr></thead>
            <tbody>{#each report.parties as party (party.key)}<tr>
              <td class="whitespace-nowrap"><time datetime={new Date(party.startedAt).toISOString()}>{started(party.startedAt)}</time></td>
              <td class="max-w-64 break-words">{party.sites.map(s=>s === 'unknown' ? 'Unclassified' : s).join(', ')}</td>
              <td>{number(party.participants)}<span class="ml-2 text-xs text-slate-400">peak {party.peak}</span></td>
              <td class="whitespace-nowrap">{duration(party.durationMs)}</td><td class="whitespace-nowrap">{duration(party.togetherMs)}</td>
              <td class={party.status === 'uncertain' ? 'text-amber-200' : party.status === 'active' ? 'text-jelly-mint' : 'text-slate-400'} title={`Last evidence: ${started(party.observedAt)} UTC`}>{party.status === 'active' && now-party.observedAt > 150000 ? 'Refresh to confirm' : party.status}</td><td>{number(party.messages)}</td>
            </tr>{/each}</tbody>
          </table></div>{:else}<p class="m-0 px-6 pb-6 text-sm text-slate-400">No parties started in this period.</p>{/if}
          <div class="flex items-center justify-between gap-3 p-5 text-sm"><button class="period-button" disabled={loading || report.page === 0} onclick={()=>void loadHistory(report!.page-1,true)}>Previous page</button><span>Page {report.page+1}</span><button class="period-button" disabled={loading || !report.hasMoreParties} onclick={()=>void loadHistory(report!.page+1,true)}>Next page</button></div>
        </div>
        <p class="text-xs text-slate-400">Connected counts time with at least one participant; together requires two. Open intervals stop at the last evidence of presence. Party rows include lifetime activity, even when it falls outside the selected dates.</p>
        <div class="mt-6 grid gap-6 lg:grid-cols-2">
          <div class="jp-panel p-6"><h3 class="m-0 text-base font-650">Parties started by day</h3><div class="mt-5 max-h-72 overflow-y-auto space-y-3">{#each report.daily as entry}<div class="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-xs"><span class="text-slate-400">{entry.day}</span><div class="h-3 overflow-hidden rounded-full bg-white/5"><div class="h-full rounded-full bg-jelly-purple" style:width={`${entry.parties/maxDaily*100}%`}></div></div><span class="text-right">{number(entry.parties)}</span></div>{/each}</div></div>
          <div class="jp-panel p-6"><h3 class="m-0 text-base font-650">Peak party size</h3>{#if report.sizes.length}<div class="mt-5 space-y-3">{#each report.sizes as size}<div class="flex justify-between text-sm"><span>{size.peak} {size.peak === 1 ? 'person' : 'people'}</span><span>{number(size.parties)} parties</span></div>{/each}</div>{:else}<p class="text-sm text-slate-400">No parties recorded.</p>{/if}
            <h3 class="mb-3 mt-8 text-base font-650">Playback commands received</h3><div class="flex flex-wrap gap-5 text-sm">{#each ['play','pause','seek'] as kind}<span>{kind}: {number(total(kind as UsageEvent))}</span>{/each}</div><p class="mb-0 mt-3 text-xs text-slate-400">Commands are not proof that another player applied them.</p>
          </div>
        </div>
        <div class="jp-panel mt-6 overflow-hidden"><h3 class="m-0 p-6 text-base font-650">Playback results by website and client</h3>
          {#if syncGroups.length}<div class="overflow-x-auto"><table class="party-table w-full min-w-640px text-left text-sm" aria-label="Playback results"><thead><tr><th>Website</th><th>Browser / version</th><th>Attempts</th><th>Applied</th><th>Blocked</th><th>Failed / timed out</th></tr></thead><tbody>{#each syncGroups as group}<tr><td>{group.site}</td><td>{group.browser} / {group.version}</td><td>{group.attempts}</td><td>{group.applied} ({percent(group.applied,group.attempts)})</td><td>{group.blocked} ({percent(group.blocked,group.attempts)})</td><td>{group.failed} ({percent(group.failed,group.attempts)})</td></tr>{/each}</tbody></table></div>{:else}<p class="m-0 px-6 pb-6 text-sm text-slate-400">No playback results yet. This requires the updated extension.</p>{/if}
          <p class="px-6 text-xs text-slate-400">Results follow attempts in the selected dates, including later replies. A blocked attempt can later succeed, so outcome rates can overlap. Superseded commands appear in the detail below. Missing outcomes are not successes.</p>
        </div>
        <details class="jp-panel mt-6 p-6"><summary class="cursor-pointer font-650">Onboarding and playback outcome details</summary>{#if report.outcomes.length}<div class="mt-4 overflow-x-auto"><table class="party-table w-full min-w-640px text-left text-sm" aria-label="Outcome details"><thead><tr><th>Website</th><th>Browser / version</th><th>Outcome</th><th>Count</th></tr></thead><tbody>{#each report.outcomes as entry}<tr><td>{entry.site}</td><td>{entry.browser} / {entry.version}</td><td>{label(entry.outcome || entry.kind)}</td><td>{number(entry.count)}</td></tr>{/each}</tbody></table></div>{:else}<p class="text-sm text-slate-400">No outcomes recorded.</p>{/if}</details>
        <details class="jp-panel mt-6 p-6"><summary class="cursor-pointer font-650">Websites used</summary><div class="mt-4 overflow-x-auto"><table class="party-table w-full text-left text-sm" aria-label="Websites"><thead><tr><th>Website</th><th>Parties</th><th>Participations</th></tr></thead><tbody>{#each report.sites as entry}<tr><td>{entry.site}</td><td>{entry.parties}</td><td>{entry.participants}</td></tr>{/each}</tbody></table></div></details>
      </div>
    {:else if loading}<p class="text-slate-400">Loading history…</p>{/if}
  </section>
</div>
<style>
.period-button {border:1px solid transparent;border-radius:.5rem;background:transparent;color:#94a3b8;padding:.5rem .75rem;font:inherit;font-size:.875rem;cursor:pointer;}
.period-button:hover {background:#ffffff0a;color:#f1f5f9;}
.period-button.selected {background:#a78bfa1a;border-color:#a78bfa40;color:#c4b5fd;}
.period-button:focus-visible {outline:2px solid #a78bfa;outline-offset:2px;}
.period-button:disabled {opacity:.4;cursor:default;}
.party-table th {color:#94a3b8;font-size:.75rem;font-weight:500;padding:.75rem 1.5rem;background:#ffffff03;}
.party-table td {padding:1rem 1.5rem;border-top:1px solid #ffffff0a;}
.party-table tbody tr:hover {background:#ffffff03;}
select {color-scheme:dark;}
</style>

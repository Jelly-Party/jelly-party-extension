<script lang="ts">
import type { ChatEntry, PeerIdentity } from "jelly-party-lib";
import type { ActiveParty } from "../../../../jelly-party-extension/src/background/party-state.ts";
import PartyView from "../../../../jelly-party-extension/src/sidebar/PartyView.svelte";
import "../../../../jelly-party-extension/src/sidebar/sidebar-ui.css";

/** Keeps the sample chat readable at the same wall-clock time wherever the page is rendered. */
function atLocalTime(hour: number, minute: number): number {
	const time = new Date();
	time.setHours(hour, minute, 0, 0);
	return time.getTime();
}

const mira: PeerIdentity = { id: "mira", name: "Mira", emoji: "🍿" };
const cal: PeerIdentity = { id: "cal", name: "Cal", emoji: "🎬" };

const messages: ChatEntry[] = [
	{ id: 1, peer: cal, text: "Made it! Start from the beginning?", sentAt: atLocalTime(20, 11) },
	{ id: 2, peer: mira, text: "Press play whenever you're ready", sentAt: atLocalTime(20, 12) },
	{ id: 3, peer: cal, text: "Paused, kettle is on ☕", sentAt: atLocalTime(20, 14) },
];

const party: ActiveParty = {
	partyId: "friday-movie-night",
	tabId: 1,
	tabUrl: "https://example.com/watch",
	tabTitle: "Friday movie night",
	selfId: mira.id,
	leaderId: mira.id,
	destinationRevision: 1,
	status: "connected",
	peers: [mira, cal],
	messages,
	hasMoreHistory: false,
	atDestination: true,
	hasVideo: true,
	accessRequired: false,
	playbackBlocked: false,
	notice: "",
	activity: null,
};
</script>

<figure class="m-0 w-full">
	<div class="rotate-1 rounded-[2rem] border border-white/25 bg-jelly-ink p-3 shadow-2xl shadow-jelly-ink/30">
		<div class="flex items-center gap-2 px-3 pb-3 pt-1" aria-hidden="true">
			<span class="h-2.5 w-2.5 rounded-full bg-jelly-coral"></span>
			<span class="h-2.5 w-2.5 rounded-full bg-[#ffd36c]"></span>
			<span class="h-2.5 w-2.5 rounded-full bg-jelly-mint"></span>
			<span class="ml-2 h-2 flex-1 rounded-full bg-white/8"></span>
		</div>

		<div class="grid h-100 grid-cols-[minmax(0,20.5rem)] justify-center overflow-hidden rounded-[1.35rem] bg-[#070914] sm:grid-cols-[minmax(0,1fr)_20.5rem]">
			<div class="relative hidden overflow-hidden bg-gradient-to-br from-[#232944] to-[#0e1020] sm:block" aria-hidden="true">
				<div class="absolute inset-0 grid place-items-center">
					<img class="jp-logo h-32 w-32 opacity-90" src="/jelly-party.svg" alt="" width="128" height="128" />
				</div>
				<div class="absolute inset-x-5 bottom-5">
					<div class="h-1 rounded-full bg-white/15"><div class="h-full w-3/5 rounded-full bg-jelly-pink"></div></div>
					<div class="mt-3 flex items-center gap-2 text-[0.65rem] font-700 text-white/70"><span class="text-sm text-white">▶</span> 28:14 <span class="ml-auto">52:03</span></div>
				</div>
			</div>

			<!-- The extension's own sidebar, filled with a sample party. It is a picture of the
			     product, so nothing inside it is interactive here. -->
			<div class="sidebar-root party-active border-l border-white/8 bg-jelly-ink text-left" inert>
				<PartyView {party} identity={mira} />
			</div>
		</div>
	</div>
	<figcaption class="sr-only">
		The Jelly Party sidebar open beside a video, showing Mira and Cal watching together and chatting.
	</figcaption>
</figure>

<script lang="ts">
import BrandHeader from "../../../../jelly-party-extension/src/sidebar/BrandHeader.svelte";
import PartyView from "../../../../jelly-party-extension/src/sidebar/PartyView.svelte";
import SetupView from "../../../../jelly-party-extension/src/sidebar/SetupView.svelte";
import LucideIcon from "#lib/components/LucideIcon.svelte";
import PartyWindow from "#lib/components/PartyWindow.svelte";
import PressFrame from "#lib/components/PressFrame.svelte";
import ServiceLogos from "#lib/components/ServiceLogos.svelte";
import VideoStage from "#lib/components/VideoStage.svelte";
import { features } from "#lib/features.ts";
import {
	duoParty,
	duoPartyShort,
	groupParty,
	groupPartyShort,
	inviteLink,
	mira,
	partyVideo,
} from "#lib/press/fixtures.ts";
import { pressShot } from "#lib/press/shots.ts";

const video = {
	videoSrc: partyVideo.src,
	posterTime: partyVideo.posterTime,
	elapsed: partyVideo.elapsed,
	duration: partyVideo.duration,
	progress: partyVideo.progress,
};

// SetupView writes the chosen name and emoji back into this object; the shot never touches it.
const setupIdentity = { ...mira };
</script>

<svelte:head>
	<title>Jelly Party store assets</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-screen bg-[#05060f] px-10 py-12 text-slate-100">
	<header class="max-w-3xl">
		<p class="jp-kicker m-0">Store assets</p>
		<h1 class="mb-0 mt-3 text-4xl leading-tight font-800 tracking-[-0.02em]">Listing images, rendered from the extension</h1>
		<p class="mb-0 mt-4 leading-7 text-slate-400">
			Every frame below is built from the components Jelly Party ships, at the exact size each store
			expects. Run <code class="text-jelly-mint">vp run assets:store</code> to capture them into
			<code class="text-jelly-mint">artifacts/press/</code> at twice that size.
		</p>
	</header>

	<div class="mt-12 flex flex-col gap-16">
		<PressFrame shot={pressShot("01-watch-together")}>
			<div class="flex h-full flex-col bg-gradient-to-br from-jelly-coral via-[#f778b9] to-jelly-pink px-14 pb-12 pt-11 text-white">
				<div class="pointer-events-none absolute -right-24 -top-28 h-100 w-100 rounded-full bg-white/12 blur-3xl" aria-hidden="true"></div>
				<div class="relative shrink-0">
					<p class="m-0 text-sm font-800 tracking-[0.2em] text-white/80 uppercase">Watch parties made simple</p>
					<h2 class="m-0 mt-3 text-[3.5rem] leading-[1.02] font-850 tracking-[-0.035em]">Watch anything. Together.</h2>
					<p class="m-0 mt-4 max-w-3xl text-xl leading-7 font-650 text-white/90">
						Jelly Party keeps everyone's video at the same moment, right beside the chat.
					</p>
				</div>
				<div class="relative mt-8 min-h-0 flex-1">
					<PartyWindow title={partyVideo.title} url={partyVideo.url} {...video}>
						{#snippet sidebar()}
							<PartyView party={duoParty} identity={mira} {inviteLink} />
						{/snippet}
					</PartyWindow>
				</div>
			</div>
		</PressFrame>

		<PressFrame shot={pressShot("02-start-a-party")}>
			<div class="flex h-full flex-col bg-jelly-ink px-14 pb-8 pt-8">
				<div class="pointer-events-none absolute -left-32 -top-40 h-120 w-120 rounded-full bg-jelly-purple/25 blur-3xl" aria-hidden="true"></div>
				<div class="relative shrink-0">
					<p class="jp-kicker m-0">Getting started</p>
					<h2 class="m-0 mt-2 text-[2.4rem] leading-tight font-800 tracking-[-0.025em] text-white">Open the sidebar, start the party</h2>
					<p class="m-0 mt-2 max-w-4xl text-base leading-6 text-slate-300">
						Pick a name and an emoji beside any video you can already watch, then share the invite link.
					</p>
				</div>
				<div class="relative mt-5 min-h-0 flex-1">
					<PartyWindow title={partyVideo.title} url={partyVideo.url} {...video} sidebarActive={false}>
						{#snippet sidebar()}
							<BrandHeader logoSrc="/jelly-party.svg" />
							<SetupView identity={setupIdentity} tabTitle={partyVideo.title} hasVideo />
						{/snippet}
					</PartyWindow>
				</div>
			</div>
		</PressFrame>

		<PressFrame shot={pressShot("03-chat-beside-the-video")}>
			<div class="flex h-full flex-col bg-jelly-ink px-14 pb-11 pt-11">
				<div class="pointer-events-none absolute -right-32 -top-40 h-120 w-120 rounded-full bg-jelly-pink/20 blur-3xl" aria-hidden="true"></div>
				<div class="relative shrink-0">
					<p class="jp-kicker m-0">Party chat</p>
					<h2 class="m-0 mt-3 text-[2.75rem] leading-tight font-800 tracking-[-0.025em] text-white">Talk without leaving the video</h2>
					<p class="m-0 mt-3 max-w-3xl text-lg leading-7 text-slate-300">
						See who joined and chat in the browser's own sidebar. The page you are watching is left alone.
					</p>
				</div>
				<div class="relative mt-7 min-h-0 flex-1">
					<PartyWindow title={partyVideo.title} url={partyVideo.url} {...video} sidebarWidth={400}>
						{#snippet sidebar()}
							<PartyView
								party={groupParty}
								identity={mira}
								{inviteLink}
								message="Rewind ten seconds, I missed it 😄"
							/>
						{/snippet}
					</PartyWindow>
				</div>
			</div>
		</PressFrame>

		<PressFrame shot={pressShot("04-everyone-in-sync")}>
			<div class="flex h-full flex-col bg-jelly-ink px-14 pb-11 pt-11">
				<div class="pointer-events-none absolute -left-28 top-1/3 h-120 w-120 rounded-full bg-jelly-purple/20 blur-3xl" aria-hidden="true"></div>
				<div class="relative shrink-0">
					<p class="jp-kicker m-0">Always the same moment</p>
					<h2 class="m-0 mt-3 text-[2.75rem] leading-tight font-800 tracking-[-0.025em] text-white">One play button for everyone</h2>
					<p class="m-0 mt-3 max-w-3xl text-lg leading-7 text-slate-300">
						Play, pause and seek travel to every screen in the party — nobody counts down from three.
					</p>
				</div>

				<div class="relative mt-7 flex min-h-0 flex-1 gap-7">
					<div class="h-[500px] w-[812px] shrink-0">
						<PartyWindow title={partyVideo.title} url={partyVideo.url} {...video} sidebarWidth={360}>
							{#snippet sidebar()}
								<PartyView party={groupPartyShort} identity={mira} {inviteLink} />
							{/snippet}
						</PartyWindow>
					</div>

					<div class="flex min-w-0 flex-1 flex-col justify-center gap-4">
						{#each ["Cal's screen", "Ada's screen"] as screen (screen)}
							<div class="overflow-hidden rounded-xl border border-white/12 bg-[#0b0e1c] shadow-xl shadow-black/50">
								<div class="flex items-center gap-2 border-b border-white/8 bg-[#151a2e] px-3 py-2">
									<span class="h-1.5 w-1.5 rounded-full bg-jelly-coral"></span>
									<span class="h-1.5 w-1.5 rounded-full bg-[#ffd36c]"></span>
									<span class="h-1.5 w-1.5 rounded-full bg-jelly-mint"></span>
									<span class="ml-1 truncate text-[0.7rem] font-650 text-slate-400">{screen}</span>
								</div>
								<div class="flex h-[175px]">
									<VideoStage src={partyVideo.src} posterTime={partyVideo.posterTime} elapsed={partyVideo.elapsed} duration={partyVideo.duration} progress={partyVideo.progress} compact />
								</div>
							</div>
						{/each}

						<p class="m-0 flex items-center justify-center gap-2 rounded-full border border-jelly-mint/35 bg-jelly-mint/8 px-4 py-2.5 text-center text-sm font-750 text-jelly-mint">
							<svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 7 3 11l4 4v-3h10v3l4-4-4-4v3H7V7Z" /></svg>
							Same second, every screen
						</p>
					</div>
				</div>
			</div>
		</PressFrame>

		<PressFrame shot={pressShot("05-works-where-you-watch")}>
			<div class="flex h-full flex-col bg-jelly-ink px-14 pb-11 pt-11">
				<div class="pointer-events-none absolute -right-24 -bottom-32 h-120 w-120 rounded-full bg-jelly-coral/20 blur-3xl" aria-hidden="true"></div>
				<div class="relative shrink-0">
					<p class="jp-kicker m-0">Works where you already watch</p>
					<h2 class="m-0 mt-3 text-[2.75rem] leading-tight font-800 tracking-[-0.025em] text-white">Your streaming sites, your videos</h2>
					<p class="m-0 mt-3 max-w-3xl text-lg leading-7 text-slate-300">
						Jelly Party syncs the video already playing in your tab, so it reaches far beyond the sites below.
					</p>
				</div>

				<div class="relative mt-8 flex shrink-0 flex-col gap-6 rounded-2xl border border-white/10 bg-jelly-panel px-9 py-8">
					<ServiceLogos height={2.6} />
					<p class="m-0 text-base text-slate-400">…and any other page with a video you can already watch.</p>
				</div>

				<div class="relative mt-7 grid flex-1 grid-cols-3 gap-5">
					{#each features as feature (feature.title)}
						<article class="flex flex-col rounded-2xl border border-white/10 bg-jelly-panel p-7">
							<div class="grid h-12 w-12 place-items-center rounded-xl bg-jelly-purple/20 text-jelly-mint" aria-hidden="true">
								<LucideIcon iconNode={feature.icon} size={24} />
							</div>
							<h3 class="mb-0 mt-5 text-xl leading-7 font-750 text-white">{feature.title}</h3>
							<p class="mb-0 mt-2 text-base leading-7 text-slate-400">{feature.short}</p>
						</article>
					{/each}
				</div>

				<p class="relative m-0 mt-7 shrink-0 text-lg font-700 text-white/75">Chrome, Edge and Firefox · Free and open source</p>
			</div>
		</PressFrame>

		<PressFrame shot={pressShot("promo-small-tile")}>
			<div class="grid h-full place-items-center bg-jelly-ink text-center text-white">
				<div class="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-jelly-pink/35 blur-3xl" aria-hidden="true"></div>
				<div class="pointer-events-none absolute -right-16 -bottom-24 h-64 w-64 rounded-full bg-jelly-purple/35 blur-3xl" aria-hidden="true"></div>
				<div class="relative">
					<img class="jp-logo mx-auto h-16 w-16" src="/jelly-party.svg" alt="" width="128" height="128" />
					<p class="m-0 mt-4 text-[2rem] leading-none font-850 tracking-[-0.03em]">Jelly Party</p>
					<p class="m-0 mt-3 text-sm font-700 text-slate-300">Watch videos with your friends — in sync</p>
				</div>
			</div>
		</PressFrame>

		<PressFrame shot={pressShot("promo-marquee")}>
			<div class="flex h-full items-center gap-10 overflow-hidden bg-gradient-to-br from-jelly-coral via-[#f778b9] to-jelly-pink pl-16 text-white">
				<div class="pointer-events-none absolute -left-24 -bottom-32 h-100 w-100 rounded-full bg-white/12 blur-3xl" aria-hidden="true"></div>
				<div class="relative w-[560px] shrink-0">
					<p class="m-0 text-sm font-800 tracking-[0.2em] text-white/80 uppercase">Watch parties made simple</p>
					<h2 class="m-0 mt-3 text-[3.25rem] leading-[1.03] font-850 tracking-[-0.035em]">Watch anything. Together.</h2>
					<p class="m-0 mt-4 text-lg leading-7 font-650 text-white/90">
						Start a party beside any video, share one link, and stay at the same moment.
					</p>
					<p class="m-0 mt-6 text-sm font-750 text-white/80">Chrome · Edge · Firefox</p>
				</div>
				<div class="relative h-[420px] w-[700px] shrink-0 rotate-1">
					<PartyWindow title={partyVideo.title} url={partyVideo.url} {...video}>
						{#snippet sidebar()}
							<PartyView party={duoPartyShort} identity={mira} {inviteLink} />
						{/snippet}
					</PartyWindow>
				</div>
			</div>
		</PressFrame>

		<PressFrame shot={pressShot("store-logo")}>
			<div class="grid h-full place-items-center bg-jelly-ink">
				<div class="pointer-events-none absolute -left-10 -top-12 h-52 w-52 rounded-full bg-jelly-pink/35 blur-3xl" aria-hidden="true"></div>
				<div class="pointer-events-none absolute -right-10 -bottom-12 h-52 w-52 rounded-full bg-jelly-purple/35 blur-3xl" aria-hidden="true"></div>
				<img class="jp-logo relative h-44 w-44" src="/jelly-party.svg" alt="Jelly Party" width="128" height="128" />
			</div>
		</PressFrame>
	</div>
</div>

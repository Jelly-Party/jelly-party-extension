<script lang="ts">
import { getDownloadLink } from "#lib/download-link.ts";
import PartyPreview from "./PartyPreview.svelte";
import ServiceLogos from "./ServiceLogos.svelte";
</script>

<section class="relative overflow-hidden bg-gradient-to-br from-jelly-coral via-[#f778b9] to-jelly-pink pb-16 pt-16 text-white sm:pb-20 sm:pt-20">
	<div class="pointer-events-none absolute -right-24 top-8 h-88 w-88 rounded-full bg-white/10 blur-3xl" aria-hidden="true"></div>
	<div class="jp-container relative grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
		<div class="text-center lg:text-left">
			<p class="m-0 text-sm font-800 tracking-[0.2em] text-white/75 uppercase">Watch parties made simple</p>
			<h1 class="mb-0 mt-4 text-5xl leading-[0.98] font-850 tracking-[-0.035em] sm:text-7xl lg:text-8xl">Watch anything.<br />Together.</h1>
			<p class="mx-auto mb-0 mt-6 max-w-2xl text-xl leading-8 font-650 text-white lg:mx-0 sm:text-2xl">
				One person leads. Everyone follows to the next video and stays in sync.
			</p>
			<p class="mx-auto mb-0 mt-3 max-w-xl text-base leading-7 text-white/82 lg:mx-0 sm:text-lg">
				Open the sidebar beside any video and share one private, unguessable link. No sign-up, no room codes.
			</p>

			<div class="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row lg:justify-start">
				<a href={getDownloadLink()} class="jp-button bg-jelly-ink px-7 text-white shadow-lg shadow-jelly-ink/20 hover:bg-[#171b32]">Get Jelly Party</a>
				<a href="#live-demo" class="jp-button border border-white/50 bg-white/8 px-7 text-white hover:bg-white/16">See it stay in sync</a>
			</div>
			<p class="mb-0 mt-5 text-sm font-650 text-white/72">Chrome, Firefox, and Edge · Free and open source</p>
		</div>

		<div class="mx-auto w-full max-w-2xl">
			<PartyPreview />
		</div>
	</div>

	<div class="jp-container relative mt-14 flex flex-col items-center gap-x-7 gap-y-4 border-t border-white/20 pt-8 sm:mt-16 lg:flex-row">
		<p class="m-0 shrink-0 text-base font-800 text-white/85">Works on</p>
		<ServiceLogos ids={["netflix", "prime-video", "youtube", "disney-plus", "vimeo", "jellyfin"]} height={1.9} />
		<a class="shrink-0 text-base font-800 text-white no-underline underline-offset-4 hover:underline" href="/supported-services">and many more!</a>
	</div>
</section>

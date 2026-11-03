<script lang="ts">
import ServiceLogos from "#lib/components/ServiceLogos.svelte";
</script>

<svelte:head>
	<title>Where Jelly Party works - Jelly Party</title>
	<meta name="description" content="Jelly Party works with the video players on most streaming sites, as long as everyone can already watch the video themselves." />
</svelte:head>

<section class="min-h-[calc(100svh-4.5rem)] bg-jelly-ink pb-20 pt-16">
	<div class="jp-container max-w-3xl">
		<p class="jp-kicker m-0">Where it works</p>
		<h1 class="mb-0 mt-3 text-4xl leading-tight font-800 tracking-normal text-white sm:text-5xl">Works on the sites you already watch</h1>
		<p class="mb-0 mt-5 text-lg leading-8 text-slate-300">Jelly Party attaches to the video player on the page you are on. That covers most streaming sites, including these.</p>

		<div class="mt-8 rounded-2xl border border-white/10 bg-jelly-panel p-6 sm:p-8">
			<ServiceLogos height={1.9} />
			<p class="mb-0 mt-6 text-sm leading-6 text-slate-400">…and many more. Names and logos belong to their owners; Jelly Party is not affiliated with them.</p>
		</div>

		<div class="mt-12 space-y-10">
			<section>
				<h2 class="m-0 text-xl font-750 text-white">Everyone brings their own access</h2>
				<p class="mb-0 mt-3 leading-7 text-slate-400">Jelly Party only presses play, pause, and jumps to the same moment for everybody. It never streams the video itself, and it does not get around subscriptions, paywalls, copy protection, or a site's own rules. Each person needs their own way to watch.</p>
			</section>

			<section>
				<h2 class="m-0 text-xl font-750 text-white">Some pages simply will not play along</h2>
				<p class="mb-0 mt-3 leading-7 text-slate-400">A site can change its player at any time, and a few players hide the video from extensions entirely. When that happens Jelly Party tells you it cannot find a video on the page instead of pretending to be in sync.</p>
			</section>

			<section class="jp-panel p-6">
				<h2 class="m-0 text-xl font-750 text-white">Found a page that does not work?</h2>
				<p class="mb-0 mt-3 leading-7 text-slate-400">Tell us which page and browser you used. Real reports help us decide where site-specific work is worthwhile.</p>
				<a href="mailto:hi@jelly-party.com" class="jp-link mt-5 inline-block">hi@jelly-party.com</a>
			</section>
		</div>
	</div>
</section>

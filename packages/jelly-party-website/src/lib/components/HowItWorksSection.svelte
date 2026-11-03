<script lang="ts">
import { getDownloadLink } from "#lib/download-link.ts";

const steps = [
	{
		number: "01",
		title: "Open the sidebar",
		description: "Go to a page with a video and open Jelly Party from the browser toolbar.",
	},
	{
		number: "02",
		title: "Start a party",
		description: "Choose a display name and emoji, then create a temporary party for that video.",
	},
	{
		number: "03",
		title: "Lead the way",
		description: "Share the private link. Friends follow when you change videos, or you can hand over the lead.",
	},
];
</script>

<section id="how-it-works" class="bg-jelly-coral py-20 text-jelly-ink sm:py-24">
	<div class="jp-container">
		<p class="m-0 text-xs font-850 tracking-widest uppercase">Three steps</p>
		<h2 class="mb-0 mt-3 max-w-2xl text-3xl leading-tight font-850 tracking-[-0.02em] sm:text-5xl">From video to party in one link</h2>

		<ol class="m-0 mt-12 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-8">
			{#each steps as step}
				<li class="border-t-2 border-jelly-ink/25 pt-5">
					<span class="text-sm font-850">{step.number}</span>
					<h3 class="mb-0 mt-5 text-xl font-800 tracking-normal">{step.title}</h3>
					<p class="mb-0 mt-2 leading-7 text-jelly-ink/75">{step.description}</p>
				</li>
			{/each}
		</ol>

		<div class="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
			<a href={getDownloadLink()} class="jp-button bg-jelly-ink px-7 text-white hover:bg-[#171b32]">Get Jelly Party</a>
			<p class="m-0 text-sm font-650 text-jelly-ink/65">Each person uses their own access to the video service.</p>
		</div>
	</div>
</section>

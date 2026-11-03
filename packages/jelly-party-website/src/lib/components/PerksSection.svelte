<script lang="ts">
import { features } from "#lib/features.ts";
import LucideIcon from "./LucideIcon.svelte";
</script>

<section id="features" class="bg-jelly-ink py-18 sm:py-24">
	<div class="jp-container">
		<div class="max-w-3xl">
			<p class="jp-kicker m-0">Just the useful parts</p>
			<h2 class="mb-0 mt-3 text-3xl leading-tight font-800 tracking-[-0.02em] text-white sm:text-5xl">A watch party without the ceremony</h2>
		</div>

		<div class="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-3">
			{#each features as feature}
				<article class="bg-jelly-panel p-6 sm:p-8">
					<div class="grid h-11 w-11 place-items-center rounded-xl bg-jelly-purple/20 text-jelly-mint" aria-hidden="true">
						<LucideIcon iconNode={feature.icon} size={22} />
					</div>
					<h3 class="mb-0 mt-5 text-xl font-750 tracking-normal text-white">{feature.title}</h3>
					<p class="mb-0 mt-2 leading-7 text-slate-400">{feature.description}</p>
				</article>
			{/each}
		</div>
	</div>
</section>

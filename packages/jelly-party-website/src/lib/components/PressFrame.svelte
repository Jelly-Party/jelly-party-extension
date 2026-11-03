<script lang="ts">
import type { Snippet } from "svelte";
import type { PressShot } from "#lib/press/shots.ts";

interface Props {
	shot: PressShot;
	children: Snippet;
}

let { shot, children }: Props = $props();
</script>

<figure class="m-0 flex flex-col gap-3">
	<figcaption class="flex flex-wrap items-baseline gap-x-3 text-sm text-slate-400">
		<code class="text-jelly-mint">{shot.slug}.png</code>
		<span class="tabular-nums">{shot.width}×{shot.height}</span>
		<span>{shot.usage}</span>
	</figcaption>
	<!-- The capture script screenshots exactly this element, so its box is the delivered image. -->
	<div
		class="relative overflow-hidden"
		data-press-shot={shot.slug}
		style="width: {shot.width}px; height: {shot.height}px"
	>
		{@render children()}
	</div>
</figure>

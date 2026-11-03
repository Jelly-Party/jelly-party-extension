<script lang="ts">
import { serviceLogos, type ServiceLogo } from "#lib/service-logos.ts";

/** Which services to show, in order. Defaults to the full list. */
export let ids: string[] = serviceLogos.map((logo) => logo.id);
/** Logo height in rem, so every mark lines up optically. */
export let height = 1.75;
/** Colour of the marks, matching whatever section they sit in. */
export let tone: "light" | "dark" = "light";

$: logos = ids
	.map((id) => serviceLogos.find((logo) => logo.id === id))
	.filter((logo): logo is ServiceLogo => Boolean(logo));
</script>

<ul
	class="m-0 flex list-none flex-wrap items-center gap-x-7 gap-y-5 p-0 {tone === 'light' ? 'text-white/85' : 'text-jelly-ink/80'}"
>
	{#each logos as logo (logo.id)}
		<li class="flex items-center">
			<svg
				viewBox={logo.viewBox}
				role="img"
				aria-label={logo.name}
				style="height: {height}rem; width: {height * logo.ratio}rem"
				fill="currentColor"
			>
				<!-- Local, static logo artwork from src/lib/service-logos.ts. -->
				{@html logo.body}
			</svg>
		</li>
	{/each}
</ul>

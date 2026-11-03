<script lang="ts">
import type { Snippet } from "svelte";
import "../../../../jelly-party-extension/src/sidebar/sidebar-ui.css";
import VideoStage from "./VideoStage.svelte";

interface Props {
	/** Page title shown in the browser tab. */
	title: string;
	/** Address shown in the location bar. */
	url: string;
	/** Video file served by this site, so the shots never depend on a streaming service. */
	videoSrc: string;
	/** The frame the window is parked on. Every window using the same time shows the same picture. */
	posterTime: number;
	elapsed: string;
	duration: string;
	progress: number;
	/** Sidebar width in pixels, matching the panel width browsers give the extension. */
	sidebarWidth?: number;
	/** The sidebar fills its height during a party and scrolls its own content before one starts. */
	sidebarActive?: boolean;
	/** Contents of the sidebar: the extension's own components. */
	sidebar: Snippet;
}

let {
	title,
	url,
	videoSrc,
	posterTime,
	elapsed,
	duration,
	progress,
	sidebarWidth = 328,
	sidebarActive = true,
	sidebar,
}: Props = $props();
</script>

<div class="flex h-full flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0b0e1c] shadow-2xl shadow-black/50">
	<div class="shrink-0 border-b border-white/8 bg-[#151a2e] px-4 pb-2 pt-3">
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-1.5" aria-hidden="true">
				<span class="h-2.5 w-2.5 rounded-full bg-jelly-coral"></span>
				<span class="h-2.5 w-2.5 rounded-full bg-[#ffd36c]"></span>
				<span class="h-2.5 w-2.5 rounded-full bg-jelly-mint"></span>
			</div>
			<div class="flex min-w-0 max-w-72 items-center gap-2 rounded-t-lg bg-[#0b0e1c] px-3 py-2">
				<img class="jp-logo h-4 w-4" src="/jelly-party.svg" alt="" width="128" height="128" />
				<span class="truncate text-xs font-650 text-slate-300">{title}</span>
			</div>
		</div>
		<div class="mt-2 flex items-center gap-3">
			<div class="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#0b0e1c] px-3 py-1.5">
				<svg class="h-3 w-3 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z" /></svg>
				<span class="truncate text-xs text-slate-400">{url}</span>
			</div>
			<!-- The toolbar button people click to open the sidebar. -->
			<span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-jelly-purple/25 ring-1 ring-jelly-purple/60" aria-hidden="true">
				<img class="jp-logo h-4.5 w-4.5" src="/jelly-party.svg" alt="" width="128" height="128" />
			</span>
		</div>
	</div>

	<div class="flex min-h-0 flex-1 items-stretch bg-[#070914]">
		<VideoStage src={videoSrc} {posterTime} {elapsed} {duration} {progress} />

		<!-- The extension's real sidebar. It is a picture of the product, so nothing here is interactive. -->
		<div
			class="sidebar-root shrink-0 border-l border-white/8 bg-jelly-ink text-left"
			class:party-active={sidebarActive}
			style="width: {sidebarWidth}px"
			inert
		>
			{@render sidebar()}
		</div>
	</div>
</div>

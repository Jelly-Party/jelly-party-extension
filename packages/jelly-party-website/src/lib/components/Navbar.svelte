<script lang="ts">
import { getDownloadLink } from "#lib/download-link.ts";
</script>

<nav class="sticky top-0 z-50 border-b border-white/10 bg-jelly-ink/92 backdrop-blur-lg" aria-label="Primary navigation">
	<div class="jp-container h-18 flex items-center justify-between gap-4">
		<a href="/" class="jp-brand">
			<img class="jp-logo h-10 w-10" src="/jelly-party.svg" alt="" width="128" height="128" />
			<span class="text-lg font-800 tracking-normal">Jelly Party</span>
		</a>

		<div class="flex items-center gap-2 sm:gap-4">
			<a href="/#how-it-works" class="hidden text-sm font-650 text-slate-300 no-underline hover:text-white sm:inline">How it works</a>
			<a href={getDownloadLink()} class="jp-button-primary min-h-10 px-4 py-2 text-sm">
				<span class="sm:hidden">Install</span>
				<span class="hidden sm:inline">Get the extension</span>
			</a>
		</div>
	</div>
</nav>

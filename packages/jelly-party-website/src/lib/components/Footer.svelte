<script lang="ts">
import { getDownloadLink } from "$lib/download-link";

const currentYear = new Date().getFullYear();
</script>

<footer class="border-t border-white/10 bg-jelly-ink py-12 text-slate-300">
	<div class="jp-container flex flex-col gap-10">
		<div class="flex flex-col justify-between gap-8 md:flex-row md:items-start">
			<div class="max-w-sm">
				<a href="/" class="jp-brand">
					<img class="jp-logo h-11 w-11" src="/jelly-party.svg" alt="" width="128" height="128" />
					<span class="text-xl font-800">Jelly Party</span>
				</a>
				<p class="mb-0 mt-4 text-sm leading-6 text-slate-400">Temporary watch parties with chat, keeping everyone's video at the same moment. No accounts, ads, or tracking.</p>
			</div>

			<nav class="grid grid-cols-2 gap-x-10 gap-y-3 text-sm" aria-label="Footer navigation">
				<a class="text-slate-300 no-underline hover:text-white" href={getDownloadLink()}>Install</a>
				<a class="text-slate-300 no-underline hover:text-white" href="/supported-services">Where it works</a>
				<a class="text-slate-300 no-underline hover:text-white" href="/privacy-policy">Privacy</a>
				<a class="text-slate-300 no-underline hover:text-white" href={__JELLY_REPOSITORY_URL__} target="_blank" rel="noopener noreferrer">GitHub</a>
				<a class="text-slate-300 no-underline hover:text-white" href="mailto:hi@jelly-party.com">Email us</a>
				<a class="text-slate-300 no-underline hover:text-white" href="https://discord.gg/39uHVwHSKM" target="_blank" rel="noopener noreferrer">Discord</a>
			</nav>
		</div>

		<p class="m-0 border-t border-white/8 pt-6 text-xs text-slate-500">© {currentYear} Jelly Party. Free and open source.</p>
	</div>
</footer>

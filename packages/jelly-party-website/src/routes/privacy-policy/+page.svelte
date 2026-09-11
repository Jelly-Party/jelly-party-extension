<svelte:head>
	<title>Privacy policy - Jelly Party</title>
	<meta name="description" content="How Jelly Party handles extension and website data." />
</svelte:head>

<article class="min-h-[calc(100svh-4.5rem)] bg-jelly-ink pb-20 pt-16">
	<div class="jp-container max-w-3xl">
		<p class="jp-kicker m-0">Privacy</p>
		<h1 class="mb-0 mt-3 text-4xl leading-tight font-800 tracking-normal text-white sm:text-5xl">No account. Your party chat stays available.</h1>
		<p class="mb-0 mt-5 text-lg leading-8 text-slate-300">Jelly Party does not sell personal data, serve advertising, or track you across websites.</p>

		<div class="mt-12 space-y-10 text-slate-400">
			<section>
				<h2 class="m-0 text-xl font-750 text-white">Data used during a party</h2>
				<p class="mb-0 mt-3 leading-7">While connected, the relay processes the party identifier, your display name and emoji, chat messages, the shared video URL, and play, pause, and seek timing. This is necessary to connect peers and synchronize their browsers.</p>
				<p class="mb-0 mt-3 leading-7">Party membership is temporary. Up to the latest 1,000 conversation entries are stored in the party's Cloudflare Durable Object so anyone with the party link can read them. These entries include chat messages with their display name and emoji, plus system entries recording who selected a video and that video's title and URL. We delete all stored party data 30 days after its final peer disconnects; rejoining before then restarts that countdown. Infrastructure providers may process ordinary connection metadata and short-lived operational logs needed to run and secure the service.</p>
			</section>

			<section>
				<h2 class="m-0 text-xl font-750 text-white">Usage statistics</h2>
                <p class="mb-0 mt-3 leading-7">The relay records party and participation counts, chat-message counts, playback-action counts, and the domain of the shared video site. Usage records exclude full video URLs, chat contents, names, emoji, IP addresses, and invitation identifiers. A separate random party identifier groups usage within a party; it cannot be used to join. Usage statistics are kept separately from party chat history. Our private dashboard also shows reported connected-party counts.</p>
            </section>
            <section>
                <h2 class="m-0 text-xl font-750 text-white">Data stored in your browser</h2>
				<p class="mb-0 mt-3 leading-7">The extension stores your generated peer identifier, display name, and emoji locally. A pending invitation may also be stored briefly while its video tab opens. You can remove this data by uninstalling the extension or clearing its storage.</p>
			</section>

			<section>
				<h2 class="m-0 text-xl font-750 text-white">Website and permissions</h2>
				<p class="mb-0 mt-3 leading-7">The website and invitation page do not load advertising or analytics code. The extension requests access to a video site only when needed to find and control its HTML video. It does not send page contents or browsing history to Jelly Party.</p>
			</section>

			<section class="border-t border-white/10 pt-8">
				<p class="m-0 leading-7">Questions: <a href="mailto:hi@jelly-party.com" class="jp-link">hi@jelly-party.com</a></p>
				<p class="mb-0 mt-3 text-sm text-slate-500">Effective 11 September 2026.</p>
			</section>
		</div>
	</div>
</article>

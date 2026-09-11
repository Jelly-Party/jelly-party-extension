<script lang="ts">
import "virtual:uno.css";
import "../app.css";
import { page } from "$app/state";
import Footer from "$lib/components/Footer.svelte";
import Navbar from "$lib/components/Navbar.svelte";

let { children } = $props();
// /join is a landing page for invites and /press is a capture surface for store assets: neither
// wants the site chrome around it.
let standalone = $derived(page.url.pathname === "/join" || page.url.pathname === "/press" || page.url.pathname.startsWith("/admin"));
</script>

<svelte:head>
	<title>Jelly Party - Watch anything together</title>
</svelte:head>

{#if standalone}
	<main>{@render children()}</main>
{:else}
	<Navbar />
	<main>{@render children()}</main>
	<Footer />
{/if}

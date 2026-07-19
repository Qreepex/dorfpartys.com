<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types.js';
	import './layout.css';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Navbar user={data.user} country={data.country} />

<main class="mx-auto max-w-240 px-5 py-10">
	{@render children()}
</main>

<Footer />

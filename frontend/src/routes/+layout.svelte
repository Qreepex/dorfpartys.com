<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import Footer from '$lib/components/Footer.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import { initializeStores } from '$lib/stores.js';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types.js';
	import './layout.css';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	$effect.pre(() => {
		initializeStores(data.user, data.notifications);
	});

	function loadSimpleAnalytics() {
		document
			.querySelectorAll('script[src*="services.dorfpartys.com"]')
			.forEach((el) => el.remove());

		const script = document.createElement('script');
		script.async = true;
		script.src = 'https://services.dorfpartys.com/latest.js';
		document.head.appendChild(script);
	}

	afterNavigate(() => {
		loadSimpleAnalytics();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<noscript>
		<img
			src="https://services.dorfpartys.com/noscript.gif"
			alt=""
			referrerpolicy="no-referrer-when-downgrade"
		/>
	</noscript>
</svelte:head>

<Navbar />

<div class="min-h-[70vh] px-5 py-10">
	{@render children()}
</div>

<Footer />

<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types.js';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<nav>
	<a href="/">dorfpartys.com</a>
	{#if data.user}
		<a href="/submit">Event einreichen</a>
		<a href="/profil">Mein Profil</a>
		{#if data.user.role === 'moderator' || data.user.role === 'admin'}
			<a href="/review">Review</a>
		{/if}
		<a href="/auth/logout">Logout</a>
	{:else}
		<a href="/auth/login">Login</a>
	{/if}
</nav>

{@render children()}

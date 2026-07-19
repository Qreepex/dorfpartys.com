<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { COUNTRIES, type Country, type User } from '@dorfpartys/shared';

	interface Props {
		user?: Pick<User, 'role'> | null;
		country?: Country;
	}

	let { user = null, country = 'de' }: Props = $props();

	const COUNTRY_LABELS: Record<Country, string> = { de: 'DE', at: 'AT', ch: 'CH' };
	const TIMEZONE_COUNTRY: Record<string, Country> = {
		'Europe/Vienna': 'at',
		'Europe/Zurich': 'ch'
	};

	let theme: 'dark' | 'light' = $state('dark');

	onMount(() => {
		const stored = localStorage.getItem('theme');
		const preferred: 'dark' | 'light' =
			stored === 'dark' || stored === 'light'
				? stored
				: window.matchMedia('(prefers-color-scheme: light)').matches
					? 'light'
					: 'dark';
		theme = preferred;
		document.documentElement.setAttribute('data-theme', preferred);

		// Zeitzonen-Verfeinerung der Land-Erkennung (AGENTS.md item 3) — nur
		// solange der Nutzer das Land noch nie explizit selbst gewählt hat.
		if (!document.cookie.includes('country_explicit=1')) {
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const refined = TIMEZONE_COUNTRY[timezone];
			if (refined && refined !== country) {
				document.cookie = `country=${refined}; path=/; max-age=31536000; samesite=lax`;
			}
		}
	});

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}

	const isModerator = $derived(user?.role === 'moderator' || user?.role === 'admin');

	const countrySwitchLinks = $derived(
		COUNTRIES.map((target) => {
			const base = resolve('/land/[country]', { country: target });
			return { country: target, href: `${base}?to=${encodeURIComponent(page.url.pathname)}` };
		})
	);
</script>

<header class="navbar">
	<div class="navbar-inner">
		<a class="brand" href={resolve('/')}>
			<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M12 0 C12 6 14 10 20 12 C14 14 12 18 12 24 C12 18 10 14 4 12 C10 10 12 6 12 0 Z"
					fill="var(--color-primary)"
				/>
			</svg>
			<span class="wordmark">dorfpartys<em>.com</em></span>
		</a>

		<nav aria-label="Hauptnavigation">
			<div class="country-switch" role="group" aria-label="Land wählen">
				{#each countrySwitchLinks as link (link.country)}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve()-Basis + dynamischer ?to=-Query (aktuelle Seite), siehe countrySwitchLinks -->
					<a href={link.href} class:active={link.country === country}
						>{COUNTRY_LABELS[link.country]}</a
					>
				{/each}
			</div>
			{#if user}
				<a href={resolve('/submit')}>Event einreichen</a>
				<a href={resolve('/partyliste')}>Partyliste</a>
				<a href={resolve('/profil')}>Mein Profil</a>
				{#if isModerator}
					<a href={resolve('/review')}>Review</a>
				{/if}
				<a href={resolve('/auth/logout')}>Logout</a>
			{:else}
				<a href={resolve('/auth/login')}>Login</a>
			{/if}
			<button type="button" class="theme-toggle" onclick={toggleTheme} aria-label="Theme wechseln">
				{#if theme === 'dark'}
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					>
						<circle cx="12" cy="12" r="4" />
						<path
							d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
						/>
					</svg>
				{:else}
					<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
						<path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
					</svg>
				{/if}
			</button>
		</nav>
	</div>
</header>

<style>
	.navbar {
		border-bottom: 1px solid var(--color-border);
	}

	.navbar-inner {
		max-width: 960px;
		margin: 0 auto;
		padding: 16px 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
	}

	.brand svg {
		filter: drop-shadow(0 0 6px var(--color-primary));
	}

	.wordmark {
		font-family: 'Fraunces', Georgia, serif;
		font-weight: 900;
		font-size: 1.2rem;
		letter-spacing: -0.02em;
		color: var(--color-text);
	}

	.wordmark em {
		font-style: normal;
		font-weight: 400;
		font-size: 0.85em;
		color: var(--color-muted);
	}

	nav {
		display: flex;
		align-items: center;
		gap: 18px;
		font-size: 0.9rem;
	}

	nav a {
		text-decoration: none;
		color: var(--color-muted);
	}

	nav a:hover {
		color: var(--color-text);
	}

	.country-switch {
		display: flex;
		border: 1px solid var(--color-border);
	}

	.country-switch a {
		padding: 6px 10px;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		border-right: 1px solid var(--color-border);
	}

	.country-switch a:last-child {
		border-right: none;
	}

	.country-switch a.active {
		background: var(--color-primary);
		color: var(--color-ink);
	}

	.theme-toggle {
		background: none;
		border: 1px solid var(--color-border);
		color: var(--color-text);
		width: 44px;
		height: 44px;
		border-radius: 3px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.theme-toggle:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
</style>

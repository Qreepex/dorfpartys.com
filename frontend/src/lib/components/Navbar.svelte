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

<header class="border-b border-border">
	<div class="mx-auto flex max-w-240 flex-wrap items-center justify-between gap-4 px-5 py-4">
		<a class="flex items-center gap-2.5 no-underline" href={resolve('/')}>
			<svg
				class="drop-shadow-[0_0_6px_var(--color-primary)]"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path
					d="M12 0 C12 6 14 10 20 12 C14 14 12 18 12 24 C12 18 10 14 4 12 C10 10 12 6 12 0 Z"
					fill="var(--color-primary)"
				/>
			</svg>
			<span class="font-display text-lg font-black tracking-[-0.02em] text-text">
				dorfpartys<em class="text-[0.85em] font-normal text-muted not-italic">.com</em>
			</span>
		</a>

		<nav class="flex flex-wrap items-center gap-4.5 text-[0.9rem]" aria-label="Hauptnavigation">
			<div class="flex border border-border" role="group" aria-label="Land wählen">
				{#each countrySwitchLinks as link, i (link.country)}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve()-Basis + dynamischer ?to=-Query (aktuelle Seite), siehe countrySwitchLinks -->
					<a
						class="px-2.5 py-1.5 text-[0.78rem] font-bold tracking-[0.03em] text-muted no-underline hover:text-text"
						class:border-r={i < countrySwitchLinks.length - 1}
						class:border-border={i < countrySwitchLinks.length - 1}
						class:bg-primary={link.country === country}
						class:text-ink={link.country === country}
						href={link.href}>{COUNTRY_LABELS[link.country]}</a
					>
				{/each}
			</div>
			{#if user}
				<a
					class="text-muted no-underline hover:text-text"
					href={resolve('/veranstaltung-eintragen')}
				>
					Event einreichen
				</a>
				<a class="text-muted no-underline hover:text-text" href={resolve('/partyliste')}
					>Partyliste</a
				>
				<a class="text-muted no-underline hover:text-text" href={resolve('/profil')}>Mein Profil</a>
				{#if isModerator}
					<a class="text-muted no-underline hover:text-text" href={resolve('/review')}>Review</a>
				{/if}
				<a class="text-muted no-underline hover:text-text" href={resolve('/auth/logout')}>Logout</a>
			{:else}
				<a class="text-muted no-underline hover:text-text" href={resolve('/auth/login')}>Login</a>
			{/if}
			<button
				type="button"
				class="flex h-11 w-11 items-center justify-center border border-border text-text hover:border-primary hover:text-primary"
				onclick={toggleTheme}
				aria-label="Theme wechseln"
			>
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

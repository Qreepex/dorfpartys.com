<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import { notificationsStore, userStore } from '$lib/stores.js';
	import { callAction } from '$lib/utils/form-action.js';
	import type { Country } from '@dorfpartys/shared';
	import { onMount } from 'svelte';

	const user = $derived.by(() => $userStore);
	const notifications = $derived.by(() => $notificationsStore);
	const notificationCount = $derived(notifications.length);

	// Land-Toggle wurde von hier auf die Landing Page verschoben (dort hat er
	// tatsächlich Wirkung: er steuert, welches Land dort angezeigt wird - im
	// Such-Baum unter /{country}/... ist das Land bereits durch die URL selbst
	// festgelegt, ein globaler Navbar-Switcher war dort wirkungslos/irreführend).
	const TIMEZONE_COUNTRY: Record<string, Country> = {
		'Europe/Vienna': 'at',
		'Europe/Zurich': 'ch'
	};

	let theme: 'dark' | 'light' = $state('dark');
	let userMenuOpen = $state(false);
	let userMenuEl: HTMLDivElement | undefined = $state();
	let notificationsOpen = $state(false);
	let notificationsMenuEl: HTMLDivElement | undefined = $state();

	function handleOutsideClick(event: MouseEvent) {
		if (userMenuEl && !userMenuEl.contains(event.target as Node)) {
			userMenuOpen = false;
		}
	}

	$effect(() => {
		if (!userMenuOpen) return;
		document.addEventListener('click', handleOutsideClick);
		return () => document.removeEventListener('click', handleOutsideClick);
	});

	function handleOutsideClickNotifications(event: MouseEvent) {
		if (notificationsMenuEl && !notificationsMenuEl.contains(event.target as Node)) {
			notificationsOpen = false;
		}
	}

	$effect(() => {
		if (!notificationsOpen) return;
		document.addEventListener('click', handleOutsideClickNotifications);
		return () => document.removeEventListener('click', handleOutsideClickNotifications);
	});

	// "Als gelesen markieren" LÖSCHT die Notification serverseitig (Produktvorgabe,
	// kein read-Flag) - optimistisch sofort aus der lokalen Liste entfernt, ohne
	// auf die Server-Antwort zu warten (analog zum Save-Toggle auf der
	// Event-Seite, siehe $lib/utils/form-action.ts).
	async function dismissNotification(id: string) {
		notificationsStore.update((list) => list.filter((n) => n.id !== id));
		const formData = new FormData();
		formData.set('id', id);
		await callAction('/notifications?/markRead', formData);
	}

	const userInitial = $derived.by(() => {
		const source = user?.displayName || user?.email || '';
		return source.trim().charAt(0).toUpperCase() || '?';
	});

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

		// Zeitzonen-Verfeinerung der Land-Erkennung (AGENTS.md item 3) - nur
		// solange der Nutzer das Land noch nie explizit selbst gewählt hat.
		if (!document.cookie.includes('country_explicit=1')) {
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const refined = TIMEZONE_COUNTRY[timezone];
			if (refined) {
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
</script>

<header class="border-b border-border">
	<div class="mx-auto flex max-w-240 flex-wrap items-center justify-between gap-4 px-5 py-4">
		<a class="flex items-center gap-2.5 no-underline" href={resolve('/')}>
			<img src={favicon} alt="Favicon" width="32" height="32" />
			<span class="font-display text-lg font-black tracking-[-0.02em] text-text">
				dorfpartys<em class="text-[0.85em] font-normal text-muted not-italic">.com</em>
			</span>
		</a>

		<nav class="flex flex-wrap items-center gap-4.5 text-[0.9rem]" aria-label="Hauptnavigation">
			{#if user}
				<a
					class="text-muted no-underline hover:text-text"
					href={resolve('/veranstaltung-eintragen#formular')}
				>
					Event einreichen
				</a>
				<a class="text-muted no-underline hover:text-text" href={resolve('/partyliste')}
					>Partyliste</a
				>
				{#if isModerator}
					<a class="text-muted no-underline hover:text-text" href={resolve('/review')}>Review</a>
				{/if}
				<div class="relative" bind:this={notificationsMenuEl}>
					<button
						type="button"
						class="relative flex h-11 w-11 cursor-pointer items-center justify-center border border-border bg-transparent text-text hover:border-primary hover:text-primary"
						onclick={() => (notificationsOpen = !notificationsOpen)}
						aria-haspopup="menu"
						aria-expanded={notificationsOpen}
						aria-label="Benachrichtigungen"
					>
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
							<path d="M13.73 21a2 2 0 0 1-3.46 0" />
						</svg>
						{#if notificationCount > 0}
							<span
								class="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-bold text-ink"
							>
								{notificationCount}
							</span>
						{/if}
					</button>
					{#if notificationsOpen}
						<div
							class="absolute top-full right-0 z-10 mt-1.5 flex max-h-96 w-80 max-w-[90vw] flex-col overflow-y-auto border border-border bg-bg-alt py-1.5"
							role="menu"
						>
							{#if notifications.length === 0}
								<p class="px-3.5 py-3 text-[0.85rem] text-muted">Keine Benachrichtigungen</p>
							{:else}
								{#each notifications as n (n.id)}
									<div
										class="flex items-start gap-2 border-b border-border px-3.5 py-2.5 last:border-b-0"
									>
										{#if n.link}
											<a
												class="flex-1 text-[0.85rem] text-text no-underline hover:text-primary"
												href={n.link}
												onclick={() => (notificationsOpen = false)}
											>
												{n.message}
											</a>
										{:else}
											<span class="flex-1 text-[0.85rem] text-text">{n.message}</span>
										{/if}
										<button
											type="button"
											class="shrink-0 cursor-pointer border-0 bg-transparent px-1 text-muted hover:text-text"
											onclick={() => dismissNotification(n.id)}
											aria-label="Als gelesen markieren"
										>
											&times;
										</button>
									</div>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
				<div class="relative" bind:this={userMenuEl}>
					<button
						type="button"
						class="flex cursor-pointer items-center gap-2 border border-border bg-transparent px-2 py-1.5 text-text"
						onclick={() => (userMenuOpen = !userMenuOpen)}
						aria-haspopup="menu"
						aria-expanded={userMenuOpen}
					>
						{#if user.avatarUrl}
							<img
								class="h-6 w-6 rounded-full object-cover"
								src={user.avatarUrl}
								alt=""
								width="24"
								height="24"
							/>
						{:else}
							<span
								class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[0.7rem] font-bold text-ink"
							>
								{userInitial}
							</span>
						{/if}
						<span class="max-w-32 truncate text-[0.9rem]"
							>{user.displayName || user.email || 'Nutzer'}</span
						>
					</button>
					{#if userMenuOpen}
						<div
							class="absolute top-full right-0 z-10 mt-1.5 flex min-w-40 flex-col border border-border bg-bg-alt py-1.5"
							role="menu"
						>
							<a
								class="px-3.5 py-2 text-[0.9rem] text-text no-underline hover:bg-border"
								href={resolve('/profil')}
								role="menuitem"
								onclick={() => (userMenuOpen = false)}
							>
								Mein Profil
							</a>
							<a
								class="px-3.5 py-2 text-[0.9rem] text-text no-underline hover:bg-border"
								href={resolve('/meine-veranstaltungen')}
								role="menuitem"
								onclick={() => (userMenuOpen = false)}
							>
								Veranstaltungen
							</a>
							<a
								class="px-3.5 py-2 text-[0.9rem] text-text no-underline hover:bg-border"
								href={resolve('/auth/logout')}
								role="menuitem"
								onclick={() => (userMenuOpen = false)}
							>
								Logout
							</a>
						</div>
					{/if}
				</div>
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

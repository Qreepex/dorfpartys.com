<script lang="ts">
	import { page } from '$app/state';

	// `url`/`title`/`text` sind optional - ohne `url` wird die aktuelle Seiten-URL
	// verwendet (Standardfall auf allen drei Seitentypen). `title` befüllt den
	// nativen Share-Sheet-Titel (z.B. Event-Titel, Veranstalter-Name, SEO-H1);
	// `text` ist eine optionale Kurzbeschreibung, falls sinnvoll vorhanden.
	let {
		url,
		title,
		text
	}: {
		url?: string;
		title?: string;
		text?: string;
	} = $props();

	let copied = $state(false);
	let copyTimeoutId: ReturnType<typeof setTimeout> | undefined;

	async function handleShare() {
		const shareUrl = url ?? page.url.href;

		if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
			try {
				await navigator.share({ title, text, url: shareUrl });
			} catch (error) {
				// Nutzer:in hat den nativen Share-Dialog abgebrochen (AbortError) - das ist
				// eine bewusste Nutzeraktion, kein Fehlerzustand, daher kein UI-Feedback.
				// Andere Fehler (z.B. fehlende Berechtigung) werden ebenfalls still
				// ignoriert, um kein jarring alert() o.ä. zu zeigen.
			}
			return;
		}

		// Fallback für Desktop-Browser ohne Web Share API: Link kopieren.
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			clearTimeout(copyTimeoutId);
			copyTimeoutId = setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			// Clipboard-Zugriff verweigert/nicht verfügbar - kein weiterer Fallback vorgesehen.
		}
	}
</script>

<div class="relative inline-block shrink-0">
	<button
		type="button"
		class="flex h-10 w-10 items-center justify-center border border-border bg-transparent text-text hover:border-primary hover:text-primary"
		onclick={handleShare}
		aria-label={copied ? 'Link kopiert' : 'Seite teilen'}
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
			<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
			<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
		</svg>
	</button>
	{#if copied}
		<span
			class="pointer-events-none absolute top-full right-0 z-10 mt-2 rounded-sm bg-text px-2.5 py-1 text-[0.8rem] font-semibold whitespace-nowrap text-bg shadow-lg"
			role="status"
		>
			Link kopiert!
		</span>
	{/if}
</div>

<script lang="ts">
	/**
	 * Klickbares Foto mit Fullscreen-Lightbox-Overlay (z.B. Event-Fotos auf
	 * /veranstaltung/{slug}/, die vorher als winzige Grid-Thumbnails kaum zu
	 * erkennen waren - siehe Produkt-Feedback). Bewusst KEIN Wrapper um
	 * <Modal> (frontend/src/lib/components/Modal.svelte): Modal ist für ein
	 * zentriertes, gepolstertes Dialog-Panel mit hellem Hintergrund,
	 * max-width 480px und Innenabstand gebaut (Bestätigungsdialog "Profil
	 * öffentlich machen" im Event-Formular) - eine Bild-Lightbox braucht
	 * stattdessen ein full-bleed Bild vor dunklem Backdrop ohne Panel-Chrome,
	 * das je nach Bildformat unterschiedlich groß ist. Das Dismiss-Verhalten
	 * (Escape, Klick auf Backdrop, expliziter Schließen-Button, Fokus beim
	 * Öffnen/Schließen) übernimmt diese Komponente aber 1:1 von Modal, für
	 * konsistentes Verhalten über die Seite hinweg.
	 */
	interface Props {
		src: string;
		alt: string;
		/** Zusätzliche Klassen für den Trigger/Thumbnail-Container (z.B. Grid-Layout der aufrufenden Seite). */
		class?: string;
	}

	let { src, alt, class: className = '' }: Props = $props();

	let open = $state(false);
	let triggerEl = $state<HTMLButtonElement | undefined>(undefined);
	let closeEl = $state<HTMLButtonElement | undefined>(undefined);

	function openLightbox() {
		open = true;
	}

	function closeLightbox() {
		open = false;
		// Fokus zurück zum auslösenden Element - Tastatur-Nutzer:innen landen
		// nicht "irgendwo" auf der Seite, sondern genau dort, wo sie waren.
		triggerEl?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') closeLightbox();
	}

	function handleOverlayClick() {
		closeLightbox();
	}

	function stopPropagation(event: MouseEvent) {
		event.stopPropagation();
	}

	// Fokus geht beim Öffnen auf den Schließen-Button (direkt per Enter/Space
	// wieder schließbar), analog zu Modals Fokus-auf-Panel-Verhalten.
	$effect(() => {
		if (open && closeEl) {
			closeEl.focus();
		}
	});

	// Verhindert Scrollen des Hintergrunds, während die Lightbox offen ist -
	// v.a. auf Mobile relevant (iOS-Safari "Rubber-Banding" scrollt sonst
	// sichtbar durch das Overlay hindurch).
	$effect(() => {
		if (!open) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	});
</script>

<button
	type="button"
	bind:this={triggerEl}
	class={`lightbox-trigger ${className}`}
	onclick={openLightbox}
	aria-label={`${alt} – Bild vergrößern`}
>
	<img class="lightbox-thumb" {src} {alt} loading="lazy" />
</button>

{#if open}
	<div class="lightbox-overlay" role="presentation" onclick={handleOverlayClick}>
		<div
			class="lightbox-panel"
			role="dialog"
			aria-modal="true"
			aria-label={alt}
			tabindex="-1"
			onclick={stopPropagation}
			onkeydown={handleKeydown}
		>
			<button
				type="button"
				bind:this={closeEl}
				class="lightbox-close"
				onclick={closeLightbox}
				aria-label="Bild schließen"
			>
				×
			</button>
			<img class="lightbox-full" {src} {alt} />
		</div>
	</div>
{/if}

<style>
	.lightbox-trigger {
		display: block;
		width: 100%;
		padding: 0;
		border: none;
		background: none;
		cursor: zoom-in;
	}

	.lightbox-thumb {
		display: block;
		width: 100%;
		aspect-ratio: 4 / 3;
		max-height: 32rem;
		object-fit: cover;
	}

	.lightbox-overlay {
		position: fixed;
		inset: 0;
		z-index: 300;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.9);
		animation: lightbox-fade-in 0.15s ease-out;
	}

	.lightbox-panel {
		position: relative;
		display: inline-flex;
		max-width: 100%;
		max-height: 100%;
	}

	.lightbox-panel:focus {
		outline: none;
	}

	.lightbox-full {
		display: block;
		max-width: 100%;
		max-height: calc(100vh - 2rem);
		width: auto;
		height: auto;
		object-fit: contain;
	}

	.lightbox-close {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.55);
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 2px;
		color: #fff;
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
	}

	.lightbox-close:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	@keyframes lightbox-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>

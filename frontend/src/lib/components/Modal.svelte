<script lang="ts">
	import type { Snippet } from 'svelte';

	// Minimales, funktionales Modal (kein vollwertiges Accessible-Dialog-Framework
	// nötig, siehe Aufgabenstellung) - Overlay + zentriertes Panel, schließbar per
	// explizitem Button, Klick auf das Overlay oder Escape. Wird aktuell für den
	// "Profil öffentlich machen"-Bestätigungsdialog im Event-Formular genutzt
	// (frontend/src/routes/veranstaltung-eintragen/+page.svelte), ist aber bewusst
	// generisch gehalten (Inhalt via `children`-Snippet) für künftige Wiederverwendung.
	interface Props {
		open: boolean;
		onClose: () => void;
		labelledBy?: string;
		children: Snippet;
	}

	let { open, onClose, labelledBy, children }: Props = $props();

	let panelEl = $state<HTMLDivElement | undefined>(undefined);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onClose();
	}

	function handleOverlayClick() {
		onClose();
	}

	function stopPropagation(event: MouseEvent) {
		event.stopPropagation();
	}

	// Einfaches Fokus-Handling: sobald das Panel eingeblendet wird, bekommt es
	// den Fokus - reicht für Tastatur-Bedienbarkeit (Escape/Tab), ohne einen
	// vollen Fokus-Trap zu implementieren.
	$effect(() => {
		if (open && panelEl) {
			panelEl.focus();
		}
	});
</script>

{#if open}
	<div class="modal-overlay" role="presentation" onclick={handleOverlayClick}>
		<div
			bind:this={panelEl}
			class="modal-panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby={labelledBy}
			tabindex="-1"
			onclick={stopPropagation}
			onkeydown={handleKeydown}
		>
			<button type="button" class="modal-close" onclick={onClose} aria-label="Schließen">
				×
			</button>
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		background: rgba(0, 0, 0, 0.6);
		animation: modal-fade-in 0.15s ease-out;
	}

	.modal-panel {
		position: relative;
		width: 100%;
		max-width: 480px;
		max-height: 90vh;
		overflow-y: auto;
		padding: 28px 24px 24px;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
	}

	.modal-panel:focus {
		outline: none;
	}

	.modal-close {
		position: absolute;
		top: 12px;
		right: 12px;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 2px;
		color: var(--color-text);
		font-size: 1.3rem;
		line-height: 1;
		cursor: pointer;
	}

	.modal-close:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	@keyframes modal-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>

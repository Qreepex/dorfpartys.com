<script lang="ts">
	/**
	 * Großes, kaum zu übersehendes Feedback-Banner nach dem Absenden eines
	 * Formulars - ursprünglich nur in veranstaltung-eintragen/+page.svelte,
	 * jetzt auch von /profil genutzt (beide Speichervorgänge sollen gleich
	 * unübersehbar bestätigt werden). Erfolg blendet sich nach `autoDismissMs`
	 * automatisch aus, ein Fehler bleibt stehen, bis die Person ihn aktiv
	 * schließt.
	 */
	interface Props {
		kind: 'success' | 'error';
		message: string;
		onDismiss: () => void;
	}

	let { kind, message, onDismiss }: Props = $props();
</script>

<div
	class="feedback-banner"
	class:feedback-success={kind === 'success'}
	class:feedback-error={kind === 'error'}
	role="alert"
>
	<div class="mx-auto flex max-w-[90ch] items-center gap-4 px-5 py-5">
		<span class="text-2xl" aria-hidden="true">{kind === 'success' ? '✓' : '✗'}</span>
		<p class="flex-1 text-[1.05rem] font-semibold">{message}</p>
		<button type="button" class="feedback-close" onclick={onDismiss} aria-label="Meldung schließen">
			×
		</button>
	</div>
</div>

<style>
	.feedback-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
		animation: feedback-slide-in 0.2s ease-out;
	}

	.feedback-banner.feedback-success {
		background: var(--color-primary);
		color: var(--color-ink);
	}

	.feedback-banner.feedback-error {
		background: var(--color-secondary);
		color: var(--color-ink);
	}

	.feedback-close {
		flex: 0 0 auto;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid currentColor;
		border-radius: 2px;
		color: inherit;
		font-size: 1.3rem;
		line-height: 1;
		cursor: pointer;
	}

	.feedback-close:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	@keyframes feedback-slide-in {
		from {
			transform: translateY(-100%);
		}
		to {
			transform: translateY(0);
		}
	}
</style>

<script lang="ts">
	import { page } from '$app/state';
	import { callAction, type ActionOutcome } from '$lib/utils/form-action.js';
	import { optimizeImage } from '$lib/utils/image-upload.js';

	/**
	 * Generische Foto-Upload-Utility (Vorschau + Client-Optimierung + Upload
	 * per fetch, kein Form-Submit) - von Profilbild (`/profil`) und
	 * Event-Foto (`/veranstaltung-eintragen`) gemeinsam genutzt. Größen-/
	 * Dimensions-Limits und die Zielaktion sind über Props einstellbar, damit
	 * beide Stellen sich nicht mehr eigenständig um Fetch-/Fehlerbehandlung
	 * kümmern müssen (vorher zwei fast identische, jeweils fehlerhafte
	 * Implementierungen in AvatarUpload.svelte/ImageUpload.svelte).
	 */
	interface Props {
		/** id des Datei-Inputs, zugleich Basis für das Label-`for`. */
		name: string;
		label?: string;
		/** Name der SvelteKit-Form-Action im selben Route-Verzeichnis, ohne führendes `?/` (z.B. "uploadAvatar"). */
		action: string;
		/** Zusätzliche FormData-Felder für die Upload-Action (z.B. `eventId`) - wird bei jedem Upload-Versuch neu aufgerufen. */
		extraFields?: () => Record<string, string>;
		accept?: string;
		/** Maximale Zieldateigröße in Bytes (JPEG-Qualität wird iterativ gesenkt). */
		maxSizeBytes?: number;
		/** Maximale Kantenlänge nach dem clientseitigen Resize/Crop. */
		maxDimension?: number;
		/** Center-Crop auf ein Quadrat vor dem Resize (z.B. Profilbilder). */
		squareCrop?: boolean;
		/** Steuert nur die Vorschau-Optik (rund/klein vs. rechteckig/groß), keine Upload-Logik. */
		shape?: 'round' | 'rect';
		/** Bereits gespeichertes Bild (Vorschau-Fallback, bevor ein neues hochgeladen wurde). */
		currentImageUrl?: string | null;
		helpText?: string;
		onUploadComplete?: (s3Key: string) => void;
		/** Meldet, ob gerade optimiert/hochgeladen wird - z.B. um den Haupt-Submit-Button zu sperren. */
		onBusyChange?: (busy: boolean) => void;
		/**
		 * Entfernt ein bereits gespeichertes Bild serverseitig (z.B. Profilbild
		 * löschen) - liefert `{ok: false, error}` statt zu werfen, damit eine
		 * verständliche Fehlermeldung angezeigt werden kann, keine rohe
		 * Exception. Wenn nicht gesetzt (z.B. Event-Fotos vor dem Absenden),
		 * entfernt der "Entfernen"-Button nur die lokale Vorschau, ohne einen
		 * Request zu schicken.
		 */
		onRemove?: () => Promise<{ ok: boolean; error?: string }>;
		/**
		 * Löscht einen in dieser Session hochgeladenen, aber noch nicht
		 * anderweitig bestätigten Key sofort wieder (z.B. Event-Foto vor dem
		 * Absenden ersetzt/entfernt) - reine Aufräum-Optimierung, damit nicht
		 * bis zum nächsten periodischen Sweep (15 Minuten, siehe
		 * backend/src/storage/pending-upload.ts) gewartet werden muss. Bewusst
		 * fire-and-forget: ein Fehlschlag hier blockiert die eigentliche
		 * Nutzeraktion (ersetzen/entfernen) nicht, das Sweep-Sicherheitsnetz
		 * greift ohnehin. Nicht relevant für bereits selbst-bestätigende Uploads
		 * (z.B. Profilbild, siehe `onRemove`).
		 */
		onDiscard?: (s3Key: string) => Promise<void>;
		/**
		 * Wird aufgerufen, sobald ein zuvor via `onUploadComplete` gemeldeter Key
		 * wieder entfernt wurde (Entfernen-Button) - Gegenstück zu
		 * `onUploadComplete`, damit der übergeordnete Formular-State (z.B. ein
		 * verstecktes `photoS3Key`-Feld) nicht weiter auf einen inzwischen
		 * gelöschten Key zeigt.
		 */
		onCleared?: () => void;
		disabled?: boolean;
	}

	let {
		name,
		label = 'Foto hochladen',
		action,
		extraFields,
		accept = 'image/jpeg,image/png',
		maxSizeBytes,
		maxDimension,
		squareCrop = false,
		shape = 'rect',
		currentImageUrl = null,
		helpText,
		onUploadComplete,
		onBusyChange,
		onRemove,
		onDiscard,
		onCleared,
		disabled = false
	}: Props = $props();

	let isOptimizing = $state(false);
	let isLoading = $state(false);
	let isRemoving = $state(false);
	let error = $state<string | null>(null);
	let uploadedS3Key = $state<string | null>(null);
	let previewUrl = $state<string | null>(null);
	// Wird true, sobald der/die Nutzer:in das ursprünglich übergebene
	// `currentImageUrl` aktiv entfernt hat - sonst würde es nach einem
	// erfolgreichen Entfernen weiter als Vorschau-Fallback erscheinen, obwohl
	// serverseitig schon nichts mehr da ist (das Prop selbst ändert sich erst
	// nach einem Reload/Refetch der Elternseite).
	let removedExisting = $state(false);

	const displayedPreview = $derived(previewUrl ?? (removedExisting ? null : currentImageUrl));
	const busy = $derived(isOptimizing || isLoading || isRemoving);

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		error = null;
		isOptimizing = true;
		onBusyChange?.(true);

		// Wird ein bereits in dieser Session hochgeladener (aber noch nicht
		// bestätigter) Key gerade ersetzt, danach sofort aufräumen statt bis zum
		// nächsten periodischen Sweep zu warten (siehe `onDiscard`-Doku oben).
		const previousUnconfirmedKey = uploadedS3Key;

		try {
			const optimized = await optimizeImage(file, { maxDimension, maxSizeBytes, squareCrop });

			if (!('blob' in optimized)) {
				error = optimized.message;
				return;
			}

			isOptimizing = false;
			isLoading = true;

			const formData = new FormData();
			formData.append('contentType', optimized.type);
			formData.append('file', optimized.blob);
			for (const [key, value] of Object.entries(extraFields?.() ?? {})) {
				formData.append(key, value);
			}

			const outcome: ActionOutcome<{ s3Key?: string }> = await callAction(
				`${page.url.pathname}?/${action}`,
				formData
			);

			if (!outcome.ok || !outcome.data?.s3Key) {
				error = outcome.error ?? 'Upload fehlgeschlagen';
				return;
			}

			uploadedS3Key = outcome.data.s3Key;
			previewUrl = URL.createObjectURL(optimized.blob);
			onUploadComplete?.(outcome.data.s3Key);

			if (previousUnconfirmedKey) {
				onDiscard?.(previousUnconfirmedKey).catch(() => {});
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten';
		} finally {
			isOptimizing = false;
			isLoading = false;
			input.value = '';
			onBusyChange?.(false);
		}
	}

	async function handleRemove() {
		error = null;

		if (onRemove) {
			isRemoving = true;
			const result = await onRemove();
			isRemoving = false;

			if (!result.ok) {
				error = result.error ?? 'Entfernen fehlgeschlagen';
				return;
			}
		} else if (uploadedS3Key) {
			// Kein `onRemove` (z.B. Event-Foto vor dem Absenden): der Key ist noch
			// nicht bestätigt/angehängt, also sofort aufräumen statt bis zum Sweep
			// zu warten.
			onDiscard?.(uploadedS3Key).catch(() => {});
		}

		uploadedS3Key = null;
		previewUrl = null;
		removedExisting = true;
		onCleared?.();
	}
</script>

<div class="field">
	{#if label}
		<span class="field-label">{label}</span>
	{/if}

	{#if shape === 'round'}
		<div class="flex items-center gap-4">
			{#if displayedPreview}
				<img
					src={displayedPreview}
					alt=""
					class="h-24 w-24 rounded-full border border-border object-cover"
					width="96"
					height="96"
				/>
			{:else}
				<div
					class="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-border text-muted"
				>
					?
				</div>
			{/if}

			<div>
				<input
					id={name}
					type="file"
					{accept}
					onchange={handleFileSelect}
					disabled={disabled || busy}
					style="display: none"
				/>
				<div class="flex flex-wrap items-center gap-3">
					<button
						type="button"
						onclick={() => document.getElementById(name)?.click()}
						disabled={disabled || busy}
						class="hover:text-primary-dark border border-border px-3.5 py-2 text-text disabled:cursor-not-allowed disabled:text-muted"
					>
						{#if isOptimizing}
							Wird optimiert...
						{:else if isLoading}
							Wird hochgeladen...
						{:else}
							{displayedPreview ? 'Bild ersetzen' : 'Bild hochladen'}
						{/if}
					</button>
					{#if displayedPreview}
						<button
							type="button"
							onclick={handleRemove}
							disabled={disabled || busy}
							class="text-xs text-secondary underline disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isRemoving ? 'Wird entfernt...' : 'Entfernen'}
						</button>
					{/if}
				</div>
				{#if helpText}
					<p class="mt-2 text-xs text-muted">{helpText}</p>
				{/if}
			</div>
		</div>
	{:else if !uploadedS3Key}
		<div class="rounded-lg border-2 border-dashed border-border p-6 text-center">
			<input
				id={name}
				type="file"
				{accept}
				onchange={handleFileSelect}
				disabled={disabled || busy}
				style="display: none"
			/>
			<button
				type="button"
				onclick={() => document.getElementById(name)?.click()}
				disabled={disabled || busy}
				class="hover:text-primary-dark text-primary disabled:cursor-not-allowed disabled:text-muted"
			>
				{#if isOptimizing}
					<span>Wird optimiert...</span>
				{:else if isLoading}
					<span>Wird hochgeladen...</span>
				{:else}
					<span>Klick zum Hochladen</span>
				{/if}
			</button>
			<p class="mt-2 text-sm text-muted">JPG oder PNG</p>
			{#if helpText}
				<p class="mt-1 text-xs text-muted">{helpText}</p>
			{/if}
		</div>
	{:else}
		<div class="rounded-lg border border-border p-4">
			{#if previewUrl}
				<img
					src={previewUrl}
					alt="Vorschau"
					class="mb-4 h-auto max-h-80 w-full rounded object-cover"
				/>
			{/if}
			<div class="flex gap-2">
				<button
					type="button"
					onclick={handleRemove}
					disabled={isRemoving}
					class="rounded border border-border px-4 py-2 hover:bg-bg-alt disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isRemoving ? 'Wird entfernt...' : 'Entfernen'}
				</button>
			</div>
		</div>
	{/if}

	{#if error}
		<p class="field-error">{error}</p>
	{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-label {
		font-weight: 500;
	}

	.field-error {
		color: var(--color-secondary);
		font-size: 0.875rem;
	}
</style>

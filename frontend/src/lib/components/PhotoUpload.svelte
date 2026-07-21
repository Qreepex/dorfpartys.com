<script lang="ts">
	import { page } from '$app/state';
	import { callAction, type ActionOutcome } from '$lib/utils/form-action.js';
	import { optimizeImage } from '$lib/utils/image-upload.js';
	import { MAX_IMAGE_SIZE_MB } from '@dorfpartys/shared';

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
		disabled = false
	}: Props = $props();

	let isOptimizing = $state(false);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let uploadedS3Key = $state<string | null>(null);
	let previewUrl = $state<string | null>(null);

	const displayedPreview = $derived(previewUrl ?? currentImageUrl);
	const busy = $derived(isOptimizing || isLoading);

	function reset() {
		uploadedS3Key = null;
		previewUrl = null;
		error = null;
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		error = null;
		isOptimizing = true;
		onBusyChange?.(true);

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
		} catch (err) {
			error = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten';
		} finally {
			isOptimizing = false;
			isLoading = false;
			input.value = '';
			onBusyChange?.(false);
		}
	}

	function handleRemove() {
		reset();
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
						{currentImageUrl || uploadedS3Key ? 'Bild ersetzen' : 'Bild hochladen'}
					{/if}
				</button>
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
			<p class="mt-2 text-sm text-muted">
				JPG oder PNG, max. {maxSizeBytes ? (maxSizeBytes / (1024 * 1024)).toFixed(0) : MAX_IMAGE_SIZE_MB}MB
			</p>
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
					class="rounded border border-border px-4 py-2 hover:bg-bg-alt"
				>
					Entfernen
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

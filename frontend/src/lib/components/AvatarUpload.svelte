<script lang="ts">
	import { page } from '$app/state';
	import { validateAndOptimizeAvatarImage } from '$lib/utils/image-upload.js';

	interface Props {
		label?: string;
		name: string;
		/** Aktuell gespeichertes Profilbild (falls vorhanden), fürs Vorschau-Fallback. */
		currentAvatarUrl?: string | null;
		onUploadComplete?: (s3Key: string) => void;
		disabled?: boolean;
	}

	let {
		label = 'Profilbild',
		name,
		currentAvatarUrl = null,
		onUploadComplete,
		disabled = false
	}: Props = $props();

	let isLoading = $state(false);
	let isOptimizing = $state(false);
	let error = $state<string | null>(null);
	let uploadedS3Key = $state<string | null>(null);
	let previewUrl = $state<string | null>(null);

	const displayedPreview = $derived(previewUrl ?? currentAvatarUrl);

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		error = null;
		isOptimizing = true;

		try {
			// Client-seitiges Crop/Resize auf max. 128x128 (siehe
			// image-upload.ts) - nur für UX/Bandbreite, das Backend validiert
			// und erzwingt die Grenze unabhängig davon nochmal.
			const optimizationResult = await validateAndOptimizeAvatarImage(file);

			if (!('blob' in optimizationResult)) {
				error = optimizationResult.message;
				isOptimizing = false;
				return;
			}

			isOptimizing = false;
			isLoading = true;

			const optimizedFile = optimizationResult;

			const formData = new FormData();
			formData.append('contentType', optimizedFile.type);
			formData.append('file', optimizedFile.blob);

			const url = new URL(page.url);
			url.searchParams.set('_data', 'json');

			const uploadResponse = await fetch(`${url.toString()}?/uploadAvatar`, {
				method: 'POST',
				body: formData
			});

			const uploadResult = (await uploadResponse.json()) as {
				success?: boolean;
				s3Key?: string;
				error?: string;
			};

			if (!uploadResponse.ok || !uploadResult.success) {
				error = uploadResult.error || 'Upload fehlgeschlagen';
				isLoading = false;
				return;
			}

			if (!uploadResult.s3Key) {
				error = 'S3 Key nicht erhalten';
				isLoading = false;
				return;
			}

			uploadedS3Key = uploadResult.s3Key;
			previewUrl = URL.createObjectURL(optimizedFile.blob);

			if (onUploadComplete) {
				onUploadComplete(uploadResult.s3Key);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten';
		} finally {
			isLoading = false;
			isOptimizing = false;
			input.value = '';
		}
	}
</script>

<div class="field">
	<span class="field-label">{label}</span>

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
			<!--
				Bewusst KEIN `name`-Attribut: dieses Feld liegt innerhalb des
				umgebenden `<form action="?/updateProfile">` (profil/+page.svelte).
				Mit `name` würde eine (native oder JS-)Übermittlung des Hauptformulars
				den rohen Original-File aus diesem Input mit einsammeln, falls sie vor
				Abschluss von `handleFileSelect` passiert (Race Condition, bevor
				`input.value` im `finally`-Block geleert ist) - analog zum Bug bei
				ImageUpload.svelte (Event-Fotos), siehe Kommentar dort. Das eigentliche
				Bild läuft ausschließlich über die separate `?/uploadAvatar`-Action
				(fetch mit dem optimierten Blob) + das versteckte `avatarS3Key`-Feld -
				der rohe File-Input muss dafür nicht Teil des Hauptformulars sein.
			-->
			<input
				id={name}
				type="file"
				accept="image/jpeg,image/png"
				onchange={handleFileSelect}
				{disabled}
				style="display: none"
			/>
			<button
				type="button"
				onclick={() => document.getElementById(name)?.click()}
				disabled={disabled || isLoading || isOptimizing}
				class="hover:text-primary-dark border border-border px-3.5 py-2 text-text disabled:cursor-not-allowed disabled:text-muted"
			>
				{#if isOptimizing}
					Wird optimiert...
				{:else if isLoading}
					Wird hochgeladen...
				{:else}
					{currentAvatarUrl || uploadedS3Key ? 'Bild ersetzen' : 'Bild hochladen'}
				{/if}
			</button>
			<p class="mt-2 text-xs text-muted">
				JPG oder PNG. Wird automatisch auf 128×128 zugeschnitten und skaliert.
			</p>
		</div>
	</div>

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

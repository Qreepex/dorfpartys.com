<script lang="ts">
	import { page } from '$app/state';
	import { validateAndOptimizeImage } from '$lib/utils/image-upload.js';
	import { MAX_IMAGE_SIZE_MB } from '@dorfpartys/shared';

	interface Props {
		label?: string;
		name: string;
		onUploadComplete?: (s3Key: string) => void;
		disabled?: boolean;
	}

	let { label = 'Foto hochladen', name, onUploadComplete, disabled = false }: Props = $props();

	let isLoading = $state(false);
	let isOptimizing = $state(false);
	let error = $state<string | null>(null);
	let uploadedS3Key = $state<string | null>(null);
	let previewUrl = $state<string | null>(null);

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		error = null;
		isOptimizing = true;

		try {
			// Client-side optimization (type check + resize + compress for UX)
			const optimizationResult = await validateAndOptimizeImage(file);

			if (!('blob' in optimizationResult)) {
				// This is an error
				error = optimizationResult.message;
				isOptimizing = false;
				return;
			}

			isOptimizing = false;
			isLoading = true;

			const optimizedFile = optimizationResult;
			const eventId = crypto.randomUUID();

			const formData = new FormData();
			formData.append('eventId', eventId);
			formData.append('contentType', optimizedFile.type);
			formData.append('file', optimizedFile.blob);

			const url = new URL(page.url);
			url.searchParams.set('_data', 'json');

			const uploadResponse = await fetch(`${url.toString()}?/uploadPhoto`, {
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

	function handleRemove() {
		uploadedS3Key = null;
		previewUrl = null;
		error = null;
	}
</script>

<div class="field">
	<label class="field-label" for={name}>{label}</label>

	{#if !uploadedS3Key}
		<div class="rounded-lg border-2 border-dashed border-border p-6 text-center">
			<input
				id={name}
				type="file"
				{name}
				accept="image/jpeg,image/png"
				onchange={handleFileSelect}
				{disabled}
				style="display: none"
			/>
			<button
				type="button"
				onclick={() => document.getElementById(name)?.click()}
				{disabled}
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
			<p class="mt-2 text-sm text-muted">JPG oder PNG, max. {MAX_IMAGE_SIZE_MB}MB</p>
			<p class="mt-1 text-xs text-muted">Wird automatisch skaliert (max. 1920px) und komprimiert</p>
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

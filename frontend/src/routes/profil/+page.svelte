<script lang="ts">
	import { resolve } from '$app/paths';
	import '$lib/components/form-field.css';
	import { Button, FormGrid, TextInput, Toggle, VerifiedBadge } from '$lib/components/index.js';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let verificationCode = $state<string | null>(null);
	let showVerificationCode = $state(false);

	const organizerHref = $derived(
		data.profile?.slug ? resolve('/veranstalter/[slug]', { slug: data.profile.slug }) : null
	);

	function handleVerificationResponse() {
		if (form?.verificationRequested) {
			verificationCode = form.code || null;
			showVerificationCode = true;
		}
	}

	$effect(() => {
		handleVerificationResponse();
	});
</script>

<svelte:head>
	<title>Mein Profil | dorfpartys.com</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div>
	<h1>Mein Profil</h1>

	{#if form?.success}
		<p class="mb-4 border border-primary bg-bg-alt p-4 text-text">Profil gespeichert.</p>
	{/if}

	{#if organizerHref}
		<p class="mb-6 text-muted">
			Deine öffentliche Veranstalter-Seite:
			<a class="text-primary" href={organizerHref}>dorfpartys.com{organizerHref}</a>
		</p>
	{:else}
		<p class="mb-6 text-muted">
			Sobald du einen Anzeigenamen speicherst und dein Profil öffentlich stellst, bekommst du eine
			eigene öffentliche Veranstalter-Seite.
		</p>
	{/if}

	<form method="POST" action="?/updateProfile" class="grid gap-6">
		<FormGrid>
			<div class="sm:col-span-full">
				<TextInput
					label="Anzeigename"
					name="displayName"
					maxlength={80}
					value={data.profile?.displayName ?? ''}
					error={form?.fieldErrors?.displayName?.[0]}
				/>
			</div>
			<div class="sm:col-span-full">
				<TextInput
					label="Profil-URL (optional)"
					name="slug"
					maxlength={50}
					value={data.profile?.slug ?? ''}
					placeholder="z.b. meine-party-events"
				/>
				<p class="mt-1 text-xs text-muted">
					Optional: Personalisierte URL wie <code>/veranstalter/meine-party-events</code>. Wenn leer, wird automatisch aus dem Anzeigenamen generiert.
				</p>
				{#if form?.verificationError}
					<p class="mt-1 text-xs text-red-600">{form.verificationError}</p>
				{/if}
			</div>
			<TextInput
				label="Website"
				name="websiteUrl"
				type="url"
				value={data.profile?.websiteUrl ?? ''}
			/>
			<TextInput
				label="Instagram"
				name="instagramUrl"
				type="url"
				value={data.profile?.instagramUrl ?? ''}
			/>
			<TextInput
				label="Facebook"
				name="facebookUrl"
				type="url"
				value={data.profile?.facebookUrl ?? ''}
			/>
			<TextInput label="TikTok" name="tiktokUrl" type="url" value={data.profile?.tiktokUrl ?? ''} />
			<div class="sm:col-span-full">
				<label class="field-label" for="bio">Bio</label>
				<textarea class="field-control" id="bio" name="bio" maxlength="2000" rows="4"
					>{data.profile?.bio ?? ''}</textarea
				>
			</div>
		</FormGrid>

		<div class="border-t border-border pt-5">
			<Toggle
				label="Profil öffentlich sichtbar"
				name="isPublic"
				checked={data.profile?.isPublic ?? false}
			/>
			<p class="mt-2 max-w-[55ch] text-[0.85rem] text-muted">
				Nur mit öffentlichem Profil bist du unter deiner Veranstalter-Seite auffindbar - und nur
				dann kannst du Veranstaltungen eintragen. Standardmäßig ist dein Profil privat.
			</p>
		</div>

		<Button type="submit">Speichern</Button>
	</form>

	{#if data.profile}
		<div class="mt-8 border-t border-border pt-6">
			<h2 class="mb-4 flex items-center gap-2">
				Verifizierung
				{#if data.profile.verifiedAt}
					<VerifiedBadge title="Dein Profil ist verifiziert" />
				{/if}
			</h2>

			{#if data.profile.verifiedAt}
				<p class="mb-4 text-sm text-text">
					✓ Dein Profil wurde verifiziert über <strong>{data.profile.verificationMethod}</strong>.
					Deine Veranstaltungen werden als von einem verifizierten Veranstalter angezeigt.
				</p>
			{:else if data.profile.verificationCode}
				<div class="mb-4 rounded border border-blue-200 p-4">
					<p class="mb-4 text-sm font-semibold text-text">
						Du hast bereits eine Verifizierungsanfrage gestellt. Bitte sende den folgenden Code und
						warte auf deine Bestätigung.
					</p>
					<p class="mb-2 text-sm font-semibold">Dein Verifizierungs-Code:</p>
					<p class="mb-4 font-mono text-lg font-bold tracking-widest">
						{data.profile.verificationCode}
					</p>
					<p class="mb-4 text-sm text-text">
						Sende diesen Code an <strong>@dorfpartys</strong> auf
						<strong>Instagram</strong> oder <strong>TikTok</strong>, oder schreib eine E-Mail an
						<strong>verifizierung@dorfpartys.com</strong> (von einer der oben hinterlegten Adressen).
					</p>
					{#if data.profile.verificationRequestedAt}
						<p class="text-xs text-blue-700">
							Anfrage gestellt am: {new Date(
								data.profile.verificationRequestedAt
							).toLocaleDateString('de-DE', {
								day: '2-digit',
								month: '2-digit',
								year: 'numeric',
								hour: '2-digit',
								minute: '2-digit'
							})}
						</p>
					{/if}
				</div>
			{:else}
				<p class="mb-4 text-sm text-text">
					Verifiziere dein Profil, um einen Checkmark neben deinem Namen zu erhalten. So zeigst du,
					dass deine Veranstaltungen wirklich von dir kommen.
				</p>

				<form method="POST" action="?/requestVerification" class="mb-4">
					<Button type="submit" variant="secondary">Verifizierung beantragen</Button>
				</form>

				{#if form?.verificationError}
					<p class="mb-4 text-sm text-red-600">{form.verificationError}</p>
				{/if}

				{#if showVerificationCode && verificationCode}
					<div class="mb-4 rounded border border-blue-200 bg-blue-50 p-4">
						<p class="mb-2 text-sm font-semibold">Dein Verifizierungs-Code:</p>
						<p class="mb-4 font-mono text-lg font-bold tracking-widest">{verificationCode}</p>
						<p class="text-sm text-text">
							Sende diesen Code an <strong>@dorfpartys</strong> auf
							<strong>Instagram</strong> oder <strong>TikTok</strong>, oder schreib eine E-Mail an
							<strong>verifizierung@dorfpartys.com</strong> (von einer der oben hinterlegten Adressen).
						</p>
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	{#if data.links.length > 0}
		<h2>Weitere Links</h2>
		<ul class="mt-3 flex flex-wrap gap-3">
			{#each data.links as link (link.id)}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- externe, selbst gepflegte URL, kein interner Route -->
					<a
						class="inline-block border border-border px-3.5 py-2 text-text no-underline hover:border-primary hover:text-primary"
						href={link.url}>{link.label}</a
					>
				</li>
			{/each}
		</ul>
	{/if}
</div>

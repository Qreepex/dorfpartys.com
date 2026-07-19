<script lang="ts">
	import { resolve } from '$app/paths';
	import '$lib/components/form-field.css';
	import { Button, FormGrid, TextInput, Toggle } from '$lib/components/index.js';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const organizerHref = $derived(
		data.profile?.slug ? resolve('/veranstalter/[slug]', { slug: data.profile.slug }) : null
	);
</script>

<svelte:head>
	<title>Mein Profil — dorfpartys.com</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="max-w-[70ch]">
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

	<form method="POST" class="grid gap-6">
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
				Nur mit öffentlichem Profil bist du unter deiner Veranstalter-Seite auffindbar — und nur
				dann kannst du Veranstaltungen eintragen. Standardmäßig ist dein Profil privat.
			</p>
		</div>

		<Button type="submit">Speichern</Button>
	</form>

	{#if data.links.length > 0}
		<h2 class="mt-10 text-[1.3rem]">Weitere Links</h2>
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

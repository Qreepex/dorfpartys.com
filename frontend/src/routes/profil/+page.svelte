<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const organizerHref = $derived(
		data.profile?.slug ? resolve('/veranstalter/[slug]', { slug: data.profile.slug }) : null
	);
</script>

<h1>Mein Profil</h1>

{#if form?.success}
	<p>Profil gespeichert.</p>
{/if}

{#if organizerHref}
	<p>
		Deine öffentliche Veranstalter-Seite:
		<a href={organizerHref}>dorfpartys.com{organizerHref}</a>
	</p>
{:else}
	<p>Sobald du einen Anzeigenamen speicherst, bekommst du eine eigene öffentliche Veranstalter-Seite.</p>
{/if}

<form method="POST">
	<label>
		Anzeigename
		<input type="text" name="displayName" maxlength="80" value={data.profile?.displayName ?? ''} />
	</label>
	{#if form?.fieldErrors?.displayName}<p>{form.fieldErrors.displayName[0]}</p>{/if}

	<label>
		Website
		<input type="url" name="websiteUrl" value={data.profile?.websiteUrl ?? ''} />
	</label>

	<label>
		Instagram
		<input type="url" name="instagramUrl" value={data.profile?.instagramUrl ?? ''} />
	</label>

	<label>
		Bio
		<textarea name="bio" maxlength="2000">{data.profile?.bio ?? ''}</textarea>
	</label>

	<button type="submit">Speichern</button>
</form>

{#if data.links.length > 0}
	<h2>Weitere Links</h2>
	<ul>
		{#each data.links as link (link.id)}
			<li>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- externe, selbst gepflegte URL, kein interner Route -->
				<a href={link.url}>{link.label}</a>
			</li>
		{/each}
	</ul>
{/if}

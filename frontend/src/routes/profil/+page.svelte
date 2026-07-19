<script lang="ts">
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<h1>Mein Profil</h1>

{#if form?.success}
	<p>Profil gespeichert.</p>
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
			<li><a href={link.url}>{link.label}</a></li>
		{/each}
	</ul>
{/if}

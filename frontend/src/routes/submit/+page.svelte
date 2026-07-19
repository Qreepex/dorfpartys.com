<script lang="ts">
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<h1>Event einreichen</h1>

{#if form?.success}
	<p>Danke! Dein Event wurde zur redaktionellen Prüfung eingereicht.</p>
{/if}
{#if form?.error}
	<p>{form.error}</p>
{/if}

<form method="POST">
	<label>
		Titel
		<input type="text" name="title" required minlength="3" maxlength="140" />
	</label>
	{#if form?.fieldErrors?.title}<p>{form.fieldErrors.title[0]}</p>{/if}

	<label>
		Beschreibung
		<textarea name="description" required minlength="10" maxlength="5000"></textarea>
	</label>
	{#if form?.fieldErrors?.description}<p>{form.fieldErrors.description[0]}</p>{/if}

	<label>
		Start
		<input type="datetime-local" name="startDate" required />
	</label>

	<label>
		Ende
		<input type="datetime-local" name="endDate" required />
	</label>
	{#if form?.fieldErrors?.endDate}<p>{form.fieldErrors.endDate[0]}</p>{/if}

	<label>
		Bundesland
		<select name="bundeslandId" required>
			<option value="" disabled selected>Bitte wählen</option>
			{#each data.bundeslaenderByCountry as group (group.country)}
				<optgroup label={group.country.toUpperCase()}>
					{#each group.bundeslaender as bl (bl.id)}
						<option value={bl.id}>{bl.name}</option>
					{/each}
				</optgroup>
			{/each}
		</select>
	</label>

	<label>
		Kreis
		<select name="kreisId" required>
			<option value="" disabled selected>Bitte wählen</option>
			{#each data.bundeslaenderByCountry as group (group.country)}
				{#each group.bundeslaender as bl (bl.id)}
					<optgroup label={bl.name}>
						{#each bl.kreise as k (k.id)}
							<option value={k.id}>{k.name}</option>
						{/each}
					</optgroup>
				{/each}
			{/each}
		</select>
	</label>
	{#if form?.error}<p>{form.error}</p>{/if}

	<label>
		Party-Art
		<select name="partyArtId" required>
			<option value="" disabled selected>Bitte wählen</option>
			{#each data.partyArten as art (art.id)}
				<option value={art.id}>{art.name}</option>
			{/each}
		</select>
	</label>

	<label>
		Adresse (Freitext)
		<input type="text" name="addressDescription" required minlength="3" maxlength="300" />
	</label>

	<label>
		Farbe
		<input type="color" name="customColor" value="#ff6b35" />
	</label>

	<label>
		Preis (optional)
		<input type="text" name="priceInfo" maxlength="200" />
	</label>

	<label>
		Mindestalter (optional)
		<input type="number" name="minAge" min="0" max="99" />
	</label>

	<label>
		<input type="checkbox" name="allowsMuttizettel" /> Muttizettel akzeptiert
	</label>

	<label>
		<input type="checkbox" name="isOutdoor" /> Open Air
	</label>

	<button type="submit">Einreichen</button>
</form>

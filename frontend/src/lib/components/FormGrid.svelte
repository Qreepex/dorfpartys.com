<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Anzahl Spalten ab dem `sm`-Breakpoint (mobil immer einspaltig). */
		columns?: 2 | 3;
		children: Snippet;
	}

	let { columns = 2, children }: Props = $props();

	const columnsClass = $derived(columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2');
</script>

<!--
	Wiederverwendbares Formular-Grid (z.B. /profil, /veranstaltung-eintragen).
	Felder, die die volle Breite brauchen (Titel, Beschreibung, Adresse), auf dem
	jeweiligen Feld selbst mit `class="sm:col-span-full"` markieren.
-->
<div class="grid gap-5 {columnsClass}">
	{@render children()}
</div>

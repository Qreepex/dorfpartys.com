<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<!--
	Kompakter rechtlicher Hinweis für öffentliche Event-/Filterseiten (Haftungsausschluss,
	keine Veranstalter-Eigenschaft, keine Gewähr, keine Haftung für externe Links). Bewusst als
	eingeklapptes <details> umgesetzt, damit der Hinweis nicht optisch mit dem eigentlichen Content
	konkurriert - vollständige Regelungen stehen in /nutzungsbedingungen, hier nur die Kurzfassung.
-->
<details class="legal-disclaimer mt-10 border border-border bg-bg-alt p-4 text-[0.8rem] text-muted">
	<summary class="cursor-pointer font-semibold text-text select-none">Rechtlicher Hinweis</summary>
	<p class="mt-2 mb-0 leading-relaxed">
		dorfpartys.com ist nicht der Veranstalter der hier gelisteten Events - alle Entscheidungen vor
		Ort obliegen ausschließlich dem jeweiligen Veranstalter. Wir übernehmen keine Verantwortung oder
		Haftung für Schäden, Unfälle oder sonstige Vorkommnisse im Zusammenhang mit den Veranstaltungen,
		keine Gewähr für die Richtigkeit der Angaben auf dieser Seite und keine Verantwortung für
		Inhalte verlinkter externer Seiten. Ausführliche Regelungen in unseren
		<a class="text-primary hover:underline" href={resolve('/nutzungsbedingungen')}
			>Nutzungsbedingungen</a
		>.
	</p>
</details>

<style>
	.legal-disclaimer summary::-webkit-details-marker {
		display: none;
	}

	.legal-disclaimer summary {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.legal-disclaimer summary::before {
		content: '▸';
		display: inline-block;
		transition: transform 0.15s;
	}

	.legal-disclaimer[open] summary::before {
		transform: rotate(90deg);
	}
</style>

<script lang="ts">
	import { SITE_URL } from '@dorfpartys/shared';

	const canonical = `${SITE_URL}/nutzungsbedingungen`;
</script>

<svelte:head>
	<title>Nutzungsbedingungen — dorfpartys.com</title>
	<meta
		name="description"
		content="Nutzungsbedingungen für die kostenlose Event-Eintragung und -Suche auf dorfpartys.com."
	/>
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href={canonical} />
</svelte:head>

<article class="legal">
	<h1>Nutzungsbedingungen</h1>

	<p class="notice">
		Platzhalter — bitte vor dem Livegang durch rechtsverbindliche Nutzungsbedingungen ersetzen.
	</p>

	<h2>Leistungsbeschreibung</h2>
	<p>
		dorfpartys.com ist eine kostenlose, werbefreie Plattform zum Finden und Eintragen von lokalen
		Partys und Volksfesten im DACH-Raum. Die Nutzung ist für Besucher:innen und Veranstalter:innen
		vollständig kostenlos.
	</p>

	<h2>Einreichung von Events</h2>
	<p>
		Wer ein Event einreicht, versichert, dass die Angaben wahrheitsgemäß sind und die hochgeladenen
		Fotos entweder selbst erstellt wurden oder deren Nutzung berechtigt ist. Jede Einreichung
		durchläuft vor Veröffentlichung eine redaktionelle Prüfung. dorfpartys.com behält sich vor,
		Einreichungen ohne Angabe von Gründen abzulehnen oder zu entfernen.
	</p>

	<h2>Keine Gewähr</h2>
	<p>
		Für die Richtigkeit, Vollständigkeit und Aktualität der von Dritten eingereichten
		Veranstaltungsangaben (Termine, Preise, Ort) wird keine Gewähr übernommen. Bitte prüfe wichtige
		Angaben vor Antritt einer Veranstaltung direkt beim Veranstalter.
	</p>

	<h2>Rechteverletzungen</h2>
	<p>
		Bei Hinweisen auf Urheberrechts- oder sonstige Rechtsverletzungen wende dich an
		[kontakt@dorfpartys.com]; die betroffenen Inhalte werden nach Prüfung entfernt.
	</p>

	<h2>Änderungen</h2>
	<p>
		Diese Nutzungsbedingungen können bei Weiterentwicklung der Plattform angepasst werden. Die
		jeweils aktuelle Fassung ist unter dieser URL abrufbar.
	</p>
</article>

<style>
	.legal {
		max-width: 68ch;
	}
	.notice {
		border-left: 3px solid var(--color-secondary);
		padding-left: 12px;
		color: var(--color-muted);
		font-size: 0.9rem;
	}
	.legal h2 {
		margin-top: 32px;
		font-size: 1.2rem;
	}
</style>

<script lang="ts">
	import { SITE_URL } from '@dorfpartys/shared';

	const canonical = `${SITE_URL}/datenschutz`;
</script>

<svelte:head>
	<title>Datenschutz — dorfpartys.com</title>
	<meta
		name="description"
		content="Datenschutzerklärung: dorfpartys.com ist werbefrei und verzichtet auf Tracking durch Dritte."
	/>
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href={canonical} />
</svelte:head>

<article class="legal">
	<h1>Datenschutz</h1>

	<p class="notice">
		Platzhalter — bitte vor dem Livegang durch eine vollständige, rechtsverbindliche
		Datenschutzerklärung (Art. 13/14 DSGVO) ersetzen.
	</p>

	<h2>Grundsatz</h2>
	<p>
		dorfpartys.com ist werbefrei und finanziert sich nicht über Tracking oder den Verkauf von
		Nutzerdaten. Es werden ausschließlich Daten verarbeitet, die für den Betrieb der Plattform
		notwendig sind.
	</p>

	<h2>Server-Logs</h2>
	<p>
		Beim Aufruf der Website werden technisch notwendige Zugriffsdaten (IP-Adresse, Zeitstempel,
		aufgerufene URL, User-Agent) für einen begrenzten Zeitraum zur Absicherung des Betriebs
		verarbeitet.
	</p>

	<h2>Konto &amp; Anmeldung</h2>
	<p>
		Die Anmeldung erfolgt über Single Sign-On (Authentik) mit Login ausschließlich über die von dir
		gewählten Anbieter (z. B. Google, Discord, Facebook). Es werden nur die für den Betrieb deines
		Kontos notwendigen Daten (E-Mail-Adresse, Rolle) gespeichert.
	</p>

	<h2>Eingereichte Events &amp; Profile</h2>
	<p>
		Von dir eingereichte Event- und Profildaten (inkl. hochgeladener Fotos) werden zur Anzeige auf
		der Plattform gespeichert und, nach redaktioneller Prüfung, öffentlich angezeigt. Fotos werden
		über einen S3-kompatiblen Objektspeicher ausgeliefert.
	</p>

	<h2>Cookies</h2>
	<p>
		Es werden ausschließlich technisch notwendige Cookies zur Aufrechterhaltung deiner
		Anmeldesitzung gesetzt — keine Analyse- oder Marketing-Cookies.
	</p>

	<h2>Deine Rechte</h2>
	<p>
		Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung deiner
		Daten sowie auf Datenübertragbarkeit. Wende dich dazu an [kontakt@dorfpartys.com].
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

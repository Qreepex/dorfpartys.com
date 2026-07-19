<script lang="ts">
	import { SITE_URL } from '@dorfpartys/shared';

	const canonical = `${SITE_URL}/impressum`;
</script>

<svelte:head>
	<title>Impressum — dorfpartys.com</title>
	<meta name="description" content="Anbieterkennzeichnung nach § 5 TMG für dorfpartys.com." />
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href={canonical} />
</svelte:head>

<article class="legal">
	<h1>Impressum</h1>

	<p class="notice">
		Platzhalter — bitte vor dem Livegang durch die tatsächlichen Anbieterangaben nach § 5 TMG
		ersetzen.
	</p>

	<h2>Angaben gemäß § 5 TMG</h2>
	<p>
		[Name des Betreibers / Firma]<br />
		[Straße und Hausnummer]<br />
		[PLZ und Ort]<br />
		[Land]
	</p>

	<h2>Kontakt</h2>
	<p>
		E-Mail: [kontakt@dorfpartys.com]<br />
		Telefon: [Telefonnummer, sofern erforderlich]
	</p>

	<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
	<p>[Name, Anschrift wie oben]</p>

	<h2>Streitschlichtung</h2>
	<p>
		Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
		<a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer"
			>https://ec.europa.eu/consumers/odr/</a
		>. Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
		Verbraucherschlichtungsstelle teilzunehmen.
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

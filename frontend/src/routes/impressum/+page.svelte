<script lang="ts">
	import { SITE_URL } from '@dorfpartys/shared';

	const canonical = `${SITE_URL}/impressum`;
</script>

<svelte:head>
	<title>Impressum | dorfpartys.com</title>
	<meta name="description" content="Anbieterkennzeichnung nach § 5 TMG für dorfpartys.com." />
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href={canonical} />
</svelte:head>

<main class="mx-auto max-w-[90ch]">
	<h1>Impressum</h1>

	<h2>Angaben gemäß § 5 TMG</h2>
	<p>
		Ben Schiemann<br />
		Reinbeker Weg 70<br />
		21465 Wentorf bei Hamburg<br />
		Deutschland
	</p>

	<h2>Kontakt</h2>
	<p>
		E-Mail: <a href="mailto:info@dorfpartys.com">info@dorfpartys.com</a><br />
		Telefon: +49 1516 4877269
	</p>

	<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
	<p>Ben Schiemann, Anschrift wie oben</p>

	<h2>Streitschlichtung</h2>
	<p>
		Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
		<a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer"
			>https://ec.europa.eu/consumers/odr/</a
		>. Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
		Verbraucherschlichtungsstelle teilzunehmen.
	</p>
</main>

<style>
	p {
		text-align: justify;
	}
</style>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { FaqList } from '$lib/components/index.js';
	import { FAQ_ENTRIES } from '$lib/content/faq.js';
	import { buildFaqJsonLd, jsonLdScriptTag } from '$lib/seo.js';
	import { SITE_URL } from '@dorfpartys/shared';

	const canonical = `${SITE_URL}/faq`;
	const faqJsonLd = buildFaqJsonLd(FAQ_ENTRIES);
</script>

<svelte:head>
	<title>Häufig gestellte Fragen (FAQ) | dorfpartys.com</title>
	<meta
		name="description"
		content="Alle Antworten zu dorfpartys.com: kostenlos Veranstaltungen eintragen, Schützenfeste und Zeltfeten finden, Veranstalter-Profile, Datenschutz und mehr."
	/>
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Häufig gestellte Fragen - dorfpartys.com" />
	<meta property="og:url" content={canonical} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScriptTag(faqJsonLd)}
</svelte:head>

<article>
	<header>
		<h1>Häufig gestellte Fragen</h1>
		<p class="text-lg text-muted">
			Alles rund um kostenloses Eintragen und Finden von Dorfpartys, Schützenfesten, Zeltfeten und
			mehr im DACH-Raum.
		</p>
	</header>

	<div class="mt-8">
		<FaqList items={FAQ_ENTRIES} />
	</div>

	<p class="mt-10 text-muted">
		Noch Fragen offen? Schau dir <a class="text-primary" href={resolve('/')}>die Startseite</a>
		an oder
		<a class="text-primary" href={resolve('/veranstaltung-eintragen')}
			>trag direkt deine Veranstaltung ein</a
		>.
	</p>
</article>

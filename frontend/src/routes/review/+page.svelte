<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, VerifiedBadge } from '$lib/components/index.js';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// startDate/endDate sind optional (AGENTS.md 5, "Quantität über Qualität") -
	// Moderator:innen sollen trotzdem eine plausible Aussage sehen statt eines
	// "Invalid Date"-Strings.
	function formatRange(startInput: string | Date | null, endInput: string | Date | null) {
		if (!startInput) return 'Termin folgt';
		const start = new Date(startInput);
		const startStr = start.toLocaleString('de-DE', {
			weekday: 'short',
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
		if (!endInput) return startStr;
		const end = new Date(endInput);
		const sameDay = start.toDateString() === end.toDateString();
		const endStr = end.toLocaleString('de-DE', {
			...(sameDay ? {} : { day: '2-digit', month: '2-digit', year: 'numeric' }),
			hour: '2-digit',
			minute: '2-digit'
		});
		return `${startStr} – ${endStr}`;
	}
</script>

<svelte:head>
	<title>Events | Review | dorfpartys.com</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="max-w-6xl">
	<h1>Review-Dashboard</h1>

	<nav class="mb-6 flex flex-wrap gap-3">
		<a href={resolve('/review')} class="font-semibold text-primary">Events</a>
		<a href={resolve('/review/verification')} class="font-semibold text-primary">Verifizierung</a>
		<a href={resolve('/review/claims')} class="font-semibold text-primary">Event-Claims</a>
		<a href={resolve('/review/organizer-nominations')} class="font-semibold text-primary"
			>Organizer-Bestätigungen</a
		>
		<a href={resolve('/review/account-claims')} class="font-semibold text-primary">Profil-Claims</a>
		<a href={resolve('/review/ghost-accounts')} class="font-semibold text-primary">Ghost-Accounts</a
		>
		<a href={resolve('/review/reports')} class="font-semibold text-primary">Reports</a>
	</nav>

	<h2>Zur Prüfung anstehende Veranstaltungen</h2>

	{#if form?.error}
		<p class="mb-4 border border-secondary bg-bg-alt p-4 text-secondary">{form.error}</p>
	{/if}

	{#if data.events.length === 0}
		<p class="text-muted">Aktuell keine Einreichungen zur Prüfung.</p>
	{:else}
		<ul class="flex flex-col gap-6">
			{#each data.events as event (event.id)}
				{@const organizerHref = event.organizerSlug
					? resolve('/veranstalter/[slug]', { slug: event.organizerSlug })
					: null}
				<li class="bg-card border border-border p-5">
					<div class="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
						<div>
							<h3 class="text-lg font-semibold">{event.title}</h3>
							<p class="mt-1 text-[0.9rem] text-muted">
								{formatRange(event.startDate, event.endDate)}
							</p>
						</div>
						<span
							class="shrink-0 border border-border px-2.5 py-1 text-[0.75rem] font-semibold tracking-[0.06em] text-muted uppercase"
						>
							{event.status}
						</span>
					</div>

					<div class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
						<!-- Left: content -->
						<div>
							<h4 class="text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">
								Beschreibung
							</h4>
							{#if event.description}
								<p class="mt-1 leading-relaxed whitespace-pre-line">{event.description}</p>
							{:else}
								<p class="mt-1 text-muted italic">(keine Beschreibung)</p>
							{/if}

							<h4 class="mt-5 text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">
								Fotos
							</h4>
							{#if event.photos.length > 0}
								<div class="mt-2 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
									{#each event.photos as photo (photo.id)}
										<!-- rel="external": S3-Objekt-URL (speicher.dorfpartys.com), kein interner Route -->
										<a href={photo.url} target="_blank" rel="external noopener noreferrer">
											<img
												class="aspect-4/3 w-full border border-border object-cover"
												src={photo.url}
												alt={event.title}
												loading="lazy"
											/>
										</a>
									{/each}
								</div>
							{:else}
								<p class="mt-1 text-muted italic">Keine Fotos hochgeladen.</p>
							{/if}

							<h4 class="mt-5 text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">
								Links
							</h4>
							{#if event.links.length > 0}
								<ul class="mt-2 flex flex-wrap gap-2">
									{#each event.links as link (link.id)}
										<li>
											<!-- rel="external": externe, vom Veranstalter gepflegte URL -->
											<a
												class="inline-block border border-border px-3 py-1.5 text-[0.85rem] text-text no-underline hover:border-primary hover:text-primary"
												href={link.url}
												target="_blank"
												rel="external noopener noreferrer ugc">{link.label}</a
											>
										</li>
									{/each}
								</ul>
							{:else}
								<p class="mt-1 text-muted italic">Keine Links angegeben.</p>
							{/if}

							{#if event.tags.length > 0}
								<h4
									class="mt-5 text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase"
								>
									Tags
								</h4>
								<ul class="mt-2 flex flex-wrap gap-2">
									{#each event.tags as tag (tag)}
										<li class="border border-border bg-bg-alt px-2.5 py-1 text-[0.8rem]">{tag}</li>
									{/each}
								</ul>
							{/if}
						</div>

						<!-- Right: structured details -->
						<div class="flex flex-col gap-4">
							<dl class="space-y-3 text-[0.9rem]">
								<div>
									<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Ort</dt>
									<dd class="mt-0.5 font-semibold">
										{event.kreisName ?? '–'}, {event.bundeslandName ?? '–'}
									</dd>
									<dd class="mt-0.5 text-muted">{event.addressDescription}</dd>
								</div>
								<div>
									<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Party-Art</dt>
									<dd class="mt-0.5 font-semibold">{event.partyArtName ?? '–'}</dd>
								</div>
								<div>
									<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Veranstalter</dt>
									<dd class="mt-0.5 flex items-center gap-1.5 font-semibold">
										{#if organizerHref}
											<a
												class="text-text no-underline hover:text-primary"
												href={organizerHref}
												target="_blank">{event.organizerDisplayName ?? 'Unbenannt'}</a
											>
										{:else}
											{event.organizerDisplayName ?? 'Unbenannt'}
										{/if}
										{#if event.organizerVerified}
											<VerifiedBadge title="Verifizierter Veranstalter" />
										{/if}
									</dd>
									{#if !event.organizerConfirmed}
										<dd class="mt-0.5 text-[0.8rem] text-secondary">
											Organizer-Nominierung noch nicht bestätigt
										</dd>
									{/if}
								</div>
								{#if event.priceInfo}
									<div>
										<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Preis</dt>
										<dd class="mt-0.5 font-semibold">{event.priceInfo}</dd>
									</div>
								{/if}
								{#if event.minAge}
									<div>
										<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">
											Mindestalter
										</dt>
										<dd class="mt-0.5 font-semibold">{event.minAge} Jahre</dd>
									</div>
								{/if}
								{#if event.allowsMuttizettel}
									<div>
										<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">
											Muttizettel
										</dt>
										<dd class="mt-0.5 font-semibold">erforderlich</dd>
									</div>
								{/if}
								<div>
									<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Farbe</dt>
									<dd class="mt-0.5 flex items-center gap-2">
										<span
											class="inline-block h-4 w-4 shrink-0 border border-border"
											style={`background-color: ${event.customColor}`}
										></span>
										<span class="font-mono text-[0.8rem]">{event.customColor}</span>
									</dd>
								</div>
								{#if event.customFields && Object.keys(event.customFields).length > 0}
									<div>
										<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">
											Zusatzfelder
										</dt>
										<dd class="mt-0.5 font-mono text-[0.8rem] whitespace-pre-wrap">
											{JSON.stringify(event.customFields, null, 2)}
										</dd>
									</div>
								{/if}
							</dl>

							<div class="flex flex-col gap-2 border-t border-border pt-4">
								<form method="POST" action="?/approve">
									<input type="hidden" name="id" value={event.id} />
									<Button type="submit" variant="secondary" fullWidth>✓ Freigeben</Button>
								</form>
								<form method="POST" action="?/reject">
									<input type="hidden" name="id" value={event.id} />
									<Button type="submit" variant="ghost" fullWidth style="color: #dc2626;"
										>✕ Ablehnen</Button
									>
								</form>
							</div>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</main>

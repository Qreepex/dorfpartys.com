<script lang="ts">
	import { Button, DropdownSelect, FormGrid, TextInput } from '$lib/components/index.js';
	import {
		CONTENT_CATEGORIES,
		REPORT_TYPES,
		SUBJECT_TYPES,
		type ReportType,
		type SubjectType
	} from '@dorfpartys/shared';
	import type { ActionData, PageData } from './$types.js';

	let { form } = $props<{ data: PageData; form: ActionData | undefined }>();

	let selectedType = $state<ReportType>('normal');
	let selectedSubjectType = $state<SubjectType>('event');
	let url = $state('');
	let description = $state('');
	let subjectId = $state('');
	let reporterEmail = $state('');
	let reporterName = $state('');
	let copyrightHolder = $state('');
	let copyrightOwnerName = $state('');
	let illegalContentType = $state('');
	let specificLegalViolation = $state('');
	let illegalContentCategory = $state<
		'hate_speech' | 'defamation' | 'incitement_violence' | 'discrimination' | 'other'
	>('hate_speech');
	let legalBasis = $state('');
	let country = $state<'de' | 'at' | 'ch'>('de');

	const typeConfig = $derived(REPORT_TYPES[selectedType as keyof typeof REPORT_TYPES]);
	const requiresEmail = $derived(typeConfig?.requiresEmail || false);

	const reportTypeOptions = $derived(
		Object.entries(REPORT_TYPES).map(([key, config]) => ({
			value: key,
			label: config.label
		}))
	);

	const subjectTypeOptions = $derived(
		Object.entries(SUBJECT_TYPES).map(([key, label]) => ({
			value: key,
			label
		}))
	);

	const contentCategoryOptions = $derived(
		Object.entries(CONTENT_CATEGORIES).map(([key, label]) => ({
			value: key,
			label
		}))
	);
</script>

<main class="mx-auto max-w-[90ch]">
	<header class="mb-8">
		<h1>Inhalte melden / entfernen</h1>
		<p class="text-muted">
			Wenn Sie Inhalte auf dorfpartys.com entdecken, die gegen unsere Nutzungsbedingungen verstoßen
			oder rechtswidrig sind, können Sie diese hier melden. Wir werden Ihren Bericht überprüfen und
			angemessen reagieren.
		</p>
	</header>

	{#if form?.success}
		<div class="mb-8 border border-primary bg-bg-alt p-4">
			<p class="font-semibold">✓ Bericht eingereicht</p>
			<p class="mt-1">{form.message}</p>
			{#if form.ticketNumber}
				<p class="mt-2 text-sm text-muted">
					<strong>Ticketnummer:</strong>
					{form.ticketNumber}
				</p>
			{/if}
		</div>
	{:else}
		<form method="POST" action="?/submit">
			{#if form?.error}
				<div class="mb-6 border border-secondary bg-bg-alt p-4 text-secondary">
					{form.error}
				</div>
			{/if}

			<FormGrid>
				<div class="sm:col-span-full">
					<DropdownSelect
						label="Berichtstyp"
						name="type"
						bind:value={selectedType}
						options={reportTypeOptions}
						required
					/>
					{#if typeConfig}
						<p class="mt-1 text-sm text-muted">{typeConfig.description}</p>
					{/if}
				</div>

				{#if selectedType === 'own_event_takedown'}
					<div class="mb-6 border-l-4 border-primary bg-bg-alt p-4 sm:col-span-full">
						<p class="text-sm font-semibold">
							Wir nehmen das ernst und entfernen den Eintrag so schnell wie möglich, sobald die
							Meldung bestätigt ist. Sollte Ihre Veranstaltung zu Unrecht hier gelandet sein,
							entschuldigen wir uns für die Unannehmlichkeiten.
						</p>
						<p class="mt-3 text-sm">
							Da über dieses Formular allein jede Person behaupten könnte, Veranstalter:in einer
							beliebigen Party zu sein, reicht das Absenden dieses Berichts <strong
								>nicht automatisch</strong
							>
							zur Löschung aus. Bitte bestätigen Sie zusätzlich außerhalb dieses Formulars, dass Sie wirklich
							der/die Veranstalter:in sind - entweder per kurzer Nachricht auf
							<a
								href="https://www.instagram.com/dorfpartys"
								target="_blank"
								rel="noopener noreferrer"
								class="text-primary underline">Instagram</a
							>
							oder per E-Mail an
							<a href="mailto:report@dorfpartys.com" class="text-primary underline"
								>report@dorfpartys.com</a
							>, jeweils mit Bezug auf die betroffene Veranstaltung (z.B. Link/URL). Erst nach
							dieser Bestätigung können wir den Eintrag entfernen.
						</p>
					</div>
				{/if}

				<DropdownSelect
					label="Art des Inhalts"
					name="subjectType"
					bind:value={selectedSubjectType}
					options={subjectTypeOptions}
					required
				/>

				<TextInput
					label="ID des Inhalts (optional)"
					name="subjectId"
					bind:value={subjectId}
					placeholder="z.B. Event-UUID"
				/>

				<div class="sm:col-span-full">
					<TextInput
						label="URL zum Inhalt"
						name="url"
						type="url"
						bind:value={url}
						placeholder="https://..."
						required
					/>
				</div>

				<div class="sm:col-span-full">
					<label class="field-label" for="description">Beschreibung des Problems *</label>
					<textarea
						class="field-control"
						id="description"
						name="description"
						placeholder="Bitte beschreiben Sie detailliert, warum dieser Inhalt gegen unsere Richtlinien verstößt..."
						bind:value={description}
						rows={5}
						minlength={10}
						required></textarea>
					{#if description.length < 10}
						<p class="mt-1 text-sm text-muted">{description.length} / 10 Zeichen</p>
					{/if}
				</div>

				<input type="hidden" name="country" value={country} />

				{#if requiresEmail}
					<div class="mb-6 border-l-4 border-primary bg-bg-alt p-4 sm:col-span-full">
						<p class="text-sm font-semibold text-primary">
							Ihre Kontaktinformationen sind erforderlich für diesen Berichtstyp und werden gemäß
							geltendem Recht behandelt.
						</p>
					</div>

					<TextInput
						label="Ihr Name"
						name="reporterName"
						bind:value={reporterName}
						placeholder="Ihr vollständiger Name"
						required
					/>

					<TextInput
						label="Ihre E-Mail-Adresse"
						name="reporterEmail"
						type="email"
						bind:value={reporterEmail}
						placeholder="ihre@email.com"
						required
					/>
				{/if}

				{#if selectedType === 'dmca'}
					<div class="sm:col-span-full">
						<TextInput
							label="Name des Urheberrechtsinhabers"
							name="copyrightHolder"
							bind:value={copyrightHolder}
							placeholder="Name der Person oder Organisation"
							required
						/>
						<p class="mt-3 text-sm text-muted">
							Durch die Einreichung dieses Berichts bestätigen Sie, dass Sie unter Strafe der
							Meineid die Vollmacht haben, diesen Bericht im Namen des Urheberrechtsinhabers
							einzureichen.
						</p>
					</div>
				{/if}

				{#if selectedType === 'copyright'}
					<div class="sm:col-span-full">
						<TextInput
							label="Name des Urheberrechtsinhabers"
							name="copyrightOwnerName"
							bind:value={copyrightOwnerName}
							placeholder="Name der Person oder Organisation"
							required
						/>
					</div>
				{/if}

				{#if selectedType === 'dsa'}
					<TextInput
						label="Art des rechtswidrigen Inhalts"
						name="illegalContentType"
						bind:value={illegalContentType}
						placeholder="z.B. Hassrede, Verleumdung, illegale Güter"
						required
					/>

					<div class="sm:col-span-full">
						<label class="field-label" for="specificLegalViolation">
							Spezifische Gesetzverletzung *
						</label>
						<textarea
							class="field-control"
							id="specificLegalViolation"
							name="specificLegalViolation"
							placeholder="Bitte geben Sie an, welches Gesetz verletzt wurde..."
							bind:value={specificLegalViolation}
							rows={3}
							minlength={10}
							required></textarea>
					</div>
				{/if}

				{#if selectedType === 'netzdk'}
					<div class="sm:col-span-full">
						<DropdownSelect
							label="Kategorie des rechtswidrigen Inhalts"
							name="illegalContentCategory"
							bind:value={illegalContentCategory}
							options={contentCategoryOptions}
							required
						/>
						<p class="mt-3 text-sm text-muted">
							Dieser Bericht wird gemäß dem deutschen Netzwerkdurchsetzungsgesetz (NetzDG)
							bearbeitet. Die Bearbeitungsfrist beträgt normalerweise 24 Stunden.
						</p>
					</div>
				{/if}

				{#if selectedType === 'netsperrer'}
					<div class="sm:col-span-full">
						<label class="field-label" for="legalBasis-at">Rechtliche Grundlage *</label>
						<textarea
							class="field-control"
							id="legalBasis-at"
							name="legalBasis"
							placeholder="Bitte geben Sie die rechtliche Grundlage für die Meldung an..."
							bind:value={legalBasis}
							rows={3}
							required></textarea>
					</div>
				{/if}

				{#if selectedType === 'swisslaw'}
					<div class="sm:col-span-full">
						<label class="field-label" for="legalBasis-ch">Rechtliche Grundlage *</label>
						<textarea
							class="field-control"
							id="legalBasis-ch"
							name="legalBasis"
							placeholder="Bitte geben Sie die rechtliche Grundlage für die Meldung an..."
							bind:value={legalBasis}
							rows={3}
							required></textarea>
					</div>
				{/if}

				<div class="sm:col-span-full">
					<Button type="submit">Bericht einreichen</Button>
				</div>
			</FormGrid>
		</form>
	{/if}
</main>

<style>
	textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-family: inherit;
		font-size: 1rem;
		resize: vertical;
	}

	textarea:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
	}
</style>

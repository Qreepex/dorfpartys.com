import { z } from 'zod';

export const userLinkInputSchema = z.object({
	url: z.string().trim().url(),
	label: z.string().trim().min(1).max(60),
	position: z.number().int().nonnegative()
});

// AGENTS.md Abschnitt 3: Profil ist optional, kein Pflichtfeld. `isPublic` ist
// standardmäßig false - öffentliche Sichtbarkeit ist Voraussetzung fürs
// Eintragen von Veranstaltungen (AGENTS.md Abschnitt 3, events.create).
export const updateProfileInputSchema = z.object({
	displayName: z.string().trim().min(1).max(80).optional(),
	slug: z.string().trim().toLowerCase().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
	avatarS3Key: z.string().trim().min(1).optional(),
	websiteUrl: z.string().trim().url().optional(),
	instagramUrl: z.string().trim().url().optional(),
	facebookUrl: z.string().trim().url().optional(),
	tiktokUrl: z.string().trim().url().optional(),
	bio: z.string().trim().max(2000).optional(),
	isPublic: z.boolean().optional(),
	links: z.array(userLinkInputSchema).max(20).optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

// Registrierungs-/Onboarding-Formular nach dem ersten Login - im Gegensatz zu
// `updateProfileInputSchema` ist `displayName` hier verpflichtend.
// `inviteCode` ist optional (Ghost-Account-Übernahme via Einladungscode) -
// ein ungültiger/bereits verwendeter Code darf das Onboarding NICHT blockieren
// (möglichst kleine Hürde), daher hier bewusst kein strenges Format-Regex,
// nur eine Längenbegrenzung. Prüfung/Einlösung passiert serverseitig.
export const completeOnboardingInputSchema = z.object({
	displayName: z.string().trim().min(1).max(80),
	websiteUrl: z.string().trim().url().optional(),
	instagramUrl: z.string().trim().url().optional(),
	facebookUrl: z.string().trim().url().optional(),
	tiktokUrl: z.string().trim().url().optional(),
	bio: z.string().trim().max(2000).optional(),
	inviteCode: z
		.string()
		.trim()
		.toUpperCase()
		.max(20)
		.optional()
		.transform((v) => (v ? v : undefined))
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingInputSchema>;

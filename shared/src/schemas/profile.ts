import { z } from 'zod';

export const userLinkInputSchema = z.object({
	url: z.string().trim().url(),
	label: z.string().trim().min(1).max(60),
	position: z.number().int().nonnegative()
});

// AGENTS.md Abschnitt 3: Profil ist optional, kein Pflichtfeld. `isPublic` ist
// standardmäßig false — öffentliche Sichtbarkeit ist Voraussetzung fürs
// Eintragen von Veranstaltungen (AGENTS.md Abschnitt 3, events.create).
export const updateProfileInputSchema = z.object({
	displayName: z.string().trim().min(1).max(80).optional(),
	avatarS3Key: z.string().trim().min(1).optional(),
	websiteUrl: z.string().trim().url().optional(),
	instagramUrl: z.string().trim().url().optional(),
	bio: z.string().trim().max(2000).optional(),
	isPublic: z.boolean().optional(),
	links: z.array(userLinkInputSchema).max(20).optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

// Registrierungs-/Onboarding-Formular nach dem ersten Login — im Gegensatz zu
// `updateProfileInputSchema` ist `displayName` hier verpflichtend.
export const completeOnboardingInputSchema = z.object({
	displayName: z.string().trim().min(1).max(80),
	websiteUrl: z.string().trim().url().optional(),
	instagramUrl: z.string().trim().url().optional(),
	bio: z.string().trim().max(2000).optional()
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingInputSchema>;

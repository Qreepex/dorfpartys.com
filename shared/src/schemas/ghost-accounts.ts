import { z } from 'zod';

// Admin-Dashboard /review/ghost-accounts: legt einen Platzhalter-Veranstalter
// (Ghost-Account, siehe backend/src/db/schema.ts `user.isGhost`) an, für den
// der Admin sofort Veranstaltungen einpflegen kann, bevor der echte
// Veranstalter sich registriert hat.
export const createGhostAccountInputSchema = z.object({
	displayName: z.string().trim().min(1).max(80)
});

export type CreateGhostAccountInput = z.infer<typeof createGhostAccountInputSchema>;

// Erzeugt (oder ersetzt einen noch nicht eingelösten) Einladungscode für genau
// einen Ghost-Account - der Admin schickt den Code an den echten Veranstalter,
// der ihn beim Onboarding (/willkommen) eingibt (siehe
// completeOnboardingInputSchema.inviteCode).
export const generateGhostInviteCodeInputSchema = z.object({
	ghostUserId: z.string().uuid()
});

export type GenerateGhostInviteCodeInput = z.infer<typeof generateGhostInviteCodeInputSchema>;

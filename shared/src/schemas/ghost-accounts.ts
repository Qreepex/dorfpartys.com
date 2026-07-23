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

// /review/ghost-accounts/[userId]: Events eines einzelnen Ghost-Accounts, zum
// gezielten Bearbeiten/Löschen durch den Admin.
export const listGhostEventsInputSchema = z.object({
	ghostUserId: z.string().uuid()
});

export type ListGhostEventsInput = z.infer<typeof listGhostEventsInputSchema>;

// /review/ghost-accounts/[userId]: Anzeigename eines Ghost-Accounts nachträglich
// ändern (z.B. Tippfehler korrigieren, bevor der Einladungscode verschickt wird).
export const updateGhostAccountInputSchema = z.object({
	ghostUserId: z.string().uuid(),
	displayName: z.string().trim().min(1).max(80)
});

export type UpdateGhostAccountInput = z.infer<typeof updateGhostAccountInputSchema>;

// /review/ghost-accounts/[userId] und /review/duplicates: einen Ghost-Account
// endgültig löschen (nur möglich, wenn er keine Veranstaltungen mehr hat -
// siehe backend/src/routers/ghost-accounts.ts `delete`).
export const deleteGhostAccountInputSchema = z.object({
	ghostUserId: z.string().uuid()
});

export type DeleteGhostAccountInput = z.infer<typeof deleteGhostAccountInputSchema>;

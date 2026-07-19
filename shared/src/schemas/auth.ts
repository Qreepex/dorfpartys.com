import { z } from 'zod';

export const registerInputSchema = z.object({
	email: z.string().trim().toLowerCase().email(),
	password: z.string().min(8).max(128),
	name: z.string().trim().min(2).max(80)
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
	email: z.string().trim().toLowerCase().email(),
	password: z.string().min(1).max(128)
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export interface PublicUser {
	id: string;
	email: string;
	name: string;
	createdAt: string;
}

import { z } from 'zod';
import { COUNTRIES } from '../constants/index.js';

export const resolverInputSchema = z.object({
	country: z.enum(COUNTRIES),
	// Segmente nach dem Land-Segment, unklassifiziert — der Backend-Resolver
	// ordnet sie den vier kontrollierten Vokabularen zu (AGENTS.md 1.3).
	segments: z.array(z.string().trim().min(1)).max(4)
});

export type ResolverInput = z.infer<typeof resolverInputSchema>;

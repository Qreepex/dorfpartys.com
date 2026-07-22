import { z } from 'zod';
import { COUNTRIES } from '../constants/index.js';

export const resolverInputSchema = z.object({
	country: z.enum(COUNTRIES),
	// Segmente nach dem Land-Segment, unklassifiziert - der Backend-Resolver
	// ordnet sie den vier kontrollierten Vokabularen zu (AGENTS.md 1.3).
	segments: z.array(z.string().trim().min(1)).max(4)
});

export type ResolverInput = z.infer<typeof resolverInputSchema>;

// Pagination für die "Mehr laden"-Funktion auf Filter-/Suchseiten (nur
// zukünftige Events, siehe backend/src/routers/resolver.ts loadMoreEvents) -
// dieselben Segmente wie beim initialen resolve(), plus Offset für die
// nächste Seite.
export const resolverLoadMoreInputSchema = z.object({
	country: z.enum(COUNTRIES),
	segments: z.array(z.string().trim().min(1)).max(4),
	offset: z.number().int().min(0)
});

export type ResolverLoadMoreInput = z.infer<typeof resolverLoadMoreInputSchema>;

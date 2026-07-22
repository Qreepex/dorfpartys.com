// Reiner Seiteneffekt-Import: lädt `.env` (falls vorhanden) in `process.env`,
// BEVOR `sources.ts` o.ä. mit `process.env.X`-Zugriffen ausgewertet wird.
// Muss deshalb als allererster Import in jedem CLI-Entry-Point stehen
// (`index.ts`, `watchUrls.ts`) - ESM wertet Imports in Deklarationsreihenfolge
// aus, ein späterer Import von `sources.ts` sieht dann bereits die geladenen Werte.
import 'dotenv/config';

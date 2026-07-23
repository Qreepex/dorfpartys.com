// Reine String-Ähnlichkeit für die Duplikat-Erkennung (/review/duplicates) -
// kein zusätzliches Postgres-Extension (pg_trgm) oder npm-Paket nötig, die
// Datenmengen (Ghost-Accounts, Events) sind klein genug für einen einfachen
// O(n²)-Scan mit Levenshtein-Distanz in JS.

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 0; i < a.length; i++) {
    const currentRow = [i + 1];
    for (let j = 0; j < b.length; j++) {
      const insertCost = currentRow[j] + 1;
      const deleteCost = previousRow[j + 1] + 1;
      const substituteCost = previousRow[j] + (a[i] === b[j] ? 0 : 1);
      currentRow.push(Math.min(insertCost, deleteCost, substituteCost));
    }
    previousRow = currentRow;
  }

  return previousRow[b.length];
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

/**
 * Ähnlichkeit zweier Strings als Wert zwischen 0 (komplett verschieden) und 1
 * (identisch nach Normalisierung), basierend auf normalisierter
 * Levenshtein-Distanz relativ zur längeren Zeichenkette.
 */
export function similarityRatio(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);
  if (!normA && !normB) return 1;
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const distance = levenshteinDistance(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  return 1 - distance / maxLen;
}

import type { Country } from "@dorfpartys/shared";

export interface BundeslandSeed {
  slug: string;
  name: string;
  country: Country;
  // Platzhalter-Kreise/Bezirke je Bundesland — vollständiger Import ist
  // offener Punkt (AGENTS.md Abschnitt 10).
  kreise: Array<{ slug: string; name: string }>;
}

// Platzhalterdaten. Vollständiger Bundesland/Kreis-Import (z.B. Destatis/GeoNames)
// ist ein offener Punkt, siehe AGENTS.md Abschnitt 10.
export const BUNDESLAND_SEED: BundeslandSeed[] = [
  {
    slug: "schleswig-holstein",
    name: "Schleswig-Holstein",
    country: "de",
    kreise: [
      { slug: "ostholstein", name: "Ostholstein" },
      { slug: "pinneberg", name: "Pinneberg" },
      { slug: "rendsburg-eckernfoerde", name: "Rendsburg-Eckernförde" },
    ],
  },
  {
    slug: "bayern",
    name: "Bayern",
    country: "de",
    kreise: [
      { slug: "miesbach", name: "Miesbach" },
      { slug: "rosenheim", name: "Rosenheim" },
    ],
  },
  {
    slug: "baden-wuerttemberg",
    name: "Baden-Württemberg",
    country: "de",
    kreise: [
      { slug: "boeblingen", name: "Böblingen" },
      { slug: "ludwigsburg", name: "Ludwigsburg" },
    ],
  },
  { slug: "berlin", name: "Berlin", country: "de", kreise: [] },
  {
    slug: "brandenburg",
    name: "Brandenburg",
    country: "de",
    kreise: [{ slug: "oberhavel", name: "Oberhavel" }],
  },
  { slug: "bremen", name: "Bremen", country: "de", kreise: [] },
  { slug: "hamburg", name: "Hamburg", country: "de", kreise: [] },
  {
    slug: "hessen",
    name: "Hessen",
    country: "de",
    kreise: [{ slug: "main-kinzig-kreis", name: "Main-Kinzig-Kreis" }],
  },
  {
    slug: "mecklenburg-vorpommern",
    name: "Mecklenburg-Vorpommern",
    country: "de",
    kreise: [{ slug: "rostock", name: "Rostock" }],
  },
  {
    slug: "niedersachsen",
    name: "Niedersachsen",
    country: "de",
    kreise: [
      { slug: "ammerland", name: "Ammerland" },
      { slug: "harburg", name: "Harburg" },
    ],
  },
  {
    slug: "nordrhein-westfalen",
    name: "Nordrhein-Westfalen",
    country: "de",
    kreise: [
      { slug: "coesfeld", name: "Coesfeld" },
      { slug: "warendorf", name: "Warendorf" },
    ],
  },
  {
    slug: "rheinland-pfalz",
    name: "Rheinland-Pfalz",
    country: "de",
    kreise: [{ slug: "mayen-koblenz", name: "Mayen-Koblenz" }],
  },
  {
    slug: "saarland",
    name: "Saarland",
    country: "de",
    kreise: [{ slug: "saarpfalz-kreis", name: "Saarpfalz-Kreis" }],
  },
  {
    slug: "sachsen",
    name: "Sachsen",
    country: "de",
    kreise: [{ slug: "meissen", name: "Meißen" }],
  },
  {
    slug: "sachsen-anhalt",
    name: "Sachsen-Anhalt",
    country: "de",
    kreise: [{ slug: "boerde", name: "Börde" }],
  },
  {
    slug: "thueringen",
    name: "Thüringen",
    country: "de",
    kreise: [{ slug: "saale-holzland-kreis", name: "Saale-Holzland-Kreis" }],
  },

  // --- Österreich ---
  {
    slug: "wien",
    name: "Wien",
    country: "at",
    kreise: [],
  },
  {
    slug: "niederoesterreich",
    name: "Niederösterreich",
    country: "at",
    kreise: [{ slug: "mödling", name: "Mödling" }],
  },
  {
    slug: "oberoesterreich",
    name: "Oberösterreich",
    country: "at",
    kreise: [{ slug: "linz-land", name: "Linz-Land" }],
  },
  { slug: "steiermark", name: "Steiermark", country: "at", kreise: [] },
  { slug: "tirol", name: "Tirol", country: "at", kreise: [] },
  { slug: "kaernten", name: "Kärnten", country: "at", kreise: [] },
  { slug: "salzburg", name: "Salzburg", country: "at", kreise: [] },
  { slug: "vorarlberg", name: "Vorarlberg", country: "at", kreise: [] },
  { slug: "burgenland", name: "Burgenland", country: "at", kreise: [] },

  // --- Schweiz ---
  { slug: "zuerich", name: "Zürich", country: "ch", kreise: [] },
  { slug: "bern", name: "Bern", country: "ch", kreise: [] },
  { slug: "luzern", name: "Luzern", country: "ch", kreise: [] },
  { slug: "aargau", name: "Aargau", country: "ch", kreise: [] },
  { slug: "st-gallen", name: "St. Gallen", country: "ch", kreise: [] },
  { slug: "graubuenden", name: "Graubünden", country: "ch", kreise: [] },
  { slug: "thurgau", name: "Thurgau", country: "ch", kreise: [] },
];

export const PARTY_ART_EXTRA_SEED: Array<{ slug: string; name: string }> = [
  { slug: "dorffeste", name: "Dorffest" },
  { slug: "sonstiges", name: "Sonstiges" },
];

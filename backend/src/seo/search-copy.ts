import type { Country, ResolvedSeoCopy } from "@dorfpartys/shared";
import {
  buildInCountryTag,
  COUNTRY_NAMES,
  COUNTRY_NAMES_NOMINATIVE,
  SITE_NAME,
} from "@dorfpartys/shared";
import { getRegionFlavorParagraphs } from "./region-flavor.js";

export interface SearchCopyInput {
  country: Country;
  bundeslandSlug: string | null;
  bundeslandName: string | null;
  kreisName: string | null;
  artName: string | null;
  /** Slug der aufgelösten Party-Art, für den Party-Art-Flavor-Absatz (siehe `region-flavor.ts`). */
  artSlug: string | null;
  total: number;
}

/**
 * Baut pro Segment-Kombination einzigartigen SEO-Text (Title, Meta-Description,
 * H1, Intro-Absatz) aus den Klarnamen der aufgelösten Filter. Rein textuell,
 * kein DB-Zugriff - reihenfolgeunabhängig, deckt alle Kombinationen aus
 * AGENTS.md 1.2 ab (0–4 Segmente).
 */
export function buildSearchSeoCopy(input: SearchCopyInput): ResolvedSeoCopy {
  const { bundeslandName: bl, kreisName: kr, artName: art } = input;
  const ort = kr ?? bl;
  const countryIn = COUNTRY_NAMES[input.country];
  const countryNom = COUNTRY_NAMES_NOMINATIVE[input.country];

  const artLabel = art ?? "Dorfpartys";

  let subject: string;
  if (art && ort) {
    subject = `${artLabel} in ${ort}`;
  } else if (art && !ort) {
    subject = `${artLabel} in ${countryNom}`;
  } else if (!art && ort) {
    subject = `Dorfpartys in ${ort}`;
  } else {
    subject = `Dorfpartys ${buildInCountryTag(input.country)}`;
  }

  const h1 = subject;
  // Title bekommt zusätzlich das Bundesland, wenn ein Kreis aufgelöst ist
  // (z.B. "Dorfpartys in Ostholstein, Schleswig-Holstein") - der H1 bleibt
  // unverändert bei "in {ort}", da `ort` bereits auf den Kreisnamen zeigt.
  const title =
    kr && bl ? `${subject}, ${bl} | ${SITE_NAME}` : `${h1} | ${SITE_NAME}`;

  const ortSatz = kr ? `${kr} (${bl})` : (bl ?? countryIn);
  const artSatzTeil = art
    ? art
    : "Schützenfeste, Zeltfeten, Scheunenfeten und mehr";

  const description =
    input.total > 0
      ? `${input.total} ${input.total === 1 ? "Party-Termin" : "Party-Termine"}: ${artSatzTeil} in ${ortSatz}. Kostenlos, werbefrei und ohne Anmeldung durchsuchbar.`
      : `${artSatzTeil} in ${ortSatz} - aktuell noch keine Einträge. Kostenlos und werbefrei; trag dein Event ein und werde als Erste:r hier gelistet.`;

  const introParts: string[] = [];
  introParts.push(
    art
      ? `Hier findest du alle ${art} in ${ortSatz} auf einen Blick.`
      : `Hier findest du alle Dorfpartys in ${ortSatz} auf einen Blick - von Schützenfest über Zeltfete bis Scheunenfete.`,
  );
  if (input.total > 0) {
    introParts.push(
      `Aktuell ${input.total === 1 ? "ist 1 Termin" : `sind ${input.total} Termine`} eingetragen, kostenlos und ohne Werbung.`,
    );
  } else {
    introParts.push(
      "Für diese Auswahl ist noch kein Termin eingetragen - schau bald wieder vorbei oder trag die nächste Party in der Umgebung selbst ein.",
    );
  }
  const intro = introParts.join(" ");

  // Zusätzliche, regionsspezifische Absätze (Land + ggf. Bundesland/Kanton, ggf.
  // Party-Art) - Duplicate-Content-Gegenmaßnahme, siehe region-flavor.ts. Wird auf
  // Kreis-Seiten ebenfalls ausgeliefert, da ein Kreis immer ein Bundesland impliziert.
  // `ort ?? countryNom` ist derselbe spezifischste aufgelöste Name (Kreis > Bundesland
  // > Land), der oben bereits fürs `subject` (Title/H1) verwendet wird - hier wird er
  // wiederverwendet statt erneut berechnet, damit Title/H1 und Flavor-Text konsistent
  // dieselbe Region benennen.
  const regionFlavorParagraphs = getRegionFlavorParagraphs(
    input.country,
    input.bundeslandSlug,
    input.artSlug,
    ort ?? countryNom,
  );

  return { title, description, h1, intro, regionFlavorParagraphs };
}

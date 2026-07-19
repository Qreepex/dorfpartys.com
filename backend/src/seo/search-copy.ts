import type { Country, ResolvedSeoCopy } from "@dorfpartys/shared";
import { SITE_NAME } from "@dorfpartys/shared";

const COUNTRY_NAMES: Record<Country, string> = {
  de: "Deutschland",
  at: "Österreich",
  ch: "der Schweiz",
};

// Für Überschriften/Meta-Title braucht es die Nominativ-Form ohne "der".
const COUNTRY_NAMES_NOMINATIVE: Record<Country, string> = {
  de: "Deutschland",
  at: "Österreich",
  ch: "die Schweiz",
};

export interface SearchCopyInput {
  country: Country;
  bundeslandName: string | null;
  kreisName: string | null;
  artName: string | null;
  monatName: string | null;
  total: number;
}

/**
 * Baut pro Segment-Kombination einzigartigen SEO-Text (Title, Meta-Description,
 * H1, Intro-Absatz) aus den Klarnamen der aufgelösten Filter. Rein textuell,
 * kein DB-Zugriff — reihenfolgeunabhängig, deckt alle Kombinationen aus
 * AGENTS.md 1.2 ab (0–4 Segmente).
 */
export function buildSearchSeoCopy(input: SearchCopyInput): ResolvedSeoCopy {
  const { bundeslandName: bl, kreisName: kr, artName: art, monatName: monat } = input;
  const ort = kr ?? bl; // Kreis ist die spezifischste Orts-Angabe, impliziert Bundesland.
  const countryIn = COUNTRY_NAMES[input.country];
  const countryNom = COUNTRY_NAMES_NOMINATIVE[input.country];

  // Titel/H1: "[Art] in [Ort/Land]" bzw. "Dorfpartys in [Ort]" ohne Art,
  // jeweils optional mit " im [Monat]" angehängt.
  const artLabel = art ?? "Dorfpartys";
  const ortLabel = ort ?? countryNom;

  let subject: string;
  if (art && ort) {
    subject = `${artLabel} in ${ort}`;
  } else if (art && !ort) {
    subject = `${artLabel} in ${countryNom}`;
  } else if (!art && ort) {
    subject = `Dorfpartys in ${ort}`;
  } else {
    subject = `Dorfpartys in ${countryNom}`;
  }

  const zeitraum = monat ? ` im ${monat}` : "";
  const h1 = `${subject}${zeitraum}`;
  const title = `${h1} — ${SITE_NAME}`;

  const ortSatz = kr ? `${kr} (${bl})` : (bl ?? countryIn);
  const artSatzTeil = art ? art : "Schützenfeste, Zeltfeten, Scheunenfeten und mehr";
  const monatSatzTeil = monat ? ` im ${monat}` : " das ganze Jahr über";

  const description =
    input.total > 0
      ? `${input.total} ${input.total === 1 ? "Party-Termin" : "Party-Termine"}: ${artSatzTeil} in ${ortSatz}${monatSatzTeil}. Kostenlos, werbefrei und ohne Anmeldung durchsuchbar.`
      : `${artSatzTeil} in ${ortSatz}${monatSatzTeil} — aktuell noch keine Einträge. Kostenlos und werbefrei; trag dein Event ein und werde als Erste:r hier gelistet.`;

  const introParts: string[] = [];
  introParts.push(
    art
      ? `Hier findest du alle ${art} in ${ortSatz}${monatSatzTeil} auf einen Blick.`
      : `Hier findest du alle Dorfpartys in ${ortSatz}${monatSatzTeil} auf einen Blick — von Schützenfest über Zeltfete bis Scheunenfete.`,
  );
  if (input.total > 0) {
    introParts.push(
      `Aktuell ${input.total === 1 ? "ist 1 Termin" : `sind ${input.total} Termine`} eingetragen, kostenlos und ohne Werbung.`,
    );
  } else {
    introParts.push(
      "Für diese Auswahl ist noch kein Termin eingetragen — schau bald wieder vorbei oder trag die nächste Party in der Umgebung selbst ein.",
    );
  }
  const intro = introParts.join(" ");

  return { title, description, h1, intro };
}

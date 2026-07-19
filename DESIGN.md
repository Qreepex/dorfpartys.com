# DESIGN.md

Design- und Markenspezifikation für dorfpartys.com. Ergänzt `AGENTS.md` (technisches Fundament) um alles, was Aussehen und Markenidentität betrifft. Sobald die UI-Implementierung beginnt, ist dieses Dokument verbindlich - es hebt den in `AGENTS.md` Abschnitt 9 festgehaltenen Design-Ausschluss der ersten Phase auf.

Lebende Referenz: `brand-mockup.html` im Repo-Root zeigt die hier beschriebenen Prinzipien als klickbaren Prototyp (Dark/Light-Toggle oben rechts). Es ist ein Stimmungs-Prototyp, keine Produktionsvorlage - Struktur/Klassennamen sind Ausgangspunkt für die spätere Komponenten-Umsetzung in `/frontend`, nicht 1:1 zu übernehmen.

## 1. Markenkern

- **Name:** dorfpartys.com, Instagram-Handle `@dorfpartys` bereits gesichert.
- **Positionierung:** Schnittstelle aus "Dorf" (Schützenfest, Kirmes, Scheunenfete, ländliche Volksfest-Kultur) und "Party" (Nacht, Energie, Festival-Gefühl).
- **Zielgruppe:** bewusst breit, 14–40 Jahre - Design muss sowohl für Teenager als auch Ende-30-Jährige funktionieren, ohne in eine Richtung zu kippen.
- **Gestaltungsprinzip:** explizit **kein** generisches "KI-Card-und-Badge-Design" (runde Cards, Schatten, Pill-Badges). Stattdessen editoriale Poster-/Festival-Lineup-Ästhetik: Listen statt Cards, Haarlinien statt Schatten, Textlabels statt Pills.
- **Stimmung:** Nacht auf dem Dorffest - dunkle Grundfläche, warmes/knalliges Licht (Lichterketten, Glowsticks auf der Wiese), kein steriles SaaS-Dark-Mode-Blau.

## 2. Logo

**Mark:** ein minimalistischer vierstrahliger Funke (Spark), als einzelner SVG-Pfad:

```svg
<path d="M12 0 C12 6 14 10 20 12 C14 14 12 18 12 24 C12 18 10 14 4 12 C10 10 12 6 12 0 Z" fill="var(--color-primary)"/>
```

Steht für den Moment, in dem eine Party "zündet" - funktioniert eigenständig als Favicon/App-Icon (ohne Wordmark) und skaliert bis auf 16px sauber herunter.

**Wordmark:** `dorfpartys` durchgehend kleingeschrieben in Fraunces (Bold/Black), `.com` als gedämpftes Suffix in `--color-text-muted`, kleiner gesetzt. Kleinschreibung bewusst gewählt - freundlich, unaufgeregt, kein Corporate-Caps-Logo.

**Volles Logo** = Mark + Wordmark nebeneinander, siehe Header in `brand-mockup.html`.

## 3. Farbsystem

### 3.1 Brandfarben (fix, themenunabhängig)

| Rolle         | Wert      | Verwendung                                                                                                                          |
| ------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Primary       | `#39E67A` | Neon-Wiesengrün. CTAs, Logo, Akzent-Chips, Haupt-Glow. Verbindet Dorf/Wiese mit Glowstick-Party-Energie.                            |
| Secondary     | `#FF4B3E` | Kräftiges Flare-Rot. Kontrast-Akzent, Hover, zweite Lichterketten-Farbe. Grün-Rot ist die klassische Erntefest-/Kirmes-Kombination. |
| Accent (Gold) | `#FFC93D` | Lichterketten-Gold. Bewusst sparsam als Tertiär-Akzent, nicht dominant.                                                             |
| Ink           | `#0A0B09` | Fixer dunkler Text **auf** Brandfarben-Flächen - unabhängig vom aktiven Theme (siehe 3.3).                                          |

Diese vier Werte ändern sich **nicht** zwischen Dark- und Light-Theme.

### 3.2 Theme-Oberflächenfarben

| Rolle                               | Dark      | Light     |
| ----------------------------------- | --------- | --------- |
| Background                          | `#0A0B09` | `#FAF9F4` |
| Background Alt (Panels, Suchleiste) | `#16180F` | `#F1EFE6` |
| Text                                | `#FAFAF5` | `#14150F` |
| Text Muted                          | `#9C9C90` | `#6B6B60` |
| Border/Hairline                     | `#26281E` | `#DEDBCB` |

Dark ist der konzeptionelle Standardzustand (Nacht-Metapher), Light eine vollwertige Alternative - kein nachträglich aufgesetztes "Invert".

### 3.3 Kontrast-Regel: Ink-Chip statt Farbtext

`#39E67A` als Text auf hellem Hintergrund fällt unter das WCAG-Kontrastminimum. Deshalb gilt verbindlich: **Brandfarben werden nie als reiner Textfarbwert auf potenziell hellem Untergrund eingesetzt**, sondern immer als gefüllte Fläche (Button, Chip, Unterlegung) mit `--color-ink` als Textfarbe darauf. Beispiele im Mockup: der farbig unterlegte Wort-Akzent in der Headline, die Datums-Kacheln in der Event-Liste, der CTA-Button. Als reine Icon-/Linienfarbe (Logo-Mark, Lichterketten-Punkte, Tag-Border) sind die Brandfarben unproblematisch und dürfen direkt verwendet werden.

### 3.4 CSS-Custom-Properties (Referenzstruktur)

```css
:root {
  --color-primary: #39e67a;
  --color-secondary: #ff4b3e;
  --color-accent-gold: #ffc93d;
  --color-ink: #0a0b09;

  --color-bg: #0a0b09;
  --color-bg-alt: #16180f;
  --color-text: #fafaf5;
  --color-text-muted: #9c9c90;
  --color-border: #26281e;
}
:root[data-theme="light"] {
  --color-bg: #faf9f4;
  --color-bg-alt: #f1efe6;
  --color-text: #14150f;
  --color-text-muted: #6b6b60;
  --color-border: #dedbcb;
}
```

## 4. Typografie

| Rolle   | Font                                  | Einsatz                                                                                                                                                                                                |
| ------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Display | **Fraunces** (variable, `opsz`-Achse) | h1–h3, Datums-Ziffern, Wordmark. Warme, leicht schrullige Serife mit handgesetztem Charakter - bewusste Abgrenzung von der Bebas/Poppins-Kombination, die auf den meisten KI-generierten Seiten läuft. |
| Body/UI | **Inter**                             | Fließtext, Formulare, Navigation, Labels. Maximale Lesbarkeit auf Mobile, breite Sprachunterstützung inkl. Umlaute.                                                                                    |

**Hinweis für die Implementierung:** Für Produktion die Fonts **selbst hosten** statt über die Google-Fonts-CDN einzubinden (`fonts.googleapis.com`) - direktes Laden von Google Fonts überträgt IP-Adressen an Google und ist in Deutschland datenschutzrechtlich umstritten (siehe LG München I, Urteil zu Google Fonts). Für den Mockup-Prototyp ist die CDN-Einbindung okay, für `/frontend` nicht übernehmen.

## 5. Layout-Prinzipien

- **Liste statt Cards:** Event-Übersicht im Festival-Lineup-/Timetable-Stil - Zeilen, durch Haarlinien getrennt, statt Grid aus Schatten-Cards.
- **Text statt Pill-Badges:** Party-Art als kleines Textlabel mit farbiger linker Border, keine runden Pills.
- **Lichterketten-Divider:** wiederkehrendes SVG-Motiv (Wellenlinie + leuchtende Punkte) als Sektionstrenner, ersetzt klassische `<hr>`/Whitespace-Trennung.
- **Sternenhimmel-Hintergrund:** feines Punktmuster nur im Dark-Theme (Nacht-Metapher), im Light-Theme deaktiviert statt invertiert.
- **Glow statt Material-Shadow:** Akzentelemente (Logo, CTA, Lichterketten-Punkte, Hero-Wortakzent) bekommen `drop-shadow`/`box-shadow`-Glow in Brandfarbe statt der generischen grauen Drop-Shadow-Card-Optik.
- **Suchleiste als Formular, nicht als Such-Pill:** harte Trennlinien zwischen den Feldern, kein abgerundetes Pill-Input - erinnert eher an ein Festzelt-Anmeldeformular als an eine SaaS-Suchleiste.

## 6. Dark/Light-Theme-Mechanik

- Umsetzung über `data-theme="dark"|"light"` auf `<html>`, gesteuert per CSS-Custom-Properties (siehe 3.4).
- Ohne explizite Nutzerwahl folgt der Default `prefers-color-scheme`.
- Manueller Toggle (Sonne/Mond-Icon-Button) überschreibt die Systempräferenz für die Sitzung; Referenz-JS-Snippet in `brand-mockup.html`.
- Persistenz der Nutzerwahl (localStorage/Cookie) ist für die echte Implementierung zu ergänzen - im Mockup bewusst weggelassen.

## 7. Mobile / SEO / Accessibility

- Fluid Typography über `clamp()` statt fixer Breakpoint-Sprünge.
- Mobile-first: Suchleiste stapelt auf schmalen Viewports, Tap-Ziele ≥ 44px.
- Semantisches HTML (genau ein `h1` pro Seite, `header`/`main`/`section`/`footer`).
- Kein Content hinter Client-only-JS - deckt sich mit der SSR-Pflicht aus `AGENTS.md` Abschnitt 6.
- Ink-Chip-Kontrastregel (3.3) ist verbindlich, nicht optional - insbesondere für Event-Titel, Datum, Preis-/Status-Angaben.

## 8. Offene Punkte (nicht Teil dieses Dokuments)

- Icon-Set über den Spark-Mark hinaus (z. B. für Filter-UI, Formularfelder).
- Illustrations-/Leerzustand-Stil (0 Treffer, siehe Resolver-Verhalten in `AGENTS.md` 1.6).
- Component-Library-Umsetzung in SvelteKit (Buttons, Selects, Formularelemente als wiederverwendbare Bausteine).
- Bildstil-Guidelines für nutzergenerierte Event-/Profilfotos.

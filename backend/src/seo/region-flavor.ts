import type { Country } from "@dorfpartys/shared";

/**
 * Zusätzliche, pro Region individuelle Textabsätze ("Flavor-Paragraphen") für
 * Land- und Bundesland-/Kantons-Seiten.
 *
 * Hintergrund: Filter-Seiten mit wenig/keinen Events sahen sich strukturell
 * sehr ähnlich (nur der Ortsname unterscheidet sich im generischen Text aus
 * `search-copy.ts`) und wurden von Google als Duplicate Content eingestuft.
 * Diese Absätze sind bewusst **zusätzlich** zum bestehenden Intro-Text (nicht
 * als Ersatz) und sollen echten, einzigartigen Content pro Region liefern -
 * mit vollem Namen, gängigen Kurzformen/Alternativschreibweisen und (für AT/CH)
 * regionalem Wortschatz für Feste/Partys.
 *
 * Datenquelle für die Abdeckung: `backend/src/db/seed/data.ts`
 * (`BUNDESLAND_SEED`) - 16 deutsche Bundesländer, 9 österreichische
 * Bundesländer, 26 Schweizer Kantone. Jeder Slug dort hat hier einen
 * passenden Eintrag; ein Lint/Test kann das bei Bedarf gegenseitig
 * absichern (siehe `getRegionFlavorParagraphs`, das bei fehlendem Slug
 * einfach nichts zurückgibt statt zu crashen).
 */

export const COUNTRY_FLAVOR_PARAGRAPH: Record<Country, string> = {
  de: "Deutschland ist im Sommer ein einziges großes Dorffest: Von Schützenfesten in Schleswig-Holstein bis zu Wiesn und Kirchweih in Bayern feiert fast jede Gemeinde ihre eigene Zeltfete, Scheunenparty oder Stoppelfete. Egal ob du dazu Kirmes, Kerb oder einfach Dorffest sagst - auf dorfpartys.com findest du die Termine in deiner Nähe, kostenlos und ohne Anmeldung.",
  at: "In Österreich heißt eine gute Feier oft einfach Fest, manchmal auch Kirtag, Hoagascht oder Kirchtag - je nachdem, in welchem Bundesland du unterwegs bist. Von der Wiener Wiesn bis zum Kirtag im Innviertel: dorfpartys.com sammelt die schönsten Dorf- und Zeltfeste in ganz Österreich.",
  ch: "In der Schweiz nennt man das Dorffest gern Chilbi oder Fäscht - in der Romandie heißt es kermesse oder fête villageoise, im Tessin sagra. So verschieden die Sprachregionen, so bunt die Feste: dorfpartys.com bringt dir alle Chilbis, Fäschte und Zeltpartys der Schweiz auf einen Blick.",
};

/** Keyed by `bundesland.slug` aus `BUNDESLAND_SEED` (`backend/src/db/seed/data.ts`). */
export const BUNDESLAND_FLAVOR_PARAGRAPH: Record<string, string> = {
  // --- Deutschland (16) ---
  "schleswig-holstein":
    "Schleswig-Holstein, von den Einheimischen oft kurz SH genannt, liegt zwischen Nord- und Ostsee - und feiert entsprechend deftig: Schützenfeste haben hier eine jahrhundertealte Tradition, dazu kommen Zeltfeten und Hafenfeste von Flensburg bis Lübeck. Wer zwischen den Meeren unterwegs ist, findet auf dorfpartys.com die nächste Party im echten Norden.",
  hamburg:
    "Hamburg ist mehr als die Speicherstadt: Die Hansestadt (Kennzeichen HH) feiert mit dem Hamburger Dom eines der größten Volksfeste Deutschlands, dazu unzählige Stadtteil- und Hafenfeste in den Bezirken von Altona bis Bergedorf. Auf dorfpartys.com findest du die Termine abseits der großen Bühnen.",
  niedersachsen:
    "Niedersachsen, kurz Nds., ist mit seiner Fläche eines der größten Bundesländer - und entsprechend dicht gesät sind Schützenfeste, Zeltfeten und Scheunenpartys zwischen Emsland, Heidekreis und der Region Hannover. dorfpartys.com bündelt die Termine vom Wattenmeer bis zum Harz.",
  bremen:
    "Bremen, die Zwei-Städte-Hansestadt aus Bremen und Bremerhaven, feiert mit dem Freimarkt eines der ältesten Volksfeste Deutschlands - schon seit dem 14. Jahrhundert. Zwischen den großen Terminen finden sich in Bremen und Bremerhaven auch kleinere Zelt- und Scheunenfeten, die du auf dorfpartys.com entdeckst.",
  "nordrhein-westfalen":
    "Nordrhein-Westfalen, kurz NRW, ist Kirmes-Land: Vor allem im Rheinland ist die Kirmes das Herzstück des Dorf- und Stadtteillebens, im Sauer- und Münsterland dominieren dagegen Schützenfeste. dorfpartys.com zeigt dir, wo zwischen Rhein und Weser gerade gefeiert wird.",
  hessen:
    "In Hessen sagt man zur Kirchweih traditionell Kerb - ein Wort, das in kaum einem anderen Bundesland so gebräuchlich ist. Von der Bergstraße bis in den Vogelsberg wird die Kerb bis heute mit Zeltfeten und Dorffesten gefeiert, und genau die findest du auf dorfpartys.com.",
  "rheinland-pfalz":
    "Rheinland-Pfalz, kurz RLP, ist Weinland - und wo Wein wächst, wird gefeiert: Die Kerwe, die pfälzische Variante der Kirchweih, gehört hier zu den festen Terminen im Jahreskalender, dazu kommen zahllose Weinfeste zwischen Mosel und Pfalz. dorfpartys.com listet die Termine von der Südpfalz bis zum Westerwald.",
  "baden-wuerttemberg":
    "Baden-Württemberg, kurz BaWü, kennt für ein gutes Dorffest viele Namen: Im Schwäbischen trifft man sich zum Hock, andernorts zur Kerwe oder zum Straßenfest. Zwischen Bodensee und Odenwald findest du auf dorfpartys.com Zeltfeten, Scheunenpartys und Dorffeste in deiner Nähe.",
  bayern:
    "Bayern ist das Bundesland der Feste schlechthin: Neben der weltberühmten Wiesn feiert fast jeder Ort seine eigene Kirwa oder Kirchweih, dazu kommen unzählige Zeltfeten in Franken, Schwaben und Altbayern. dorfpartys.com sammelt die Termine abseits der Landeshauptstadt München.",
  saarland:
    "Das Saarland, kurz SL, ist Deutschlands kleinstes Flächenland - mit französischem Einschlag und einer eigenen Kirmes-Tradition, die dem benachbarten Lothringen und dem Rheinland gleicht. dorfpartys.com zeigt dir Zeltfeten und Dorffeste von Saarbrücken bis Saarlouis.",
  berlin:
    "Berlin feiert nicht nur in der Innenstadt: In den Bezirken von Pankow bis Neukölln haben Kiezfeste und Straßenfeste eine lange Tradition, und auch am Stadtrand gibt es waschechte Dorffeste. dorfpartys.com bringt dir die Termine aus allen zwölf Bezirken.",
  brandenburg:
    "Brandenburg umgibt die Hauptstadt wie ein grüner Ring - und hier, zwischen Prignitz und Spreewald, ist das klassische Dorffest noch echte Tradition, oft verbunden mit Feuerwehrfest oder Erntedank. dorfpartys.com zeigt dir, wo im Berliner Umland gerade gefeiert wird.",
  "mecklenburg-vorpommern":
    "Mecklenburg-Vorpommern, kurz MV, verbindet mit seiner langen Ostseeküste das Dorffest gern mit Fischer- und Hafenfesten - von Rügen bis zur Mecklenburgischen Seenplatte. dorfpartys.com sammelt die Termine zwischen Küste und Binnenland.",
  sachsen:
    "Sachsen pflegt mit dem Vogelschießen eine ganz eigene Festtradition, die dem Schützenfest anderer Bundesländer ähnelt, dazu kommen Kirmes und Zeltfeten zwischen Erzgebirge und Lausitz. dorfpartys.com zeigt dir die Termine von Dresden bis Zwickau.",
  "sachsen-anhalt":
    "Sachsen-Anhalt, das Land zwischen Harz und Elbe, feiert seine Dorf- und Erntefeste oft mit langer Tradition - viele Orte laden hier bis heute zum klassischen Schützen- oder Heimatfest. dorfpartys.com bündelt die Termine von Magdeburg bis in die Altmark.",
  thueringen:
    "Thüringen, das 'grüne Herz Deutschlands', ist bekannt für seine Bratwurst - und genauso gastfreundlich geht es auf den Kirmes- und Dorffesten zwischen Rennsteig und Saaleland zu. dorfpartys.com zeigt dir, wo in Thüringen als Nächstes gefeiert wird.",

  // --- Österreich (9) ---
  wien: "Wien, auf Wienerisch liebevoll 'Wean' genannt, feiert groß: Von der Wiener Wiesn im Prater bis zu kleinen Grätzlfesten in den Bezirken ist hier für jeden Geschmack ein Fest dabei. dorfpartys.com zeigt dir, wo in der Bundeshauptstadt gerade gefeiert wird.",
  niederoesterreich:
    "Niederösterreich, kurz NÖ, umschließt Wien wie ein Ring aus Weinbergen - und genau dort, im Weinviertel und der Wachau, ist der Kirtag bis heute ein fixer Termin im Jahreskalender. dorfpartys.com sammelt Zeltfeste und Kirtage von Amstetten bis Zwettl.",
  oberoesterreich:
    "Oberösterreich, kurz OÖ, ist Innviertel, Mühlviertel und Salzkammergut in einem - und hier trifft man sich gerne auf einen Hoagascht, ein gemütliches Beisammensein, oder auf den traditionellen Kirtag am Dorfplatz. dorfpartys.com zeigt dir die Termine zwischen Linz und dem Böhmerwald.",
  steiermark:
    "Die Steiermark, liebevoll die 'grüne Mark' genannt, feiert ihre Kirtage und Erntedankfeste mit steirischer Gemütlichkeit - vom Aufsteirern in Graz bis zu kleinen Dorffesten in der Süd- und Oststeiermark. dorfpartys.com sammelt die Termine in ganz Grün-Österreich.",
  tirol:
    "Tirol ist Bergland pur - und dort, wo im Sommer die Almen bewirtschaftet werden, gehören Bergfeste, Kirchtage und im Herbst der Almabtrieb zu den größten Festen des Jahres. dorfpartys.com zeigt dir Zeltfeste und Dorffeste von Innsbruck bis Kitzbühel.",
  kaernten:
    "Kärnten, das südlichste Bundesland rund um die Seen, feiert seine Kirchtage gern direkt am Wasser - zwischen Wörthersee und Millstätter See ist der Sommer eine einzige Festsaison. dorfpartys.com zeigt dir, wo in Kärnten gerade gefeiert wird.",
  salzburg:
    "Salzburg feiert mit dem Rupertikirtag - benannt nach dem Landespatron Rupert - eines der bekanntesten Herbstfeste Österreichs, dazu kommen unzählige kleinere Kirtage im Pongau und Pinzgau. dorfpartys.com sammelt die Termine von der Stadt Salzburg bis nach Zell am See.",
  vorarlberg:
    "Vorarlberg, ganz im Westen Österreichs, spricht einen alemannischen Dialekt, der dem der Schweiz nahesteht - hier heißt das Dorffest schon mal Kirbe, dazu kommen die berühmten Funkenfeuer im Frühjahr. dorfpartys.com zeigt dir Zeltfeste zwischen Bregenz und dem Bregenzerwald.",
  burgenland:
    "Das Burgenland, Österreichs jüngstes und östlichstes Bundesland, ist Weinland mit pannonischem Klima - Kirtag und Weinfest gehen hier oft Hand in Hand, mit kroatischen und ungarischen Einflüssen. dorfpartys.com sammelt die Termine von Eisenstadt bis zum Neusiedler See.",

  // --- Schweiz (26 Kantone) ---
  zuerich:
    "Zürich, kurz Züri, feiert seine Chilbi mit einer Tradition, die bis ins Mittelalter zurückreicht - vom Zürcher Oktoberfest bis zu kleinen Quartier-Chilbis ist zwischen Winterthur und der Stadt Zürich immer etwas los. dorfpartys.com zeigt dir, wo im Kanton Zürich gerade gefeiert wird.",
  bern: "Bern, auf Bärndütsch 'Bärn', ist die Bundesstadt - und trotzdem bodenständig: Zwischen Emmental und Berner Oberland gehört die Chilbi zum Dorfleben wie die Kuh auf die Weide. dorfpartys.com sammelt Fäschte und Zeltpartys im ganzen Kanton Bern.",
  luzern:
    "Luzern, kurz LU, am Vierwaldstättersee gelegen, ist berühmt für seine Fasnacht - aber auch im Sommer ist mit Chilbi und Seefest einiges los, von der Stadt bis ins Entlebuch. dorfpartys.com zeigt dir die Termine im Kanton Luzern.",
  uri: "Uri, der Kanton am Gotthard, ist klein, aber bei der Chilbi ganz groß: In den Dörfern zwischen Altdorf und dem Urnersee wird das Dorffest traditionell und mit viel Herzblut gefeiert. dorfpartys.com sammelt die Termine im Kanton Uri.",
  schwyz:
    "Schwyz, kurz SZ, der Namensgeber der ganzen Schweiz, feiert seine Chilbi zwischen Vierwaldstättersee und Zürichsee - von Einsiedeln bis Küssnacht ist die Festsaison hier fest im Kalender verankert. dorfpartys.com zeigt dir, wo im Kanton Schwyz gefeiert wird.",
  obwalden:
    "Obwalden, kurz OW, einer der kleinsten Kantone der Schweiz, pflegt seine dörflichen Chilbis rund um Sarnen und den Sarnersee mit viel Tradition. dorfpartys.com sammelt die Fäschte im Kanton Obwalden.",
  nidwalden:
    "Nidwalden, kurz NW, am Fuße des Stanserhorns feiert seine Chilbi gern mit Blick auf den Vierwaldstättersee - ein kleiner Kanton mit großer Festfreude. dorfpartys.com zeigt dir die Termine im Kanton Nidwalden.",
  glarus:
    "Glarus, kurz GL, bekannt für seine Landsgemeinde und die steilen Glarner Alpen, lädt zur Chilbi im Talkessel zwischen Walensee und Klausenpass. dorfpartys.com sammelt die Fäschte im Kanton Glarus.",
  zug: "Zug, kurz ZG, der kleinste Vollkanton der Schweiz, feiert am Zugersee mit ebenso viel Herz wie seine größeren Nachbarn - die Chilbi gehört hier fest zum Jahreskalender. dorfpartys.com zeigt dir, was im Kanton Zug los ist.",
  freiburg:
    "Freiburg, auf Französisch Fribourg, ist zweisprachig - und feiert entsprechend vielfältig: Neben der Chilbi ist die Bénichon, das traditionelle Freiburger Erntedankfest, einer der wichtigsten Termine im Jahr. dorfpartys.com sammelt die Feste zwischen Saane und Broye.",
  solothurn:
    "Solothurn, kurz SO, die Barockstadt an der Aare, feiert ihre Chilbi mit derselben Prise Eleganz wie ihre elf Türme und elf Kirchen - von der Stadt bis ins Gäu. dorfpartys.com zeigt dir die Termine im Kanton Solothurn.",
  "basel-stadt":
    "Basel, kurz BS, ist weit über die Region hinaus für seine Fasnacht bekannt, die 'drey scheenschte Dääg' - aber auch das restliche Jahr wird in der Stadt am Rheinknie gern gefeiert. dorfpartys.com sammelt Fäschte und Partys in Basel-Stadt.",
  "basel-landschaft":
    "Baselland, wie der Kanton Basel-Landschaft (BL) im Volksmund heißt, feiert seine Chilbis zwischen Arlesheim und dem Oberbaselbiet - ländlicher Gegenpol zur nahen Stadt Basel. dorfpartys.com zeigt dir die Termine im Baselbiet.",
  schaffhausen:
    "Schaffhausen, kurz SH, bekannt für den Rheinfall, feiert seine Chilbi mit Blick auf Europas größten Wasserfall - ein Kanton, in dem Dorffeste noch echte Tradition sind. dorfpartys.com sammelt die Termine im Kanton Schaffhausen.",
  "appenzell-ausserrhoden":
    "Appenzell Ausserrhoden, kurz AR, Heimat von Alpaufzug und Alpabzug, feiert seine Chilbi mit derselben ausgelassenen Freude wie die farbenfrohen Umzüge im Frühling und Herbst. dorfpartys.com zeigt dir die Fäschte im Appenzellerland.",
  "appenzell-innerrhoden":
    "Appenzell Innerrhoden, kurz AI, der kleinste Kanton der Schweiz mit eigener Landsgemeinde, pflegt seine Chilbi-Tradition rund um den Hauptort Appenzell mit viel Brauchtum. dorfpartys.com sammelt die Termine in Appenzell Innerrhoden.",
  "st-gallen":
    "St. Gallen, kurz SG, bekannt für die Olma und seinen Stiftsbezirk, feiert vom Rheintal bis ins Toggenburg zahlreiche Chilbis - die Sanktgaller sind fürs Feiern bekannt. dorfpartys.com zeigt dir die Termine im Kanton St. Gallen.",
  graubuenden:
    "Graubünden, kurz GR, ist der einzige dreisprachige Kanton der Schweiz - hier heißt das Fest auf Deutsch Chilbi, auf Romanisch schlicht festa, gefeiert wird von der Surselva bis ins Engadin. dorfpartys.com sammelt die Termine im ganzen Kanton Graubünden.",
  aargau:
    "Aargau, kurz AG, der 'Kanton der 1000 Schlösser', feiert seine Chilbis entlang von Aare, Reuss und Limmat - von Baden bis Zofingen ist immer irgendwo ein Dorffest. dorfpartys.com zeigt dir die Termine im Kanton Aargau.",
  thurgau:
    "Der Thurgau, kurz TG, wegen seiner Obstplantagen auch 'Mostindien' genannt, lädt zur Chilbi zwischen Bodensee und Frauenfeld - hier gehört das Dorffest zur ländlichen Tradition wie der Apfelmost. dorfpartys.com sammelt die Termine im Kanton Thurgau.",
  tessin:
    "Das Tessin, italienisch Ticino (TI), feiert seine Feste südlich der Alpen italienisch-mediterran: Statt Chilbi heißt es hier festa di paese oder sagra, oft rund um lokale Spezialitäten. dorfpartys.com zeigt dir die Termine von Bellinzona bis Lugano.",
  waadt:
    "Die Waadt, französisch Vaud (VD), feiert ihre fêtes de village zwischen Weinbergen am Genfersee und dem Jura - hier heißt das Dorffest kermesse statt Chilbi. dorfpartys.com sammelt die Termine im Kanton Waadt.",
  wallis:
    "Das Wallis, französisch Valais (VS), ist zweisprachig: Im deutschsprachigen Oberwallis feiert man die Chilbi, im französischsprachigen Unterwallis die fête villageoise - beide mit alpiner Kulisse. dorfpartys.com zeigt dir die Termine im ganzen Wallis.",
  neuenburg:
    "Neuenburg, französisch Neuchâtel (NE), lädt am gleichnamigen See zu fêtes und kermesses zwischen Uhrmacherstädtchen und Rebbergen. dorfpartys.com sammelt die Termine im Kanton Neuenburg.",
  genf: "Genf, französisch Genève (GE), ist internationale Großstadt und Kanton zugleich - und feiert seine fêtes am Ufer des Genfersees mit demselben savoir-vivre wie der Rest der Romandie. dorfpartys.com zeigt dir die Termine in und um Genf.",
  jura: "Der Jura, kurz JU, jüngster Kanton der Schweiz (gegründet 1979), ist bekannt für seine Pferdezucht und den Marché-Concours in Saignelégier - und feiert seine fêtes de village mit viel jurassischem Stolz. dorfpartys.com sammelt die Termine im Kanton Jura.",
};

/**
 * Liefert die zusätzlichen Flavor-Absätze für eine aufgelöste Filter-Kombination:
 * immer der Land-Absatz (sobald ein Country-Kontext existiert, also praktisch
 * immer), plus - falls vorhanden - der Bundesland-/Kantons-Absatz. Wird auch
 * auf Kreis-Seiten verwendet, da ein Kreis immer ein Bundesland impliziert
 * (siehe AGENTS.md 1.3/1.4) und es keinen eigenen Kreis-Absatz gibt (out of
 * scope - zu granular).
 */
export function getRegionFlavorParagraphs(
  country: Country,
  bundeslandSlug: string | null,
): string[] {
  let paragraphs: string[] = [COUNTRY_FLAVOR_PARAGRAPH[country]];

  if (bundeslandSlug) {
    const flavor = BUNDESLAND_FLAVOR_PARAGRAPH[bundeslandSlug];
    if (flavor) {
      paragraphs = [flavor];
    }
  }

  return paragraphs;
}

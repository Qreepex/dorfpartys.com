import type { FaqEntry } from '$lib/seo.js';

/**
 * Zentrale FAQ-Inhalte — sowohl für die sichtbare FAQ-Sektion (Landingpage,
 * /faq) als auch für schema.org/FAQPage JSON-LD (siehe seo.ts). Antworten
 * bewusst als vollständige, in sich verständliche Sätze formuliert (kein
 * "siehe oben"), damit sie auch isoliert von KI-Suchmaschinen zitiert werden
 * können, die nur einzelne Frage/Antwort-Paare crawlen.
 */
export const FAQ_ENTRIES: FaqEntry[] = [
	{
		question: 'Was ist dorfpartys.com?',
		answer:
			'dorfpartys.com ist die größte kostenlose Übersicht für Dorfpartys, Schützenfeste, Zeltfeten, Scheunenfeten, Stoppelfeten, Kirmes, Dorffeste und ähnliche lokale Feste in Deutschland, Österreich und der Schweiz. Jede Veranstaltung wurde von Veranstalter:innen, Vereinen oder Besucher:innen selbst eingetragen und ist nach Bundesland, Kreis, Party-Art und Monat durchsuchbar.'
	},
	{
		question: 'Ist dorfpartys.com wirklich kostenlos?',
		answer:
			'Ja, vollständig und dauerhaft. Sowohl das Durchsuchen der Veranstaltungen als auch das Eintragen eigener Events ist kostenlos — es gibt keine versteckten Kosten, keine Promotion-Gebühren und keine Bezahlfunktionen.'
	},
	{
		question: 'Wie trage ich meine Veranstaltung ein?',
		answer:
			'Unter dorfpartys.com/veranstaltung-eintragen füllst du ein Formular mit Titel, Beschreibung, Datum, Ort (Bundesland, Kreis, Adresse) und Art der Veranstaltung aus. Du kannst bis zu drei Fotos und drei Links (z.B. zu Tickets oder deiner Website) hinzufügen. Nach dem Absenden prüft unser Team den Eintrag kurz redaktionell, danach ist er öffentlich sichtbar.'
	},
	{
		question: 'Wie lange dauert die Freischaltung einer eingetragenen Veranstaltung?',
		answer:
			'Jede Einreichung durchläuft eine kurze redaktionelle Prüfung, damit die Suche verlässlich und frei von Spam bleibt. In der Regel ist ein Event innerhalb kurzer Zeit freigeschaltet und über seine eigene Seite sowie die passenden Such-Seiten (Region, Art, Monat) auffindbar.'
	},
	{
		question: 'Muss ich mich registrieren, um eine Party einzutragen?',
		answer:
			'Ja, für das Eintragen ist ein kostenloser Account nötig (Login per Discord, Google oder Facebook, kein zusätzliches Passwort). Damit lassen sich Events verwalten, ein Veranstalter-Profil mit eigener öffentlicher Seite anlegen und bereits eingetragene Veranstaltungen bearbeiten.'
	},
	{
		question:
			'Warum sollte ich mein Event auf dorfpartys.com eintragen statt nur auf Instagram/Facebook zu posten?',
		answer:
			'Social-Media-Posts verschwinden nach wenigen Tagen im Feed und sind kaum über Suchmaschinen auffindbar. dorfpartys.com ist speziell für die Google- und KI-Suche optimiert: Jede Region, jede Party-Art und jeder Monat hat eine eigene Seite, sodass Leute, die z.B. nach "Scheunenfeten im August in Schleswig-Holstein" suchen, dein Event dort finden — auch Monate im Voraus, dauerhaft, ohne dass du dafür bezahlen musst.'
	},
	{
		question: 'Welche Arten von Veranstaltungen kann ich eintragen?',
		answer:
			'Alle Arten lokaler Dorf- und Volksfeste: Schützenfeste, Zeltfeten, Scheunenfeten, Stoppelfeten, Dorffeste, Maifeste, Weinfeste, Kirmes, Straßenfeste, Osterfeuer, Oktoberfeste, Karneval/Fasching, Weihnachtsmärkte, Sportfeste, Feuerwehrfeste und weitere. Die Liste wird laufend erweitert.'
	},
	{
		question: 'In welchen Ländern und Regionen gibt es Veranstaltungen auf dorfpartys.com?',
		answer:
			'dorfpartys.com deckt den gesamten DACH-Raum ab: alle 16 Bundesländer Deutschlands mit ihren Landkreisen und kreisfreien Städten, alle 9 Bundesländer Österreichs mit ihren Bezirken sowie alle 26 Kantone der Schweiz mit ihren Bezirken/Wahlkreisen. Jede Region hat eine eigene Such-Seite, auch wenn dort noch keine Veranstaltung eingetragen ist.'
	},
	{
		question: 'Sammelt dorfpartys.com meine Daten oder zeigt Werbung?',
		answer:
			'Nein. dorfpartys.com ist werbefrei und verzichtet auf Tracking durch Dritte. Es werden nur die für den Betrieb notwendigen Daten verarbeitet (siehe Datenschutzerklärung) — keine Analyse-Cookies, kein Weiterverkauf von Daten, keine externen Tracking- oder Werbenetzwerke.'
	},
	{
		question: 'Kann ich Veranstaltungen für später speichern?',
		answer:
			'Ja. Mit einem kostenlosen Account kannst du jede Veranstaltung über den "Merken"-Button speichern und findest sie danach gesammelt in deiner persönlichen Partyliste unter dorfpartys.com/partyliste wieder — praktisch, um mehrere Termine im Blick zu behalten.'
	},
	{
		question: 'Was ist eine Veranstalter-Seite?',
		answer:
			'Jede:r Nutzer:in kann ein öffentliches Veranstalter-Profil unter dorfpartys.com/veranstalter/{name} anlegen. Dort werden Profilbild, Kurzbeschreibung, Links sowie alle kommenden und vergangenen Veranstaltungen dieses Veranstalters oder Vereins gebündelt angezeigt — gut für Vereine, die regelmäßig Feste ausrichten.'
	},
	{
		question: 'Wie oft finden Schützenfeste, Zeltfeten und Scheunenfeten typischerweise statt?',
		answer:
			'Die meisten Dorf- und Vereinsfeste in Deutschland, Österreich und der Schweiz konzentrieren sich auf die wärmeren Monate von Mai bis September, mit einem deutlichen Schwerpunkt in den Sommerferienmonaten Juli und August — der klassischen Schützenfest- und Zeltfeten-Saison. Osterfeuer finden im Frühjahr statt, Weihnachtsmärkte im Winter. Auf dorfpartys.com lässt sich gezielt nach Monat filtern, um die Saison einer bestimmten Party-Art in einer Region zu sehen.'
	}
];

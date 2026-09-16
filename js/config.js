"use strict";

/* ========== Konfiguration ========== */
const SUPABASE_URL = "https://kzrnclebljkvsndsfryg.supabase.co";
const SUPABASE_KEY = "sb_publishable_-JhlGFRGR3RKRD-BMjIWiQ_FsSZOTWV";
const BUCKET = "grafiken";

/* Der Verein, für den diese Installation läuft.
   Spielerbilder und Sponsoren liegen in seinem eigenen Ordner; die Wappen
   teilt er sich mit allen anderen Vereinen derselben Liga. */
const CLUB = {
  ordner:      "SC_Fornsbach",                          /* eigener Ordner */
  ligaOrdner:  "Wappen_KreisligaB2_Rems__Murr__Hall",   /* gemeinsamer Wappen-Pool */
  file:        "SC_Fornsbach.png",                      /* eigenes Wappen darin */
  name:        "SC Fornsbach",
  venue:       "Sportplatz Fornsbach",
  competition: "Kreisliga B2 Rems/Murr/Hall"
};

/* Unterordner der Bibliothek */
const DIRS = {
  vorlagen:      "vorlagen",
  wappen:        CLUB.ligaOrdner,
  spielerbilder: CLUB.ordner + "/Spielerbilder",
  sponsoren:     CLUB.ordner + "/Sponsoren",
  fonts:         "fonts/zing"
};

const MAX_SPONSORS = 5;

/* Schrift der Vorlage. Liegt als OTF in der Bibliothek. */
const FONT_NAME = "ZingRust";
const FONT_FILE = "ZingRustDemo-Base.otf";

/* ========== Layout-Maße ========== */
/* Alle Maße sind aus der Referenzgrafik abgenommen (1080 x 1080) */
const LAYOUT = {
  PAD: 22,                /* linker Rand */
  BAR_TOP: 859,           /* hellblauer Balken der Vorlage */
  BAR_BOTTOM: 878,
  HEAD_TOP: 192,          /* Oberkante Einzelbild, unter MATCHDAY */
  HEAD_TOP_PAIR: 228,     /* Oberkante Doppelbild — etwas kleiner, damit
                             weniger angeschnitten werden muss */
  PLAYER_MAX_W: 640,      /* Notbremse bei fehlender Freistellung */
  PLAYER_GAP: 14,         /* Mindestabstand Spieler ↔ linke Elemente */
  PLAYER_INSET: 22,       /* Einzelbilder: Abstand zum rechten Rand */
  PLAYER_OVERHANG_MAX: 70, /* Doppelbilder: höchstens so viel Anschnitt, dann verkleinern */
  PAIR_WRAP_TRIGGER: 40,  /* ab so viel nötigem Anschnitt bricht ein langer Name um */
  PAIR_WRAP_WIDTH: 240,   /* … auf diese Breite */
  CREST_CY: 465,          /* Wappenreihe */
  CREST_L: 130,           /* Mitte linkes Wappen */
  CREST_R: 436,           /* Mitte rechtes Wappen */
  CREST_H: 204,           /* Höhe des eigenen Wappens — die Vorgabe */
  CREST_H_OPP: 192,       /* Gegnerwappen minimal kleiner: kräftig gefüllte
                             Wappen wirken sonst größer als das eigene */
  CREST_MAX_W: 214,       /* Bremse für sehr breite Formen */
  NAME_BASE: 608,         /* Grundlinie der Teamnamen */
  NAME_CAP: 25,
  INFO_ICON_X: 49,
  INFO_TEXT_X: 105,
  INFO_CAP: 28,

  /* Ergebnis-Grafik — unter den Wappen stehen erst die Teamnamen, dann
     der Spielstand, darunter bis zu drei Zeilen Torschützen */
  SCORE_CAP: 84,          /* Versalhöhe der Tore */
  SCORE_GAP: 16,          /* Luft zwischen Teamnamen und Toren bzw. Toren und Torschützen */
  SCORER_LABEL_CAP: 24,   /* "TORSCHÜTZEN:" */
  SCORER_CAP: 24,         /* Namen */
  SCORER_LINE_H: 28,
  SCORER_MAX_LINES: 3,
  SCORER_BOTTOM: 846      /* Grundlinie der letzten Namenszeile, Balken bei 859 */
};

/* Rechnet alle Positionen aus, ohne zu zeichnen. Der Spieler wird vor
   den Texten gezeichnet, muss aber wissen, wie weit die Texte reichen. */
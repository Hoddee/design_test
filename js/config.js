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
/* Alle Maße sind aus der Referenzgrafik abgenommen (1080 x 1080).
   Das ist das Layout für Vorlage 1; die anderen Vorlagen überschreiben
   einzelne Werte in PROFILES weiter unten. */
const LAYOUT = {
  PAD: 22,                /* linker Rand */
  RIGHT_EDGE: 1080,       /* rechte Kante, bis zu der der Spieler reichen darf */
  TITLE_BASE: 178, TITLE_CAP: 148, TITLE_MAX_W: 1055,
  MD_BASE: 251,    MD_CAP: 64,
  LIGA_BASE: 296,  LIGA_CAP: 36,
  LOGO_X: 1026, LOGO_Y: 52, LOGO_SIZE: 64,
  INFO_ORT_BASE: 710, INFO_ZEIT_BASE: 810,
  SPONSOR_LABEL_BASE: 923, SPONSOR_TOP: 950, SPONSOR_BOTTOM: 1042,
  SPONSOR_X0: 22, SPONSOR_X1: 1058,
  COL_W: 545, COL_W_FREE: 860,
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

/* ========== Vorlagen-Profile ==========
   Schlüssel ist der Dateiname ohne Endung. Fehlt ein Profil, gilt LAYOUT
   (Vorlage 1). Alle Werte in 1080er Koordinaten. */
const PROFILES = {

  /* Grauer Kasten (x 38–1041, y 39–1040) im blauen Grunge-Rahmen.
     Alles bleibt im Kasten. Ein selbst gezeichneter dunkler Streifen
     unten bildet die Sponsorenzone und kaschiert den Spieler-Schnitt. */
  /* VORLAGE 2 — gespiegelt.
     Der Spieler steht links und wird am Kastenrand angeschnitten, der
     gesamte Satz steht rechtsbündig. Ort und Zeit kommen ohne Symbole
     aus, das hält die rechte Kante ruhig. */
  "Vorlage 2": {
    PAD: 78, RIGHT_EDGE: 1041,
    ALIGN: "right", TEXT_X: 1001,
    PLAYER_SIDE: "left", PLAYER_LEFT_EDGE: 6, PLAYER_OVERHANG_MAX: 70,
    TITLE_BASE: 194, TITLE_CAP: 112, TITLE_MAX_W: 930,
    MD_BASE: 256, MD_CAP: 52,
    LIGA_BASE: 300, LIGA_CAP: 31,
    LOGO_X: 108, LOGO_Y: 100, LOGO_SIZE: 56,
    CREST_L: 668, CREST_R: 900, CREST_CY: 452,
    CREST_H: 164, CREST_H_OPP: 154, CREST_MAX_W: 190,
    NAME_BASE: 570, NAME_CAP: 23, NAME_MAX_W: 208,
    INFO_CAP: 30, INFO_ORT_BASE: 672, INFO_ZEIT_BASE: 726,
    HEAD_TOP: 176, HEAD_TOP_PAIR: 206,
    BAR_TOP: 856, BAR_BOTTOM: 858,
    PLAYER_MAX_W: 620,
    STRIP: { y0: 856, y1: 1040, x0: 38, x1: 1041, color: "rgba(0,0,0,.28)" },
    SPONSOR_LABEL_BASE: 896, SPONSOR_TOP: 912, SPONSOR_BOTTOM: 1026,
    SPONSOR_X0: 78, SPONSOR_X1: 1001,
    COL_W: 470, COL_W_FREE: 830,
    SCORE_CAP: 86, SCORE_GAP: 14,
    SCORER_CAP: 22, SCORER_LINE_H: 26, SCORER_BOTTOM: 860, SCORER_MAX_LINES: 3
  },

  /* VORLAGE 3 — Spielkarte statt Balken.
     Eine feste linke Spalte (Kartenpanel) trägt Titel, beide Teams
     zeilenweise übereinander mit Trennlinie, und darunter Ort/Anstoß
     bzw. Torschützen. Das Spielerbild bekommt die komplette rechte
     Bildhälfte und blutet bis zum unteren Rand aus. Das blaue Band der
     Vorlage bleibt sichtbar, wo es nicht vom Panel verdeckt wird, und
     trägt dort die Sponsorenzeile — wie ein Sash über dem Foto. */
  "Vorlage 3": {
    PAD: 34,
    PANEL: { x0: 0, x1: 440 },
    PANEL_ACCENT: "#3A66E1",
    COL_W: 372, COL_W_FREE: 372,

    TITLE_BASE: 106, TITLE_CAP: 76, TITLE_MIN_CAP: 44, TITLE_MAX_W: 372,
    MD_BASE: 150, MD_CAP: 34, MD_MIN_CAP: 22,
    LIGA_BASE: 180, LIGA_CAP: 22, LIGA_MIN_CAP: 16,

    LOGO_X: 1026, LOGO_Y: 52, LOGO_SIZE: 62,

    /* Die zwei Team-Zeilen der Spielkarte */
    ROW_CREST_SIZE: 68, CREST_H: 68, CREST_H_OPP: 68, CREST_MAX_W: 90,
    ROW_CREST_X: 34 + 34,           /* PAD + halbe Wappengröße */
    ROW_TEXT_X: 34 + 68 + 20,
    ROW_NAME_CAP: 27, ROW_NAME_MAX_W: 284,
    ROW_SCORE_CAP: 46,
    ROW1_CY: 288, ROW2_CY: 384,

    /* Ankündigung: Ort und Anstoß als Meta-Paare */
    META_LABEL_CAP: 15, META_VALUE_CAP: 27, META_GAP: 30,
    META1_Y: 470, META2_Y: 548,

    /* Ergebnis: Torschützen unter der Spielkarte */
    SCORER_LABEL_CAP: 17, SCORER_CAP: 23, SCORER_LINE_H: 27,
    SCORER_TOP: 456, SCORER_BOTTOM: 660, SCORER_MAX_LINES: 6,

    HEAD_TOP: 30, HEAD_TOP_PAIR: 30,
    BAR_TOP: 778, BAR_BOTTOM: 1080,          /* Spieler blutet bis unten aus */
    RESTORE_STRIP: { y0: 778, y1: 914 },     /* das Band bleibt als Sash sichtbar */
    PLAYER_GAP: 0, PLAYER_INSET: 0,
    PLAYER_OVERHANG_MAX: 50, PLAYER_MAX_W: 780,

    /* Sponsoren im sichtbaren Rest des Bands, rechts vom Panel */
    SPONSOR_LABEL_BASE: 820, SPONSOR_TOP: 834, SPONSOR_BOTTOM: 906,
    SPONSOR_X0: 470, SPONSOR_X1: 1050
  }
};

/* Aktives Layoutyout: LAYOUT plus Profil der gewählten Vorlage */
let _layoutCache = { key:null, K:null };
function layoutFor(){
  const key = draft.template ? draft.template.name : "";
  if(_layoutCache.key === key && _layoutCache.K) return _layoutCache.K;
  const K = Object.assign({}, LAYOUT, PROFILES[key] || {});
  _layoutCache = { key:key, K:K };
  return K;
}
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
  /* VORLAGE2 — gespiegelt: Spielerbild links, alle Infos rechtsbündig.
     Kastenbreite ~1002 (rechts davon beginnt der Rahmensaum der Vorlage,
     da geht nichts mehr hinein — auch nicht Spieler oder Logo). Fuß der
     Bilddatei (ab y≈810) trägt die Sponsoren. */
  "Vorlage2": {
    PAD: 40, RIGHT_EDGE: 1002,
    ALIGN: "right", TEXT_X: 962,
    PLAYER_SIDE: "left", PLAYER_LEFT_EDGE: 0, PLAYER_GAP: 18,
    PLAYER_MAX_W: 600, PLAYER_OVERHANG_MAX: 70,

    LOGO_X: 70, LOGO_Y: 78, LOGO_SIZE: 56,

    TITLE_BASE: 160, TITLE_CAP: 108, TITLE_MIN_CAP: 56, TITLE_MAX_W: 860,
    MD_BASE: 216, MD_CAP: 44, MD_MIN_CAP: 22,
    LIGA_BASE: 256, LIGA_CAP: 27, LIGA_MIN_CAP: 16,

    CREST_CY: 398, CREST_L: 630, CREST_R: 862,
    CREST_H: 150, CREST_H_OPP: 140, CREST_MAX_W: 158,
    NAME_BASE: 512, NAME_CAP: 23, NAME_MAX_W: 210,

    INFO_CAP: 27, INFO_ORT_BASE: 608, INFO_ZEIT_BASE: 660,
    INFO_ICON_GAP: 20, INFO_ICON_R: 15, INFO_ICON_DY: -10,

    COL_W: 390, COL_W_FREE: 390,

    /* Trennlinie zum dunkleren Fuß der Bilddatei, vermessen: y≈810 */
    HEAD_TOP: 168, HEAD_TOP_PAIR: 204,
    BAR_TOP: 810, BAR_BOTTOM: 812,

    /* Deutlich mehr Abstand zwischen Trennlinie und "WIRD PRÄSENTIERT
       VON" als zuvor — auf Wunsch mehr Luft nach oben im Sponsorenfuß. */
    SPONSOR_LABEL_BASE: 868, SPONSOR_TOP: 888, SPONSOR_BOTTOM: 1028,
    SPONSOR_X0: 40, SPONSOR_X1: 962,

    /* Ergebnis: Torschützen linksbündig unter der Wappenspalte, Breite
       bleibt sicher innerhalb des Kastens (Ende bei 630+360=990) */
    SCORER_ALIGN: "left", SCORER_X: 630, SCORER_MAX_W: 360,
    SCORE_CAP: 68, SCORE_GAP: 14,
    SCORER_LABEL_CAP: 19, SCORER_CAP: 22, SCORER_LINE_H: 26,
    SCORER_BOTTOM: 780, SCORER_MAX_LINES: 3
  },

  /* VORLAGE 3 — Podest.
     Neue Bilddatei (Stand 17.09.): kein Kartenpanel mehr, sondern ein
     randloser dunkelblauer Hintergrund mit diagonalen Lichtstreifen
     rechts oben und einer flachen Podest-/Thekenkante, die bei y≈869
     quer durchs Bild läuft (links leicht angeschrägt, ab x≈95 exakt
     waagerecht). Titelblock, Wappen, Namen und Ort/Anstoß stehen frei
     im dunklen oberen Bereich, wie bei Vorlage 1 — nur mit mehr Rand,
     weil hier kein Kasten die Fläche vorgibt. Das Spielerbild steht
     rechts und wird an der Podestkante "abgeschnitten": die Vorlage
     wird darüber erneut gezeichnet, wodurch Beine/Unterkörper hinter
     der Theke verschwinden. Auf der Podestfläche darunter stehen die
     Sponsoren. */
  "Vorlage 3": {
    PAD: 48,

    TITLE_BASE: 168, TITLE_CAP: 118, TITLE_MIN_CAP: 60, TITLE_MAX_W: 640,
    MD_BASE: 226, MD_CAP: 38, MD_MIN_CAP: 22,
    LIGA_BASE: 262, LIGA_CAP: 24, LIGA_MIN_CAP: 16,

    CREST_CY: 452, CREST_L: 148, CREST_R: 452,
    CREST_H: 196, CREST_H_OPP: 184, CREST_MAX_W: 208,
    NAME_BASE: 596, NAME_CAP: 25, NAME_MAX_W: 300,

    INFO_ICON_X: 60, INFO_TEXT_X: 116, INFO_CAP: 27,
    INFO_ORT_BASE: 700, INFO_ZEIT_BASE: 798,

    COL_W: 560, COL_W_FREE: 860,

    /* Podestkante, aus der Bilddatei vermessen (1254px-Vorlage, auf
       1080 umgerechnet: 1009 * 1080/1254 ≈ 869). Zuschnitt des Spielers
       (HEAD_TOP/BAR_BOTTOM/PLAYER_*) bewusst nicht eigens gesetzt — das
       übernimmt unverändert die Werte aus LAYOUT (Vorlage 1), auf Wunsch,
       weil der Ausschnitt dort als richtig empfunden wurde. */
    BAR_TOP: 869,

    /* Sponsoren auf der Podestfläche */
    SPONSOR_LABEL_BASE: 918, SPONSOR_TOP: 946, SPONSOR_BOTTOM: 1040,
    SPONSOR_X0: 48, SPONSOR_X1: 1032
  }
};

/* VORLAGE 4 — Poster-Stil.
   Links eine dunkel abgetönte Spalte über dem Foto (Scrim) trägt Titel,
   Wappen mit VS., Ort/Anstoß und Sponsoren als einzelne Chips. Rechts
   blutet das Spielerbild bis zum unteren Rand aus, kein Balken/Streifen
   verdeckt es — die Vorlage hat keinen, also gibt es auch keinen zu
   kaschieren. */
PROFILES["Vorlage 4"] = {
  PAD: 40,
  TITLE_BASE: 120, TITLE_CAP: 104, TITLE_MIN_CAP: 56, TITLE_MAX_W: 460,
  MD_BASE: 184, MD_CAP: 30, MD_MIN_CAP: 20,
  LIGA_BASE: 216, LIGA_CAP: 22, LIGA_MIN_CAP: 16,

  CREST_CY: 350, CREST_L: 132, CREST_R: 372,
  CREST_H: 150, CREST_H_OPP: 140, CREST_MAX_W: 160,
  NAME_BASE: 480, NAME_CAP: 24, NAME_MAX_W: 212,

  INFO_ICON_X: 46, INFO_TEXT_X: 88, INFO_CAP: 24,
  INFO_ICON_R: 13, INFO_ICON_R2: 12, INFO_ICON_DY: -9,
  INFO_ORT_BASE: 564, INFO_ZEIT_BASE: 618,

  HEAD_TOP: 20, HEAD_TOP_PAIR: 20,
  BAR_TOP: 1080,
  /* BAR_BOTTOM bewusst etwas über den unteren Bildrand (1080) hinaus:
     Freigestellte Spielerbilder haben am Rand ein bis zwei halbtransparente
     Antialiasing-Pixel; ohne Überstand wurde dieser weiche Saum mit
     hochskaliert und war als schmale, leicht durchscheinende Lücke direkt
     an der Kante sichtbar. Der Überstand schiebt genau diesen Saum aus
     dem sichtbaren Bereich, der Rest der Größenberechnung bleibt gleich. */
  BAR_BOTTOM: 1116,
  PLAYER_MAX_W: 760, PLAYER_INSET: 0, PLAYER_GAP: 26, PLAYER_OVERHANG_MAX: 60,

  COL_W: 460, COL_W_FREE: 460,
  /* Nur leicht abgetönt, damit das Streifen-/Rastermuster der Vorlage
     sichtbar bleibt — vorher praktisch schwarz (.86/.92 Deckkraft). */
  SCRIM: { x0: 0, x1: 540, top: "rgba(6,9,16,.42)", bottom: "rgba(5,7,13,.52)" },
  PANEL_W: 460,

  SPONSOR_LABEL_TEXT: "PRÄSENTIERT VON", SPONSOR_LABEL_CAP: 18, SPONSOR_LABEL_BASE: 800,
  CHIP_TOP: 826, CHIP_H: 74, CHIP_GAP: 14, CHIP_PAD: 16,

  SCORE_CAP: 66, SCORE_GAP: 26,
  SCORER_LABEL_CAP: 18, SCORER_CAP: 22, SCORER_LINE_H: 26,
  SCORER_BOTTOM: 770, SCORER_MAX_LINES: 5
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
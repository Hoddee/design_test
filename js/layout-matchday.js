"use strict";

/* ========== Grafiktyp: Spielankündigung ==========
   MATCHDAY · Spieltag · Liga · beide Wappen mit VS. · Teamnamen ·
   Ort und Anstoß · Spielerbild · Sponsoren */

function computeLayoutMatchday(){
  const K = LAYOUT;
  const L = { typ:"matchday" };
  layoutCommon(L);

  /* VS. mittig zwischen den Innenkanten der Wappen */
  const innenL = K.CREST_L + L.mL.w/2;
  const innenR = K.CREST_R - L.mR.w/2;
  L.vsCap = 46;
  setFont(sizeForCap(L.vsCap));
  while(textWidth("VS.") > (innenR - innenL) - 28 && L.vsCap > 30){
    L.vsCap -= 1;
    setFont(sizeForCap(L.vsCap));
  }
  L.vsCX = (innenL + innenR)/2 - L.vsCap*0.09;

  /* Teamnamen — links ist der Platz durch den Rand begrenzt */
  const maxWL = 2 * (K.CREST_L - K.PAD + 10);
  L.nameL = wrapLines(L.links.name.toUpperCase(),  maxWL, K.NAME_CAP, 2);
  L.nameR = wrapLines(L.rechts.name.toUpperCase(), 310,   K.NAME_CAP, 2);

  /* Ort und Zeit */
  L.ortText  = (draft.venue||"").toUpperCase();
  L.zeitText = (formatDate(draft.date)+" "+(draft.time||"").replace(":",".")+" UHR").toUpperCase();
  const ortKante  = K.INFO_TEXT_X + fittedWidth(L.ortText,  L.colW - 70, K.INFO_CAP, 18);
  const zeitKante = K.INFO_TEXT_X + fittedWidth(L.zeitText, L.colW - 70, K.INFO_CAP, 18);

  /* Hindernisse für das Spielerbild, mit Höhenbereich */
  function hindernisse(){
    const nameLinesH = L.nameR.zeilen.length * L.nameR.lineH;
    return [
      { y0:258, y1:300, x:L.ligaKante },
      { y0:K.CREST_CY - L.mR.h/2, y1:K.CREST_CY + L.mR.h/2, x:K.CREST_R + L.mR.w/2 },
      { y0:K.NAME_BASE - K.NAME_CAP - 4, y1:K.NAME_BASE + nameLinesH - L.nameR.lineH + 6,
        x:K.CREST_R + L.nameR.breite/2 },
      { y0:680, y1:714, x:ortKante },
      { y0:780, y1:814, x:zeitKante }
    ];
  }

  /* Ein langer einzeiliger Gegnername liegt genau auf Ellenbogenhöhe und
     drückt ein Doppelbild nach rechts. Bräuchte es deshalb zu viel
     Anschnitt, bricht der Name auf zwei Zeilen um — wie in der Vorlage. */
  function platzSchaffen(){
    if(L.nameR.breite <= K.PAIR_WRAP_WIDTH) return false;
    L.nameR = wrapLines(L.rechts.name.toUpperCase(), K.PAIR_WRAP_WIDTH, K.NAME_CAP, 2);
    return true;
  }

  placePlayer(L, hindernisse, platzSchaffen);
  return L;
}

function drawMatchday(){
  const K = LAYOUT;
  const L = computeLayoutMatchday();

  drawBackground();
  drawPlayer(L);
  drawTopLogo();
  drawHeader(L, "MATCHDAY");
  drawCrests(L);

  /* VS. */
  shadowOn(16,.42);
  ctx.fillStyle = "#FFFFFF";
  setFont(sizeForCap(L.vsCap));
  skewText("VS.", L.vsCX, K.CREST_CY + 22, "center");
  shadowOff();

  /* Teamnamen */
  shadowOn(14,.45);
  ctx.fillStyle = "#FFFFFF";
  drawLines(L.nameL, K.CREST_L, K.NAME_BASE);
  drawLines(L.nameR, K.CREST_R, K.NAME_BASE);
  shadowOff();

  /* Ort und Zeit — Grundlinien 710 und 810 */
  shadowOn(14,.45);
  drawPin(K.INFO_ICON_X, 697, 37);
  ctx.fillStyle = "#FFFFFF";
  skewFit(L.ortText,  K.INFO_TEXT_X, 710, L.colW - 70, K.INFO_CAP, 18);
  drawClock(K.INFO_ICON_X, 797, 36);
  ctx.fillStyle = "#FFFFFF";
  skewFit(L.zeitText, K.INFO_TEXT_X, 810, L.colW - 70, K.INFO_CAP, 18);
  shadowOff();

  drawSponsors();
}

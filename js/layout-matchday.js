"use strict";

/* ========== Grafiktyp: Spielankündigung ==========
   MATCHDAY · Spieltag · Liga · beide Wappen mit VS. · Teamnamen ·
   Ort und Anstoß · Spielerbild · Sponsoren */

function computeLayoutMatchday(){
  const K = layoutFor();
  const L = { typ:"matchday" };
  layoutCommon(L);

  if(K.PANEL) return computeLayoutMatchdayPanel(K, L);

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

  /* Teamnamen. Steht die Begegnung im Band, entfallen sie unter den Wappen. */
  L.imBand = !!(K.BAND && K.BAND.nameCap);
  const maxName = K.NAME_MAX_W || Math.min(2 * (K.CREST_L - K.PAD + 10), 330);
  L.nameL = wrapLines(L.links.name.toUpperCase(),  maxName, K.NAME_CAP, 2);
  L.nameR = wrapLines(L.rechts.name.toUpperCase(), K.NAME_MAX_W || 310, K.NAME_CAP, 2);
  if(L.imBand) L.bandParts = bandBegegnung(L, "VS.");

  /* Ort und Zeit. Hat die Vorlage ein Band, wandert der Anstoß hinein;
     der Ort bleibt als Zeile mit Symbol darüber. */
  L.ortText  = (draft.venue||"").toUpperCase();
  L.zeitText = (formatDate(draft.date)+" "+(draft.time||"").replace(":",".")+" UHR").toUpperCase();
  L.rechtsSatz = K.ALIGN === "right";
  L.meta = !!K.META_BASE;
  if(L.meta) L.metaText = L.ortText + "  ·  " + L.zeitText;

  /* Bei rechtsbündigem Satz zeichnet skewFit mit voller Spaltenbreite
     (keine Reserve für ein links stehendes Icon nötig, das Icon hängt
     hier ja rechts vor dem Text) — die Breitenmessung muss also densel-
     ben Spielraum annehmen wie das tatsächliche Zeichnen, sonst landet
     das Icon auf Basis eines zu schmal geschätzten Textes zu weit rechts. */
  const infoMaxW = L.rechtsSatz ? L.colW : L.colW - 70;
  const ortW  = fittedWidth(L.ortText,  infoMaxW, K.INFO_CAP, 18);
  const zeitW = fittedWidth(L.zeitText, infoMaxW, K.INFO_CAP, 18);
  L.ortW = ortW; L.zeitW = zeitW;
  const iconGap = K.INFO_ICON_GAP || 0;

  /* Symbol direkt vor dem jeweiligen Text — bei rechtsbündigem Satz
     je Zeile eigene Position, abhängig von der tatsächlichen Textbreite,
     statt fest an der Wappenkante zu hängen (das riss eine große Lücke
     zwischen Symbol und kürzerem Text auf). */
  if(iconGap){
    L.infoIconR = K.INFO_ICON_R || 26;
    L.infoIconOrtX  = K.TEXT_X - ortW  - iconGap - L.infoIconR;
    L.infoIconZeitX = K.TEXT_X - zeitW - iconGap - L.infoIconR;
  }
  const ortKante  = L.rechtsSatz
    ? (iconGap ? L.infoIconOrtX - L.infoIconR : K.TEXT_X - ortW)
    : K.INFO_TEXT_X + ortW;
  const zeitKante = L.rechtsSatz
    ? (iconGap ? L.infoIconZeitX - L.infoIconR : K.TEXT_X - zeitW)
    : K.INFO_TEXT_X + zeitW;

  function hindernisse(){
    const nameLinesH = L.nameR.zeilen.length * L.nameR.lineH;
    const h = [{ y0:K.LIGA_BASE - K.LIGA_CAP - 4, y1:K.LIGA_BASE + 4, x:L.ligaKante }];

    if(L.meta){
      setFont(sizeForCap(K.META_CAP));
      h.push({ y0:K.META_BASE - K.META_CAP - 4, y1:K.META_BASE + 4,
               x:K.PAD + textWidth(L.metaText) });
    }

    if(L.rechtsSatz){
      h.push({ y0:K.CREST_CY - L.mL.h/2, y1:K.CREST_CY + L.mL.h/2, x:K.CREST_L - L.mL.w/2 });
      if(!L.imBand){
        h.push({ y0:K.NAME_BASE - K.NAME_CAP - 4,
                 y1:K.NAME_BASE + L.nameL.zeilen.length * L.nameL.lineH - L.nameL.lineH + 6,
                 x:K.CREST_L - L.nameL.breite/2 });
      }
    } else {
      h.push({ y0:K.CREST_CY - L.mR.h/2, y1:K.CREST_CY + L.mR.h/2, x:K.CREST_R + L.mR.w/2 });
      if(!L.imBand){
        h.push({ y0:K.NAME_BASE - K.NAME_CAP - 4,
                 y1:K.NAME_BASE + nameLinesH - L.nameR.lineH + 6,
                 x:K.CREST_R + L.nameR.breite/2 });
      }
    }

    if(!L.meta){
      h.push({ y0:K.INFO_ORT_BASE  - K.INFO_CAP - 4, y1:K.INFO_ORT_BASE  + 4, x:ortKante });
      h.push({ y0:K.INFO_ZEIT_BASE - K.INFO_CAP - 4, y1:K.INFO_ZEIT_BASE + 4, x:zeitKante });
    }
    return h;
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

/* Spielkarte: nur ein Hindernis (die Panelkante) über die volle Höhe —
   das Spielerbild braucht keine zeilenweise Prüfung, weil links davon
   ausschließlich das Panel steht. */
function computeLayoutMatchdayPanel(K, L){
  L.ortText  = (draft.venue||"").toUpperCase();
  L.zeitText = (formatDate(draft.date)+" "+(draft.time||"").replace(":",".")+" UHR").toUpperCase();

  function hindernisse(){
    return [{ y0:0, y1:H, x:K.PANEL.x1 }];
  }
  placePlayer(L, hindernisse, null);
  return L;
}

function drawMatchday(){
  const K = layoutFor();
  const L = computeLayoutMatchday();

  if(K.PANEL){ drawMatchdayPanel(K, L); return; }

  drawBackground();
  drawScrim(K);
  drawPlayer(L);
  drawTopLogo();
  drawHeader(L, "MATCHDAY");
  drawCrests(L);

  /* Ort und Anstoß als eine Zeile im Kopf (Vorlage 3) */
  if(L.meta){
    shadowOn(14,.45);
    ctx.fillStyle = "rgba(255,255,255,.82)";
    skewFit(L.metaText, K.PAD, K.META_BASE, L.colW + 120, K.META_CAP, 18);
    shadowOff();
  }

  if(L.imBand){
    drawBand(L, L.bandParts);
  } else {
    shadowOn(16,.42);
    ctx.fillStyle = "#FFFFFF";
    setFont(sizeForCap(L.vsCap));
    skewText("VS.", L.vsCX, K.CREST_CY + 22, "center");
    shadowOff();

    shadowOn(14,.45);
    ctx.fillStyle = "#FFFFFF";
    drawLines(L.nameL, K.CREST_L, K.NAME_BASE);
    drawLines(L.nameR, K.CREST_R, K.NAME_BASE);
    shadowOff();
  }

  if(!L.meta){
    shadowOn(14,.45);
    ctx.fillStyle = "#FFFFFF";
    if(L.rechtsSatz){
      if(K.INFO_ICON_GAP){
        const r  = L.infoIconR;
        const dy = K.INFO_ICON_DY != null ? K.INFO_ICON_DY : -13;
        drawPin(L.infoIconOrtX, K.INFO_ORT_BASE + dy, r);
        ctx.fillStyle = "#FFFFFF";
        skewFit(L.ortText, K.TEXT_X, K.INFO_ORT_BASE, L.colW, K.INFO_CAP, 18, "right");
        drawClock(L.infoIconZeitX, K.INFO_ZEIT_BASE + dy, r-1);
        ctx.fillStyle = "#FFFFFF";
        skewFit(L.zeitText, K.TEXT_X, K.INFO_ZEIT_BASE, L.colW, K.INFO_CAP, 18, "right");
}       else {
        skewFit(L.ortText,  K.TEXT_X, K.INFO_ORT_BASE,  L.colW, K.INFO_CAP, 18, "right");
        skewFit(L.zeitText, K.TEXT_X, K.INFO_ZEIT_BASE, L.colW, K.INFO_CAP, 18, "right");
      }
    } else {
      const r1 = K.INFO_ICON_R  || 37;
      const r2 = K.INFO_ICON_R2 || K.INFO_ICON_R || 36;
      const dy = K.INFO_ICON_DY != null ? K.INFO_ICON_DY : -13;
      drawPin(K.INFO_ICON_X, K.INFO_ORT_BASE + dy, r1);
      ctx.fillStyle = "#FFFFFF";
      skewFit(L.ortText, K.INFO_TEXT_X, K.INFO_ORT_BASE, L.colW - 70, K.INFO_CAP, 18);
      drawClock(K.INFO_ICON_X, K.INFO_ZEIT_BASE + dy, r2);
      ctx.fillStyle = "#FFFFFF";
      skewFit(L.zeitText, K.INFO_TEXT_X, K.INFO_ZEIT_BASE, L.colW - 70, K.INFO_CAP, 18);
    }
    shadowOff();
  }

  if(K.CHIP_TOP) drawSponsorChips(K);
  else { drawStrip(); drawSponsors(); }
}

/* Spielkarte: Panel links mit Titel, zwei Team-Zeilen, Ort/Anstoß als
   Meta-Paare. Spielerbild rechts, blutet bis unten aus. Sponsoren im
   sichtbaren Rest des Bands rechts vom Panel. */
function drawMatchdayPanel(K, L){
  drawBackground();
  drawPlayer(L);
  drawTopLogo();
  drawFixturePanel(K);

  shadowOff();
  ctx.fillStyle = "#FFFFFF";
  skewFit("MATCHDAY", K.PAD, K.TITLE_BASE, K.TITLE_MAX_W, K.TITLE_CAP, K.TITLE_MIN_CAP);
  ctx.fillStyle = "#8FA3D9";
  skewFit(L.mdText, K.PAD, K.MD_BASE, K.COL_W, K.MD_CAP, K.MD_MIN_CAP);
  ctx.fillStyle = "rgba(255,255,255,.68)";
  skewFit(L.ligaText, K.PAD, K.LIGA_BASE, K.COL_W, K.LIGA_CAP, K.LIGA_MIN_CAP);

  drawFixtureRow(K, K.ROW1_CY, L.links.img,  L.mL, L.links.name);
  drawFixtureRow(K, K.ROW2_CY, L.rechts.img, L.mR, L.rechts.name);
  drawFixtureDivider(K);

  drawMetaPair(K, K.META1_Y, "SPIELORT", L.ortText);
  drawMetaPair(K, K.META2_Y, "ANSTOSS",  formatDate(draft.date)+"  ·  "+(draft.time||"").replace(":",".")+" UHR");

  drawSponsors();
}
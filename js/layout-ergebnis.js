"use strict";

/* ========== Grafiktyp: Ergebnis ==========
   ERGEBNIS · Spieltag · Liga · beide Wappen · Teamnamen · Spielstand ·
   Torschützen · Spielerbild · Sponsoren */

/* Torschützen in Anzeigeform: "2x F. Ergezen", Mehrfachtorschützen zuerst.
   Ohne Eintrag ein Strich, damit der Block immer steht. */
function torschuetzenTexte(){
  const eintraege = (draft.scorers||[])
    .map(function(s){ return { name:(s.name||"").trim(), count:Math.max(1, parseInt(s.count,10)||1) }; })
    .filter(function(s){ return s.name; })
    .sort(function(a,b){ return b.count - a.count; });   /* stabil: Reihenfolge bleibt bei Gleichstand */
  if(eintraege.length === 0) return ["–"];
  return eintraege.map(function(s){ return (s.count > 1 ? s.count+"x " : "") + s.name; });
}

function computeLayoutErgebnis(){
  const K = layoutFor();
  const L = { typ:"ergebnis" };
  layoutCommon(L);

  if(K.PANEL) return computeLayoutErgebnisPanel(K, L);

  L.rechtsSatz = K.ALIGN === "right";
  L.imBand = !!(K.BAND && K.BAND.nameCap);

  const maxName = K.NAME_MAX_W || Math.min(2 * (K.CREST_L - K.PAD + 10), 330);
  L.nameL = wrapLines(L.links.name.toUpperCase(),  maxName, K.NAME_CAP, 2);
  L.nameR = wrapLines(L.rechts.name.toUpperCase(), K.NAME_MAX_W || 310, K.NAME_CAP, 2);

  L.band = !!K.BAND;
  const nameLines  = Math.max(L.nameL.zeilen.length, L.nameR.zeilen.length);
  const nameBottom = K.NAME_BASE + (nameLines - 1) * Math.max(L.nameL.lineH, L.nameR.lineH);
  L.scoreBase = L.band
    ? (K.BAND.y0 + K.BAND.y1)/2 + K.SCORE_CAP/2 - 2
    : nameBottom + K.SCORE_GAP + K.SCORE_CAP;

  const own = draft.goalsOwn === "" ? "–" : String(draft.goalsOwn);
  const opp = draft.goalsOpp === "" ? "–" : String(draft.goalsOpp);
  L.scoreL = L.links.own  ? own : opp;
  L.scoreR = L.rechts.own ? own : opp;
  setFont(sizeForCap(K.SCORE_CAP));
  L.scoreWR = textWidth(L.scoreR);
  if(L.imBand) L.bandParts = bandBegegnung(L, L.scoreL+" – "+L.scoreR, K.BAND.scoreCap);

  const frei = L.band
    ? K.SCORER_BOTTOM - (nameBottom + K.SCORE_GAP)
    : K.SCORER_BOTTOM - (L.scoreBase + K.SCORE_GAP);
  const maxLines = Math.max(1, Math.min(K.SCORER_MAX_LINES,
    Math.floor((frei - K.SCORER_LABEL_CAP - 2) / K.SCORER_LINE_H)));

  const namen = torschuetzenTexte().map(function(n){ return n.toUpperCase(); });
  if(namen.length <= 2 && namen.length <= maxLines){
    L.scorerLines = { cap:K.SCORER_CAP, lineH:K.SCORER_LINE_H, zeilen:namen };
  } else {
    L.scorerLines = wrapNamen(namen, K.SCORER_MAX_W || (L.colW - K.PAD), K.SCORER_CAP, maxLines);
  }
  const n = L.scorerLines.zeilen.length;
  L.scorerFirstBase = K.SCORER_BOTTOM - (n - 1) * K.SCORER_LINE_H;
  L.scorerLabelBase = L.scorerFirstBase - K.SCORER_LINE_H - 2;

  setFont(sizeForCap(L.scorerLines.cap));
  L.scorerKante = K.PAD + Math.max(
    fittedWidth("TORSCHÜTZEN:", 400, K.SCORER_LABEL_CAP, 18),
    Math.max.apply(null, L.scorerLines.zeilen.map(function(z){ return textWidth(z); }))
  );

  /* Gilt für beide Zeichnungswege: rechtsbündig nur, wenn nicht per
     SCORER_ALIGN ausdrücklich anders vorgegeben (siehe Zeichenfunktion). */
  const scorerRight = K.SCORER_ALIGN ? K.SCORER_ALIGN === "right" : L.rechtsSatz;
    L.scorerX = (!scorerRight && K.SCORER_X !== undefined)
    ? K.CREST_L - L.mL.w/2
    : K.SCORER_X;

  function hindernisse(){
    const nameLinesH = L.nameR.zeilen.length * L.nameR.lineH;
    const h = [{ y0:K.LIGA_BASE - K.LIGA_CAP - 4, y1:K.LIGA_BASE + 4, x:L.ligaKante }];

    if(L.rechtsSatz){
      h.push({ y0:K.CREST_CY - L.mL.h/2, y1:K.CREST_CY + L.mL.h/2, x:K.CREST_L - L.mL.w/2 });
      h.push({ y0:K.NAME_BASE - K.NAME_CAP - 4,
               y1:K.NAME_BASE + L.nameL.zeilen.length * L.nameL.lineH - L.nameL.lineH + 6,
               x:K.CREST_L - L.nameL.breite/2 });
      /* Linksbündige Torschützenliste: ihre linke Kante ist bereits die
         Grenze für den links stehenden Spieler, unabhängig von der Breite. */
      const scorerLeftX = scorerRight
        ? K.TEXT_X - (L.scorerKante - K.PAD)
        : (L.scorerX !== undefined ? L.scorerX : K.PAD);
      h.push({ y0:L.scorerLabelBase - K.SCORER_LABEL_CAP - 4, y1:K.SCORER_BOTTOM + 6,
               x:scorerLeftX });
      if(!L.band) h.push({ y0:L.scoreBase - K.SCORE_CAP - 6, y1:L.scoreBase + 8,
                           x:K.CREST_L - L.scoreWR/2 });
    } else {
      h.push({ y0:K.CREST_CY - L.mR.h/2, y1:K.CREST_CY + L.mR.h/2, x:K.CREST_R + L.mR.w/2 });
      if(!L.imBand){
        h.push({ y0:K.NAME_BASE - K.NAME_CAP - 4, y1:K.NAME_BASE + nameLinesH - L.nameR.lineH + 6,
                 x:K.CREST_R + L.nameR.breite/2 });
      }
      h.push({ y0:L.scorerLabelBase - K.SCORER_LABEL_CAP - 4, y1:K.SCORER_BOTTOM + 6, x:L.scorerKante });
      if(!L.band) h.push({ y0:L.scoreBase - K.SCORE_CAP - 6, y1:L.scoreBase + 8,
                           x:K.CREST_R + L.scoreWR/2 });
    }
    return h;
  }

  function platzSchaffen(){
    if(L.nameR.breite <= K.PAIR_WRAP_WIDTH) return false;
    L.nameR = wrapLines(L.rechts.name.toUpperCase(), K.PAIR_WRAP_WIDTH, K.NAME_CAP, 2);
    return true;
  }

  placePlayer(L, hindernisse, platzSchaffen);
  return L;
}

/* Spielkarte: Ergebnis-Version — jede Team-Zeile trägt zusätzlich ihre
   Tore rechtsbündig; Torschützen darunter, kein zeilenweises Prüfen
   nötig, weil links vom Spieler ausschließlich das Panel steht. */
function computeLayoutErgebnisPanel(K, L){
  const own = draft.goalsOwn === "" ? "–" : String(draft.goalsOwn);
  const opp = draft.goalsOpp === "" ? "–" : String(draft.goalsOpp);
  L.scoreL = L.links.own  ? own : opp;
  L.scoreR = L.rechts.own ? own : opp;

  const namen = torschuetzenTexte().map(function(n){ return n.toUpperCase(); });
  const frei = K.SCORER_BOTTOM - K.SCORER_TOP;
  const maxLines = Math.max(1, Math.min(K.SCORER_MAX_LINES,
    Math.floor((frei - K.SCORER_LABEL_CAP - 6) / K.SCORER_LINE_H)));
  if(namen.length <= 2 && namen.length <= maxLines){
    L.scorerLines = { cap:K.SCORER_CAP, lineH:K.SCORER_LINE_H, zeilen:namen };
  } else {
    L.scorerLines = wrapNamen(namen, K.PANEL.x1 - 2*K.PAD, K.SCORER_CAP, maxLines);
  }

  function hindernisse(){
    return [{ y0:0, y1:H, x:K.PANEL.x1 }];
  }
  placePlayer(L, hindernisse, null);
  return L;
}

function drawErgebnis(){
  const K = layoutFor();
  const L = computeLayoutErgebnis();

  if(K.PANEL){ drawErgebnisPanel(K, L); return; }

  drawBackground();
  drawScrim(K);
  drawPlayer(L);
  drawTopLogo();
  drawHeader(L, "ERGEBNIS");
  drawCrests(L);

  if(!L.imBand){
    shadowOn(14,.45);
    ctx.fillStyle = "#FFFFFF";
    drawLines(L.nameL, K.CREST_L, K.NAME_BASE);
    drawLines(L.nameR, K.CREST_R, K.NAME_BASE);
    shadowOff();
  }

  if(!L.imBand){
    shadowOn(16,.42);
    ctx.fillStyle = "#FFFFFF";
    setFont(sizeForCap(L.vsCap));
    skewText("VS.", L.vsCX, K.CREST_CY + 22, "center");
    shadowOff();
  }

  if(L.imBand){
    drawBand(L, L.bandParts);
  } else {
    shadowOn(20,.45);
    ctx.fillStyle = "#FFFFFF";
    setFont(sizeForCap(K.SCORE_CAP));
    const dashW = K.SCORE_CAP * 0.52, dashH = K.SCORE_CAP * 0.19;
    const dashY = L.scoreBase - K.SCORE_CAP * 0.5;
    skewText(L.scoreL, K.CREST_L, L.scoreBase, "center");
    skewText(L.scoreR, K.CREST_R, L.scoreBase, "center");
    const mid = (K.CREST_L + K.CREST_R)/2;
    ctx.beginPath();
    ctx.roundRect(mid - dashW/2, dashY - dashH/2, dashW, dashH, 4);
    ctx.fill();
    shadowOff();
  }

  /* Ein rechtsbündiger Fließtext aus mehreren Zeilen wirkt unruhig —
     die Torschützenliste bleibt deshalb linksbündig, auch wenn der
     Rest der Vorlage rechtsbündig gesetzt ist. Sie hängt sich dafür an
     die Spalte der Wappen/Tore statt an den Rand der Box. */
  const scorerRight = K.SCORER_ALIGN ? K.SCORER_ALIGN === "right" : L.rechtsSatz;
  const sx = scorerRight ? K.TEXT_X : (L.scorerX !== undefined ? L.scorerX : K.PAD);
  const sa = scorerRight ? "right" : "left";
  shadowOn(14,.45);
  ctx.fillStyle = "#FFFFFF";
  setFont(sizeForCap(K.SCORER_LABEL_CAP));
  skewText("TORSCHÜTZEN:", sx, L.scorerLabelBase, sa);
  setFont(sizeForCap(L.scorerLines.cap));
  L.scorerLines.zeilen.forEach(function(z, i){
    skewText(z, sx, L.scorerFirstBase + i*K.SCORER_LINE_H, sa);
  });
  shadowOff();

  if(K.CHIP_TOP) drawSponsorChips(K);
  else { drawStrip(); drawSponsors(); }
}

/* Spielkarte: Ergebnis-Version. Jede Team-Zeile trägt ihre Tore
   rechtsbündig, Torschützen als eigener Block darunter. */
function drawErgebnisPanel(K, L){
  drawBackground();
  drawPlayer(L);
  drawTopLogo();
  drawFixturePanel(K);

  ctx.fillStyle = "#FFFFFF";
  skewFit("ERGEBNIS", K.PAD, K.TITLE_BASE, K.TITLE_MAX_W, K.TITLE_CAP, K.TITLE_MIN_CAP);
  ctx.fillStyle = "#8FA3D9";
  skewFit(L.mdText, K.PAD, K.MD_BASE, K.COL_W, K.MD_CAP, K.MD_MIN_CAP);
  ctx.fillStyle = "rgba(255,255,255,.68)";
  skewFit(L.ligaText, K.PAD, K.LIGA_BASE, K.COL_W, K.LIGA_CAP, K.LIGA_MIN_CAP);

  drawFixtureRow(K, K.ROW1_CY, L.links.img,  L.mL, L.links.name,  L.scoreL);
  drawFixtureRow(K, K.ROW2_CY, L.rechts.img, L.mR, L.rechts.name, L.scoreR);
  drawFixtureDivider(K);

  ctx.fillStyle = "rgba(255,255,255,.5)";
  setFont(sizeForCap(K.SCORER_LABEL_CAP));
  skewText("TORSCHÜTZEN", K.PAD, K.SCORER_TOP, "left");
  ctx.fillStyle = "#FFFFFF";
  setFont(sizeForCap(L.scorerLines.cap));
  L.scorerLines.zeilen.forEach(function(z, i){
    skewText(z, K.PAD, K.SCORER_TOP + K.SCORER_LINE_H + i*K.SCORER_LINE_H, "left");
  });

  drawSponsors();
}

/* Namen mit Komma/* Namen mit Komma aneinanderreihen und namensweise umbrechen — ein Name
   wird nie in der Mitte getrennt. Passt es nicht in maxLines Zeilen,
   wird die Schrift verkleinert. */
function wrapNamen(namen, maxW, cap, maxLines){
  function umbrechen(c){
    setFont(sizeForCap(c));
    const zeilen = [];
    let cur = "";
    namen.forEach(function(n){
      const test = cur ? cur+", "+n : n;
      if(textWidth(test + ",") > maxW && cur){ zeilen.push(cur+","); cur = n; }
      else cur = test;
    });
    if(cur) zeilen.push(cur);
    return zeilen;
  }
  let c = cap;
  let zeilen = umbrechen(c);
  while((zeilen.length > maxLines ||
         zeilen.some(function(z){ return textWidth(z) > maxW; })) && c > 15){
    c -= 1;
    zeilen = umbrechen(c);
  }
  return { cap:c, lineH:layoutFor().SCORER_LINE_H, zeilen:zeilen };
}
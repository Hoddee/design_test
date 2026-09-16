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
  const K = LAYOUT;
  const L = { typ:"ergebnis" };
  layoutCommon(L);

  /* VS. mittig zwischen den Innenkanten der Wappen — wie in der Spielankündigung */
  const innenL = K.CREST_L + L.mL.w/2;
  const innenR = K.CREST_R - L.mR.w/2;
  L.vsCap = 46;
  setFont(sizeForCap(L.vsCap));
  while(textWidth("VS.") > (innenR - innenL) - 28 && L.vsCap > 30){
    L.vsCap -= 1;
    setFont(sizeForCap(L.vsCap));
  }
  L.vsCX = (innenL + innenR)/2 - L.vsCap*0.09;

  /* Teamnamen wie in der Spielankündigung */
  const maxWL = 2 * (K.CREST_L - K.PAD + 10);
  L.nameL = wrapLines(L.links.name.toUpperCase(),  maxWL, K.NAME_CAP, 2);
  L.nameR = wrapLines(L.rechts.name.toUpperCase(), 310,   K.NAME_CAP, 2);

  /* Der Spielstand rückt nach unten, wenn ein Name zwei Zeilen braucht —
     so bleibt der Abstand immer gleich, statt bei Zweizeilern zu klemmen */
  const nameLines  = Math.max(L.nameL.zeilen.length, L.nameR.zeilen.length);
  const nameBottom = K.NAME_BASE + (nameLines - 1) * Math.max(L.nameL.lineH, L.nameR.lineH);
  L.scoreBase = nameBottom + K.SCORE_GAP + K.SCORE_CAP;

  /* Tore in Anzeigereihenfolge: links steht die Heimmannschaft */
  const own = draft.goalsOwn === "" ? "–" : String(draft.goalsOwn);
  const opp = draft.goalsOpp === "" ? "–" : String(draft.goalsOpp);
  L.scoreL = L.links.own  ? own : opp;
  L.scoreR = L.rechts.own ? own : opp;
  setFont(sizeForCap(K.SCORE_CAP));
  L.scoreWR = textWidth(L.scoreR);

  /* Torschützen: Der Block endet unten auf fester Grundlinie und wächst
     nach oben. Wie viele Zeilen er bekommen darf, hängt davon ab, wie viel
     Platz unter dem Spielstand noch frei ist. */
  const frei = K.SCORER_BOTTOM - (L.scoreBase + K.SCORE_GAP);
  const maxLines = Math.max(1, Math.min(K.SCORER_MAX_LINES,
    Math.floor((frei - K.SCORER_LABEL_CAP - 2) / K.SCORER_LINE_H)));

  const namen = torschuetzenTexte().map(function(n){ return n.toUpperCase(); });
  if(namen.length <= 2 && namen.length <= maxLines){
    L.scorerLines = { cap:K.SCORER_CAP, lineH:K.SCORER_LINE_H, zeilen:namen };
  } else {
    L.scorerLines = wrapNamen(namen, L.colW - K.PAD, K.SCORER_CAP, maxLines);
  }
  const n = L.scorerLines.zeilen.length;
  L.scorerFirstBase = K.SCORER_BOTTOM - (n - 1) * K.SCORER_LINE_H;
  L.scorerLabelBase = L.scorerFirstBase - K.SCORER_LINE_H - 2;

  setFont(sizeForCap(L.scorerLines.cap));
  L.scorerKante = K.PAD + Math.max(
    fittedWidth("TORSCHÜTZEN:", 400, K.SCORER_LABEL_CAP, 18),
    Math.max.apply(null, L.scorerLines.zeilen.map(function(z){ return textWidth(z); }))
  );

  function hindernisse(){
    const nameLinesH = L.nameR.zeilen.length * L.nameR.lineH;
    return [
      { y0:258, y1:300, x:L.ligaKante },
      { y0:K.CREST_CY - L.mR.h/2, y1:K.CREST_CY + L.mR.h/2, x:K.CREST_R + L.mR.w/2 },
      { y0:K.NAME_BASE - K.NAME_CAP - 4, y1:K.NAME_BASE + nameLinesH - L.nameR.lineH + 6,
        x:K.CREST_R + L.nameR.breite/2 },
      { y0:L.scoreBase - K.SCORE_CAP - 6, y1:L.scoreBase + 8, x:K.CREST_R + L.scoreWR/2 },
      { y0:L.scorerLabelBase - K.SCORER_LABEL_CAP - 4, y1:K.SCORER_BOTTOM + 6, x:L.scorerKante }
    ];
  }

  function platzSchaffen(){
    if(L.nameR.breite <= K.PAIR_WRAP_WIDTH) return false;
    L.nameR = wrapLines(L.rechts.name.toUpperCase(), K.PAIR_WRAP_WIDTH, K.NAME_CAP, 2);
    return true;
  }

  placePlayer(L, hindernisse, platzSchaffen);
  return L;
}

function drawErgebnis(){
  const K = LAYOUT;
  const L = computeLayoutErgebnis();

  drawBackground();
  drawPlayer(L);
  drawTopLogo();
  drawHeader(L, "ERGEBNIS");
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

  /* Spielstand: Tore unter dem jeweiligen Wappen, Strich in der Mitte */
  shadowOn(20,.45);
  ctx.fillStyle = "#FFFFFF";
  setFont(sizeForCap(K.SCORE_CAP));
  skewText(L.scoreL, K.CREST_L, L.scoreBase, "center");
  skewText(L.scoreR, K.CREST_R, L.scoreBase, "center");
  const mid   = (K.CREST_L + K.CREST_R)/2;
  const dashW = K.SCORE_CAP * 0.52, dashH = K.SCORE_CAP * 0.19;
  const dashY = L.scoreBase - K.SCORE_CAP * 0.5;
  ctx.beginPath();
  ctx.roundRect(mid - dashW/2, dashY - dashH/2, dashW, dashH, 4);
  ctx.fill();
  shadowOff();

  /* Torschützen — steht immer, notfalls mit Strich */
  shadowOn(14,.45);
  ctx.fillStyle = "#FFFFFF";
  setFont(sizeForCap(K.SCORER_LABEL_CAP));
  skewText("TORSCHÜTZEN:", K.PAD, L.scorerLabelBase);
  setFont(sizeForCap(L.scorerLines.cap));
  L.scorerLines.zeilen.forEach(function(z, i){
    skewText(z, K.PAD, L.scorerFirstBase + i*K.SCORER_LINE_H);
  });
  shadowOff();

  drawSponsors();
}

/* Namen mit Komma aneinanderreihen und namensweise umbrechen — ein Name
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
  return { cap:c, lineH:LAYOUT.SCORER_LINE_H, zeilen:zeilen };
}
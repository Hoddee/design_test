"use strict";

/* ========== Grafiktyp: Ergebnis ==========
   ERGEBNIS · Spieltag · Liga · beide Wappen · großer Spielstand ·
   Torschützen · Spielerbild · Sponsoren
   Maße aus der Referenzgrafik: Spielstand Versalhöhe 114 auf Grundlinie
   688, Torschützen-Block endet auf Grundlinie 825. */

function computeLayoutErgebnis(){
  const K = LAYOUT;
  const L = { typ:"ergebnis" };
  layoutCommon(L);

  /* Tore in Anzeigereihenfolge: links steht die Heimmannschaft */
  const own = draft.goalsOwn === "" ? "–" : String(draft.goalsOwn);
  const opp = draft.goalsOpp === "" ? "–" : String(draft.goalsOpp);
  L.scoreL = L.links.own  ? own : opp;
  L.scoreR = L.rechts.own ? own : opp;

  setFont(sizeForCap(K.SCORE_CAP));
  L.scoreWL = textWidth(L.scoreL);
  L.scoreWR = textWidth(L.scoreR);

  /* Torschützen: jeder auf einer Zeile; passen sie nicht in zwei Zeilen,
     werden sie mit Komma zusammengezogen und notfalls verkleinert. */
  const namen = (draft.scorers||[]).map(function(s){ return s.trim(); }).filter(Boolean);
  L.hatTorschuetzen = namen.length > 0;
  if(L.hatTorschuetzen){
    if(namen.length <= 2){
      L.scorerLines = { cap:K.SCORER_CAP, lineH:K.SCORER_LINE_H,
        zeilen:namen.map(function(n){ return n.toUpperCase(); }) };
    } else {
      L.scorerLines = wrapNamen(namen.map(function(n){ return n.toUpperCase(); }),
                                L.colW - K.PAD, K.SCORER_CAP, 2);
    }
    /* Block endet unten auf fester Grundlinie, wächst nach oben */
    const n = L.scorerLines.zeilen.length;
    L.scorerFirstBase = K.SCORER_BOTTOM - (n - 1) * K.SCORER_LINE_H;
    L.scorerLabelBase = L.scorerFirstBase - K.SCORER_LINE_H;

    setFont(sizeForCap(L.scorerLines.cap));
    L.scorerKante = K.PAD + Math.max(
      fittedWidth("TORSCHÜTZEN:", 400, K.SCORER_LABEL_CAP, 20),
      Math.max.apply(null, L.scorerLines.zeilen.map(function(z){ return textWidth(z); }))
    );
  }

  function hindernisse(){
    const h = [
      { y0:258, y1:300, x:L.ligaKante },
      { y0:K.CREST_CY - L.mR.h/2, y1:K.CREST_CY + L.mR.h/2, x:K.CREST_R + L.mR.w/2 },
      { y0:K.SCORE_BASE - K.SCORE_CAP - 6, y1:K.SCORE_BASE + 8, x:K.CREST_R + L.scoreWR/2 }
    ];
    if(L.hatTorschuetzen){
      h.push({ y0:L.scorerLabelBase - K.SCORER_LABEL_CAP - 4, y1:K.SCORER_BOTTOM + 6, x:L.scorerKante });
    }
    return h;
  }

  placePlayer(L, hindernisse, null);
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

  /* Spielstand: Tore unter dem jeweiligen Wappen, Strich in der Mitte */
  shadowOn(20,.45);
  ctx.fillStyle = "#FFFFFF";
  setFont(sizeForCap(K.SCORE_CAP));
  skewText(L.scoreL, K.CREST_L, K.SCORE_BASE, "center");
  skewText(L.scoreR, K.CREST_R, K.SCORE_BASE, "center");

  const mid = (K.CREST_L + K.CREST_R)/2;
  const dashY = K.SCORE_BASE - K.SCORE_CAP*0.5;
  ctx.beginPath();
  ctx.roundRect(mid - K.SCORE_DASH_W/2, dashY - K.SCORE_DASH_H/2, K.SCORE_DASH_W, K.SCORE_DASH_H, 4);
  ctx.fill();
  shadowOff();

  /* Torschützen */
  if(L.hatTorschuetzen){
    shadowOn(14,.45);
    ctx.fillStyle = "#FFFFFF";
    setFont(sizeForCap(K.SCORER_LABEL_CAP));
    skewText("TORSCHÜTZEN:", K.PAD, L.scorerLabelBase);
    setFont(sizeForCap(L.scorerLines.cap));
    L.scorerLines.zeilen.forEach(function(z, i){
      skewText(z, K.PAD, L.scorerFirstBase + i*K.SCORER_LINE_H);
    });
    shadowOff();
  }

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
         zeilen.some(function(z){ return textWidth(z) > maxW; })) && c > 16){
    c -= 1;
    zeilen = umbrechen(c);
  }
  return { cap:c, lineH:LAYOUT.SCORER_LINE_H, zeilen:zeilen };
}

"use strict";

/* ========== Grafik ========== */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

const render = { template:null, own:null, opponent:null, player:null, sponsors:[] };

async function buildGraphic(){
  const jobs = [];
  if(draft.template) jobs.push(loadImage(draft.template.url).then(function(i){ render.template = i; }));
  if(lib.own)        jobs.push(loadImage(lib.own.url).then(function(i){ render.own = i; }));
  if(draft.opponent) jobs.push(loadImage(draft.opponent.url).then(function(i){ render.opponent = i; }));
  if(draft.player)   jobs.push(loadImage(draft.player.url).then(function(i){ render.player = i; }));
  else render.player = null;

  render.sponsors = [];
  draft.sponsors.forEach(function(s, i){
    jobs.push(loadImage(s.url).then(function(img){ render.sponsors[i] = img; }));
  });

  try{
    await Promise.all(jobs);
  }catch(err){
    console.error(err);
    toast("Ein Bild fehlt — Grafik wird ohne erstellt");
  }

  drawGraphic();
  document.getElementById("resultTitle").textContent = TYPEN[draft.typ].label;
  document.getElementById("hero").style.display = "none";
  document.getElementById("result").classList.add("show");
  document.getElementById("result").scrollIntoView({ behavior:"smooth", block:"start" });
}

/* Schrift der Grafik.
   Die Vorlage nutzt "Zing Rust Base" (kommerziell, Fontfabric). Anton ist die
   nächstliegende frei nutzbare Entsprechung: gleiche Bauart, sehr fett und
   schmal. Anton hat keine echte Kursive, die Neigung entsteht deshalb über
   eine Scherung beim Zeichnen. */
/* Schrift der Grafik: Zing Rust Demo Base, dieselbe wie in der Vorlage.
   Die Schrift bringt ihre Neigung von 10 Grad bereits mit, es wird also
   nichts künstlich geschert. Fällt sie aus, springt Anton ein. */
const GRAPHIC_FONT = "'"+FONT_NAME+"', 'Anton', sans-serif";
const CAP_ZING  = 0.715;  /* Versalhöhe, im Browser nachgemessen */
const CAP_ANTON = 0.87;   /* Versalhöhe der Ersatzschrift */

function capRatio(){ return fontReady ? CAP_ZING : CAP_ANTON; }
function stretch(){  return fontReady ? 1.0 : 1.12; }
function skewAngle(){ return fontReady ? 0 : Math.tan(10*Math.PI/180); }

function setFont(size){
  ctx.font = "400 "+size+"px "+GRAPHIC_FONT;
}

/* Schriftgröße aus gewünschter Versalhöhe */
function sizeForCap(capHeight){
  return Math.round(capHeight / capRatio());
}

function textWidth(text){
  return ctx.measureText(text).width * stretch();
}

/* Text auf der Grundlinie bei x/y */
function skewText(text, x, y, align){
  if(!text) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(stretch(), 0, -skewAngle(), 1, 0, 0);
  ctx.textAlign = align || "left";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/* Text, der bei Überlänge kleiner gesetzt wird */
function skewFit(text, x, y, maxW, capHeight, minCap, align){
  if(!text) return capHeight;
  let cap = capHeight;
  setFont(sizeForCap(cap));
  while(textWidth(text) > maxW && cap > (minCap || 14)){
    cap -= 1;
    setFont(sizeForCap(cap));
  }
  skewText(text, x, y, align);
  return cap;
}

/* Zeichenhilfen */

/* Sichtbaren Bildinhalt ermitteln: viele Logos haben breite transparente
   Ränder, die sonst mitskaliert würden und das Logo optisch schrumpfen lassen. */
const boxCache = {};
function contentBox(img){
  const key = img.src;
  if(boxCache[key]) return boxCache[key];

  const fallback = { x:0, y:0, w:img.width, h:img.height, fill:0.8 };
  try{
    const max = 260;
    const s = Math.min(1, max/Math.max(img.width, img.height));
    const cw = Math.max(1, Math.round(img.width*s));
    const ch = Math.max(1, Math.round(img.height*s));
    const off = document.createElement("canvas");
    off.width = cw; off.height = ch;
    const octx = off.getContext("2d", { willReadFrequently:true });
    octx.drawImage(img, 0, 0, cw, ch);
    const px = octx.getImageData(0, 0, cw, ch).data;

    let minX = cw, minY = ch, maxX = -1, maxY = -1, opak = 0;
    const rowLeft = new Array(ch).fill(-1);
    const rowRight = new Array(ch).fill(-1);
    for(let y = 0; y < ch; y++){
      for(let x = 0; x < cw; x++){
        if(px[(y*cw + x)*4 + 3] > 12){
          opak++;
          if(rowLeft[y] < 0) rowLeft[y] = x;
          rowRight[y] = x;
          if(x < minX) minX = x;
          if(x > maxX) maxX = x;
          if(y < minY) minY = y;
          if(y > maxY) maxY = y;
        }
      }
    }
    if(maxX < 0){ boxCache[key] = fallback; return fallback; }

    const bw = maxX - minX + 1, bh = maxY - minY + 1;

    /* Linke Kontur in 48 Höhenbändern, relativ zum Inhaltsrahmen und in
       Originalpixeln. Damit lässt sich prüfen, wie weit ein Spielerbild
       auf einer bestimmten Höhe nach links reicht. */
    const BANDS = 48;
    const leftProfile = [], rightProfile = [];
    for(let k = 0; k < BANDS; k++){
      const y0 = minY + Math.floor(bh * k / BANDS);
      const y1 = minY + Math.floor(bh * (k+1) / BANDS);
      let m = Infinity, r = -Infinity;
      for(let y = y0; y < Math.max(y0+1, y1); y++){
        if(rowLeft[y]  >= 0 && rowLeft[y]  < m) m = rowLeft[y];
        if(rowRight[y] >= 0 && rowRight[y] > r) r = rowRight[y];
      }
      leftProfile.push(m === Infinity ? bw/s : (m - minX)/s);
      rightProfile.push(r === -Infinity ? 0 : (r - minX)/s);
    }
    const box = {
      x: minX/s,
      y: minY/s,
      w: bw/s,
      h: bh/s,
      /* Anteil sichtbarer Pixel innerhalb des Inhaltsrahmens —
         ein runder oder spitzer Umriss füllt seinen Rahmen weniger
         als ein Schild und würde bei gleicher Rahmengröße kleiner wirken */
      fill: opak / (bw*bh),
      leftProfile: leftProfile,
      rightProfile: rightProfile
    };
    boxCache[key] = box;
    return box;
  }catch(err){
    boxCache[key] = fallback;
    return fallback;
  }
}

/* Zeichnet nur den sichtbaren Teil des Bildes, zentriert auf cx/cy */
function fitContain(img, cx, cy, maxW, maxH){
  const b = contentBox(img);
  const s = Math.min(maxW/b.w, maxH/b.h);
  const w = b.w*s, h = b.h*s;
  ctx.drawImage(img, b.x, b.y, b.w, b.h, cx-w/2, cy-h/2, w, h);
  return { w:w, h:h };
}

/* Maße für ein Wappen: alle Wappen bekommen dieselbe Höhe wie das
   eigene Vereinswappen, die Breite folgt aus der Form. Nur sehr breite
   Wappen werden über maxW gebremst. Zeichnet nichts. */
function measureHeight(img, height, maxW){
  const b = contentBox(img);
  let s = height / b.h;
  if(b.w * s > maxW) s = maxW / b.w;
  return { b:b, w:b.w*s, h:b.h*s };
}

function drawMeasured(img, m, cx, cy){
  ctx.drawImage(img, m.b.x, m.b.y, m.b.w, m.b.h, cx - m.w/2, cy - m.h/2, m.w, m.h);
}

function shadowOn(blur, alpha){
  ctx.shadowColor = "rgba(0,0,0,"+(alpha||0.4)+")";
  ctx.shadowBlur = blur||16;
  ctx.shadowOffsetY = 3;
}
function shadowOff(){
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function drawPin(x, y, r){
  ctx.save();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.arc(x, y - r*0.18, r*0.82, Math.PI*0.86, Math.PI*0.14, false);
  ctx.lineTo(x, y + r*0.95);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - r*0.18, r*0.3, 0, Math.PI*2);
  ctx.stroke();
  ctx.restore();
}

function drawClock(x, y, r){
  ctx.save();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.arc(x, y, r*0.86, 0, Math.PI*2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - r*0.46);
  ctx.lineTo(x, y);
  ctx.lineTo(x + r*0.36, y + r*0.2);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

/* ---------- Textumbruch ---------- */

/* Zerlegt einen Text in höchstens maxLines Zeilen, die in maxW passen.
   Reicht das nicht, wird die Schrift verkleinert. Zeichnet nichts. */
function wrapLines(text, maxW, cap, maxLines){
  const teile = text.split(/\s+/).filter(Boolean);
  function umbrechen(c){
    setFont(sizeForCap(c));
    const zeilen = [];
    let cur = "";
    teile.forEach(function(t){
      const test = cur ? cur+" "+t : t;
      if(textWidth(test) > maxW && cur){ zeilen.push(cur); cur = t; }
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
  setFont(sizeForCap(c));
  const breite = Math.max.apply(null, zeilen.map(function(z){ return textWidth(z); }));
  return { cap:c, zeilen:zeilen, breite:breite, lineH:Math.round(c*1.36) };
}

/* Zeichnet das Ergebnis von wrapLines zentriert; die erste Zeile steht
   auf grundlinie, weitere wachsen nach unten */
function drawLines(res, cx, grundlinie){
  setFont(sizeForCap(res.cap));
  res.zeilen.forEach(function(z, i){
    skewText(z, cx, grundlinie + i*res.lineH, "center");
  });
}

/* Breite eines einzeiligen Textes nach der Verkleinerungslogik von skewFit */
function fittedWidth(text, maxW, cap, minCap){
  let c = cap;
  setFont(sizeForCap(c));
  while(textWidth(text) > maxW && c > (minCap||14)){ c -= 1; setFont(sizeForCap(c)); }
  return textWidth(text);
}

/* ---------- Zeichnen ---------- */

function drawTemplateFrom(yStart){
  if(!render.template) return;
  const t = render.template;
  const ts = Math.max(W/t.width, H/t.height);
  const tw = t.width*ts, th = t.height*ts;
  const tx = (W-tw)/2, ty = (H-th)/2;
  if(yStart <= 0){
    ctx.drawImage(t, tx, ty, tw, th);
  } else {
    const quellY = (yStart - ty) / ts;
    ctx.drawImage(t, 0, quellY, t.width, t.height - quellY, tx, yStart, tw, H - yStart);
  }
}

/* Wie drawTemplateFrom, aber nur ein horizontaler Streifen — für Vorlagen,
   bei denen ein Bildelement (z. B. ein Farbband) über dem Spielerbild
   liegen soll, ohne den Bereich darunter zu verdecken. */
function drawTemplateStrip(y0, y1){
  if(!render.template) return;
  const t = render.template;
  const ts = Math.max(W/t.width, H/t.height);
  const tw = t.width*ts, th = t.height*ts;
  const tx = (W-tw)/2, ty = (H-th)/2;
  const sy0 = (y0 - ty) / ts, sy1 = (y1 - ty) / ts;
  ctx.drawImage(t, 0, sy0, t.width, sy1 - sy0, tx, y0, tw, y1 - y0);
}

/* ========== Gemeinsame Layout-Bausteine ==========
   Beide Grafiktypen teilen Kopfzeile, Wappenreihe, Spielerbild und
   Sponsorenleiste. Die typspezifischen Teile (Ort/Zeit bzw. Ergebnis)
   liegen in den layout-*.js-Dateien. */

/* Heim/Gast-Zuordnung, Wappenmaße und Kopfzeilentexte */
function layoutCommon(L){
  const K = layoutFor();
  L.heim = draft.homeAway !== "auswaerts";
  const oppName = draft.opponent ? draft.opponent.name : "Gegner";

  /* Heim steht links, Gast rechts */
  L.links  = L.heim ? { img:render.own,      name:CLUB.name, own:true }
                    : { img:render.opponent, name:oppName,   own:false };
  L.rechts = L.heim ? { img:render.opponent, name:oppName,   own:false }
                    : { img:render.own,      name:CLUB.name, own:true };

  const hL = L.links.own  ? K.CREST_H : K.CREST_H_OPP;
  const hR = L.rechts.own ? K.CREST_H : K.CREST_H_OPP;
  L.mL = L.links.img  ? measureHeight(L.links.img,  hL, K.CREST_MAX_W) : { w:200, h:hL };
  L.mR = L.rechts.img ? measureHeight(L.rechts.img, hR, K.CREST_MAX_W) : { w:200, h:hR };

  let mdRoh = (draft.matchday||"").trim();
  let mdZahl = mdRoh.replace(/^spieltag\s*/i,"").replace(/\.$/,"");
  L.mdText   = (/^\d+$/.test(mdZahl) ? "SPIELTAG "+mdZahl+"." : (mdRoh || "SPIELTAG")).toUpperCase();
  L.ligaText = (draft.competition||"").toUpperCase();

  L.hasPlayer = !!render.player;
  L.colW = L.hasPlayer ? K.COL_W : K.COL_W_FREE;
  /* Bei rechtsbündigem Satz ist die linke Kante der Liga-Zeile das
     Hindernis für ein Spielerbild, das links steht. */
  const ligaW = fittedWidth(L.ligaText, L.colW, K.LIGA_CAP, 22);
  L.ligaKante = K.ALIGN === "right" ? K.TEXT_X - ligaW : K.PAD + ligaW;
}

/* Spielerbild platzieren.
   hindernisse(): liefert die linken Elemente mit Höhenbereich und rechter
   Kante — der Spieler wird zeilenweise dagegen geprüft.
   platzSchaffen(): optional; darf das Layout verändern (z. B. einen Namen
   umbrechen) und gibt true zurück, wenn es das getan hat. */
function placePlayer(L, hindernisse, platzSchaffen){
  const K = layoutFor();
  if(!L.hasPlayer){ L.player = null; return; }

  /* Steht der Spieler links, ist seine rechte Kontur maßgeblich und die
     Hindernisse liegen rechts von ihm — die Rechnung wird gespiegelt. */
  const linksSeite = K.PLAYER_SIDE === "left";

  function grenzeFuer(b, s, y, h){
    const prof = linksSeite ? b.rightProfile : b.leftProfile;
    let need = linksSeite ? Infinity : -Infinity;
    hindernisse().forEach(function(hd){
      const f0 = (hd.y0 - y) / h, f1 = (hd.y1 - y) / h;
      if(f1 <= 0 || f0 >= 1) return;
      const k0 = Math.max(0, Math.floor(f0 * prof.length));
      const k1 = Math.min(prof.length - 1, Math.ceil(f1 * prof.length));
      if(linksSeite){
        let rechts = -Infinity;
        for(let k = k0; k <= k1; k++) if(prof[k] > rechts) rechts = prof[k];
        if(rechts === -Infinity) return;
        const x = hd.x - K.PLAYER_GAP - rechts * s;   /* hd.x = linke Kante des Inhalts */
        if(x < need) need = x;
      } else {
        let links = Infinity;
        for(let k = k0; k <= k1; k++) if(prof[k] < links) links = prof[k];
        if(links === Infinity) return;
        const x = hd.x + K.PLAYER_GAP - links * s;
        if(x > need) need = x;
      }
    });
    return need;
  }

  const R = K.RIGHT_EDGE;
  const b = contentBox(render.player);
  const pname = (draft.player && draft.player.name) || "";
  const zwei = /\bund\b/i.test(pname) || (b.w / b.h) > 0.72;

  const oben = zwei ? K.HEAD_TOP_PAIR : K.HEAD_TOP;
  let s = (K.BAR_BOTTOM - oben) / b.h;
  if(b.w * s > K.PLAYER_MAX_W) s = K.PLAYER_MAX_W / b.w;
  let w = b.w*s, h = b.h*s, y = K.BAR_BOTTOM - h;

  let grenze = grenzeFuer(b, s, y, h);
  let x;

  if(linksSeite){
    /* Gespiegelt: der Spieler sitzt am linken Rand, grenze ist die
       weiteste erlaubte Position nach rechts. */
    const L0 = K.PLAYER_LEFT_EDGE;
    x = Math.min(L0, grenze);
    if(L0 - x > K.PAIR_WRAP_TRIGGER && platzSchaffen && platzSchaffen()){
      grenze = grenzeFuer(b, s, y, h);
      x = Math.min(L0, grenze);
    }
    if(L0 - x > K.PLAYER_OVERHANG_MAX){
      /* zu viel Anschnitt nötig → verkleinern statt wegschieben */
      const ziel = L0 - K.PLAYER_OVERHANG_MAX;
      const alteBreite = w;
      s *= (grenze + w - ziel) / alteBreite;
      w = b.w*s; h = b.h*s; y = K.BAR_BOTTOM - h;
      grenze = grenzeFuer(b, s, y, h);
      x = Math.min(ziel, grenze);
    }
  } else if(zwei){
    x = Math.max(R - w, grenze);
    if(x - (R - w) > K.PAIR_WRAP_TRIGGER && platzSchaffen && platzSchaffen()){
      grenze = grenzeFuer(b, s, y, h);
      x = Math.max(R - w, grenze);
    }
    if(x - (R - w) > K.PLAYER_OVERHANG_MAX){
      s *= (R + K.PLAYER_OVERHANG_MAX - grenze) / w;
      w = b.w*s; h = b.h*s; y = K.BAR_BOTTOM - h;
      grenze = grenzeFuer(b, s, y, h);
      x = Math.min(Math.max(R - w + K.PLAYER_OVERHANG_MAX, grenze), R - w + K.PLAYER_OVERHANG_MAX);
    }
  } else {
    x = R - w - K.PLAYER_INSET;
    if(x < grenze){
      s *= (R - K.PLAYER_INSET - grenze) / w;
      w = b.w*s; h = b.h*s; y = K.BAR_BOTTOM - h;
      grenze = grenzeFuer(b, s, y, h);
      x = Math.max(R - w - K.PLAYER_INSET, grenze);
    }
  }
  L.player = { b:b, x:x, y:y, w:w, h:h };
}

/* ---------- Zeichenbausteine ---------- */

function drawBackground(){
  ctx.clearRect(0,0,W,H);
  ctx.textBaseline = "alphabetic";
  if(render.template) drawTemplateFrom(0);
  else { ctx.fillStyle = "#0F4C8A"; ctx.fillRect(0,0,W,H); }
}

/* Spielerbild vor den Texten; endet hinter dem Balken der Vorlage */
function drawPlayer(L){
  if(!L.player) return;
  const p = L.player;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.22)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetX = -8;
  ctx.drawImage(render.player, p.b.x, p.b.y, p.b.w, p.b.h, p.x, p.y, p.w, p.h);
  ctx.restore();
  const K = layoutFor();
  if(K.RESTORE_STRIP) drawTemplateStrip(K.RESTORE_STRIP.y0, K.RESTORE_STRIP.y1);
  else drawTemplateFrom(K.BAR_TOP);
}

/* Manche Vorlagen haben keinen Balken — dann zeichnen wir selbst einen
   dezent dunkleren Streifen als Sponsorenzone. Er liegt über dem
   Spielerbild und kaschiert dessen Unterkante. */
function drawStrip(){
  const K = layoutFor();
  if(!K.STRIP) return;
  const S = K.STRIP;
  ctx.fillStyle = S.color;
  ctx.fillRect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0);
}

function drawTopLogo(){
  const K = layoutFor();
  if(render.own) fitContain(render.own, K.LOGO_X, K.LOGO_Y, K.LOGO_SIZE, K.LOGO_SIZE);
}

/* Kopfzeile — Grundlinien 178 / 251 / 296 wie in der Vorlage */
function drawHeader(L, titel){
  const K = layoutFor();
  const ax = K.ALIGN === "right" ? K.TEXT_X : K.PAD;
  const al = K.ALIGN || "left";
  const minT = K.TITLE_MIN_CAP || 90, minM = K.MD_MIN_CAP || 36, minL = K.LIGA_MIN_CAP || 22;
  shadowOn(20,.45);
  ctx.fillStyle = "#FFFFFF";
  skewFit(titel, ax, K.TITLE_BASE, K.TITLE_MAX_W, K.TITLE_CAP, minT, al);
  ctx.fillStyle = "#AFC3D8";
  skewFit(L.mdText, ax, K.MD_BASE, L.colW, K.MD_CAP, minM, al);
  ctx.fillStyle = "#FFFFFF";
  skewFit(L.ligaText, ax, K.LIGA_BASE, L.colW, K.LIGA_CAP, minL, al);
  shadowOff();
}

function drawCrests(L){
  const K = layoutFor();
  shadowOn(22,.4);
  if(L.links.img)  drawMeasured(L.links.img,  L.mL, K.CREST_L, K.CREST_CY);
  if(L.rechts.img) drawMeasured(L.rechts.img, L.mR, K.CREST_R, K.CREST_CY);
  shadowOff();
}

/* Sponsorenleiste — Überschrift auf 923, Logos zwischen 950 und 1042 */
function drawSponsors(){
  const K = layoutFor();
  if(render.sponsors.length === 0) return;
  ctx.fillStyle = "#FFFFFF";
  setFont(sizeForCap(27));
  const x0 = K.SPONSOR_X0, x1 = K.SPONSOR_X1;
  skewText("WIRD PRÄSENTIERT VON", (x0 + x1)/2, K.SPONSOR_LABEL_BASE, "center");
  const n = render.sponsors.length;
  const areaTop = K.SPONSOR_TOP, areaBottom = K.SPONSOR_BOTTOM;
  const cellW = (x1 - x0) / n;
  const maxLogoW = Math.min(cellW - 24, 330);
  const maxLogoH = Math.min(areaBottom - areaTop, 92);
  render.sponsors.forEach(function(img, i){
    if(!img) return;
    fitContain(img, x0 + cellW*i + cellW/2, (areaTop + areaBottom)/2, maxLogoW, maxLogoH);
  });
}


/* Zeichnet die Grafik passend zum gewählten Typ */
function drawGraphic(){
  if(draft.typ === "ergebnis") drawErgebnis();
  else drawMatchday();
}

/* ========== Band-Begegnung (Vorlage 3) ==========
   Statt Datum oder Spielstand allein trägt das Band die Paarung:
   Heimname – Trenner – Gastname. Der Trenner ist "VS." bei der
   Ankündigung und der Spielstand beim Ergebnis. */

function bandBegegnung(L, trenner, trennerCap){
  const K = layoutFor();
  const B = K.BAND;
  const innenL = B.x0 + B.padX;
  const innenR = W - B.padX;
  const mitte  = (innenL + innenR) / 2;

  const tCap = trennerCap || B.nameCap;
  setFont(sizeForCap(tCap));
  const tW = textWidth(trenner);

  /* Platz je Name, abzüglich Trenner und Luft */
  const luft = 26;
  const platz = (innenR - innenL - tW - 2*luft) / 2;

  const l = wrapLines(L.links.name.toUpperCase(),  platz, B.nameCap, 2);
  const r = wrapLines(L.rechts.name.toUpperCase(), platz, B.nameCap, 2);

  return {
    trenner:trenner, trennerCap:tCap, tW:tW, mitte:mitte, luft:luft,
    l:l, r:r,
    xL: mitte - tW/2 - luft,   /* rechte Kante des Heimnamens */
    xR: mitte + tW/2 + luft    /* linke Kante des Gastnamens */
  };
}

function drawBand(L, P){
  const K = layoutFor();
  const B = K.BAND;
  const cy = (B.y0 + B.y1) / 2;

  shadowOn(12,.4);
  ctx.fillStyle = "#FFFFFF";

  /* Namen senkrecht mittig, mehrzeilig nach oben und unten verteilt */
  function block(res, x, align){
    setFont(sizeForCap(res.cap));
    const n = res.zeilen.length;
    const start = cy + res.cap/2 - (n - 1) * res.lineH / 2;
    res.zeilen.forEach(function(z, i){
      skewText(z, x, start + i*res.lineH, align);
    });
  }
  block(P.l, P.xL, "right");
  block(P.r, P.xR, "left");

  setFont(sizeForCap(P.trennerCap));
  skewText(P.trenner, P.mitte, cy + P.trennerCap/2 - 2, "center");
  shadowOff();
}


/* ========== Spielkarte (Vorlage 3) ==========
   Statt Wappen nebeneinander: zwei Zeilen übereinander, jede mit Wappen,
   Name und optional einem rechtsbündigen Wert (Ergebnis-Grafik). Dazwischen
   eine dünne Trennlinie. Lebt in einer eigenen linken Spalte, daneben
   bleibt für das Spielerbild die ganze rechte Bildhälfte frei. */

function drawFixtureRow(K, cy, img, m, name, value){
  if(img) drawMeasured(img, m, K.ROW_CREST_X, cy);
  ctx.fillStyle = "#FFFFFF";

  /* Der Name darf nicht bis unter den Wert reichen — dessen Breite geht
     als zusätzlicher rechter Rand in die verfügbare Breite ein. Lange
     Vereinsnamen (Spielgemeinschaften) brechen dafür lieber auf zwei
     Zeilen um, statt bis zur Unlesbarkeit zu schrumpfen. */
  let maxW = K.ROW_NAME_MAX_W;
  if(value !== undefined){
    setFont(sizeForCap(K.ROW_SCORE_CAP));
    maxW -= textWidth(value) + 16;
  }
  const res = wrapLines(name.toUpperCase(), maxW, K.ROW_NAME_CAP, 2);
  const n = res.zeilen.length;
  const start = cy + res.cap*0.34 - (n - 1) * res.lineH / 2;
  res.zeilen.forEach(function(z, i){
    skewText(z, K.ROW_TEXT_X, start + i*res.lineH, "left");
  });

  if(value !== undefined){
    setFont(sizeForCap(K.ROW_SCORE_CAP));
    skewText(value, K.PANEL.x1 - K.PAD, cy + K.ROW_SCORE_CAP*0.34, "right");
  }
}

function drawFixtureDivider(K){
  const y = (K.ROW1_CY + K.ROW2_CY) / 2;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(K.PAD, y);
  ctx.lineTo(K.PANEL.x1 - K.PAD, y);
  ctx.stroke();
  ctx.restore();
}

/* Karten-Panel: deckendes, leicht abgestuftes Dunkel über der linken
   Bildhälfte, mit einer schmalen Akzentlinie an der Kante zum Foto —
   trennt Kartentext und Spielerfoto klar, ohne die Fototextur ganz zu
   verdecken (Verlauf statt Volltonfläche). */
function drawFixturePanel(K){
  const P = K.PANEL;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0,   "rgba(7,9,13,.95)");
  g.addColorStop(1,   "rgba(5,6,9,.98)");
  ctx.fillStyle = g;
  ctx.fillRect(P.x0, 0, P.x1 - P.x0, H);

  ctx.fillStyle = K.PANEL_ACCENT || "#3A66E1";
  ctx.fillRect(P.x1 - 3, 0, 3, H);
}

/* Meta-Paare unter der Spielkarte: kleines Label, darunter der Wert —
   für Ort/Anstoß bei der Ankündigung. */
function drawMetaPair(K, y, label, value){
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.5)";
  setFont(sizeForCap(K.META_LABEL_CAP));
  skewText(label, K.PAD, y, "left");
  ctx.fillStyle = "#FFFFFF";
  skewFit(value, K.PAD, y + K.META_GAP, K.PANEL.x1 - K.PAD*2, K.META_VALUE_CAP, 18);
  ctx.restore();
}
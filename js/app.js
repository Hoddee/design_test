"use strict";

/* ========== Ansichten ========== */
function zeigeAnsicht(name){
  document.querySelectorAll(".view").forEach(function(v){
    v.classList.toggle("active", v.dataset.view === name);
  });
  document.querySelectorAll(".nav-item").forEach(function(b){
    const isActive = b.dataset.view === name;
    b.classList.toggle("active", isActive);
    /* ARIA: aria-current für aktive Navigationsschaltfläche */
    b.setAttribute("aria-current", isActive ? "page" : "false");
  });
  /* Fokus zum Seiteninhalt führen (Accessibility) */
  const main = document.getElementById("mainContent");
  if(main) main.focus({ preventScroll:true });
  window.scrollTo({ top:0 });
}
document.querySelectorAll(".nav-item").forEach(function(b){
  b.addEventListener("click", function(){ zeigeAnsicht(b.dataset.view); });
});

/* ========== Toast ========== */
let toastTimer = null;
function toast(text, dauer){
  const el = document.getElementById("toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ el.classList.remove("show"); }, dauer || 2400);
}

/* ========== Einstellungen ========== */
function setzeThema(theme){
  document.documentElement.dataset.theme = theme;
  try{ localStorage.setItem("theme", theme); }catch(e){}
  document.querySelectorAll(".swatch").forEach(function(b){
    const isActive = b.dataset.theme === theme;
    b.classList.toggle("active", isActive);
    /* ARIA: aria-pressed für Farbwahl-Buttons */
    b.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}
function setzeModus(mode){
  document.documentElement.dataset.mode = mode;
  try{ localStorage.setItem("mode", mode); }catch(e){}
  document.querySelectorAll(".segmented [data-mode]").forEach(function(b){
    const isActive = b.dataset.mode === mode;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}
document.querySelectorAll(".swatch").forEach(function(b){
  b.addEventListener("click", function(){ setzeThema(b.dataset.theme); });
});
document.querySelectorAll(".segmented [data-mode]").forEach(function(b){
  b.addEventListener("click", function(){ setzeModus(b.dataset.mode); });
});
setzeThema(document.documentElement.dataset.theme || "blau");
setzeModus(document.documentElement.dataset.mode || "dark");

document.getElementById("factClub").textContent  = CLUB.name;
document.getElementById("factLiga").textContent  = CLUB.competition;
document.getElementById("factVenue").textContent = CLUB.venue;

/* ========== Vorlagenfarbe ========== */
const TEMPLATE_PRESETS = [
  { key:"blau",    primary:"#EAF3FF", secondary:"#0F3D73" },
  { key:"gruen",   primary:"#EAFBF1", secondary:"#0E4A2B" },
  { key:"rot",     primary:"#FFF1EF", secondary:"#7A1414" },
  { key:"gold",    primary:"#FFF8E8", secondary:"#7A5410" },
  { key:"grau",    primary:"#F3F5F8", secondary:"#2B323D" },
  { key:"schwarz", primary:"#F2F2F2", secondary:"#101010" }
];

let TEMPLATE_RECOLOR   = localStorage.getItem("tplRecolor") === "1";
let TEMPLATE_PRIMARY   = localStorage.getItem("tplPrimary")   || "#EAF3FF";
let TEMPLATE_SECONDARY = localStorage.getItem("tplSecondary") || "#0F3D73";

const tplPrimaryHex      = document.getElementById("tplPrimaryHex");
const tplSecondaryHex    = document.getElementById("tplSecondaryHex");
const tplPrimarySwatch   = document.getElementById("tplPrimarySwatch");
const tplSecondarySwatch = document.getElementById("tplSecondarySwatch");
const tplPreview         = document.getElementById("tplPreview");
const tplOriginalBtn     = document.getElementById("tplOriginal");

function gueltigerHex(v){ return /^#[0-9a-f]{6}$/i.test(v); }

function tplUpdatePreview(){
  tplPreview.style.background = "linear-gradient(135deg,"+TEMPLATE_SECONDARY+","+TEMPLATE_PRIMARY+")";

  /* aria-pressed für Original-Button */
  tplOriginalBtn.classList.toggle("active", !TEMPLATE_RECOLOR);
  tplOriginalBtn.setAttribute("aria-pressed", !TEMPLATE_RECOLOR ? "true" : "false");

  document.querySelectorAll("[data-preset]").forEach(function(b){
    const p = TEMPLATE_PRESETS.find(function(x){ return x.key === b.dataset.preset; });
    const isActive = !!p && TEMPLATE_RECOLOR &&
      p.primary.toLowerCase() === TEMPLATE_PRIMARY.toLowerCase() &&
      p.secondary.toLowerCase() === TEMPLATE_SECONDARY.toLowerCase();
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function tplApply(){
  try{
    localStorage.setItem("tplRecolor",   TEMPLATE_RECOLOR ? "1" : "0");
    localStorage.setItem("tplPrimary",   TEMPLATE_PRIMARY);
    localStorage.setItem("tplSecondary", TEMPLATE_SECONDARY);
  }catch(e){}
  tplUpdatePreview();
  /* Nur neu zeichnen wenn eine Grafik bereits sichtbar ist */
  if(document.getElementById("result").classList.contains("show") && draft && draft.template){
    buildGraphic();
  }
}

function tplSetColor(which, hex){
  if(!gueltigerHex(hex)) return;
  TEMPLATE_RECOLOR = true;
  if(which === "primary"){
    TEMPLATE_PRIMARY = hex;
    tplPrimaryHex.value = hex;
    tplPrimarySwatch.style.setProperty("--sw", hex);
  } else {
    TEMPLATE_SECONDARY = hex;
    tplSecondaryHex.value = hex;
    tplSecondarySwatch.style.setProperty("--sw", hex);
  }
  tplApply();
}

tplPrimaryHex.addEventListener("change", function(e){ tplSetColor("primary", e.target.value.trim()); });
tplSecondaryHex.addEventListener("change", function(e){ tplSetColor("secondary", e.target.value.trim()); });

document.querySelectorAll("[data-preset]").forEach(function(b){
  b.addEventListener("click", function(){
    const p = TEMPLATE_PRESETS.find(function(x){ return x.key === b.dataset.preset; });
    if(!p) return;
    TEMPLATE_RECOLOR  = true;
    TEMPLATE_PRIMARY  = p.primary;
    TEMPLATE_SECONDARY = p.secondary;
    tplPrimaryHex.value   = p.primary;   tplPrimarySwatch.style.setProperty("--sw", p.primary);
    tplSecondaryHex.value = p.secondary; tplSecondarySwatch.style.setProperty("--sw", p.secondary);
    tplApply();
  });
});

tplOriginalBtn.addEventListener("click", function(){ TEMPLATE_RECOLOR = false; tplApply(); });

tplPrimarySwatch.style.setProperty("--sw", TEMPLATE_PRIMARY);
tplSecondarySwatch.style.setProperty("--sw", TEMPLATE_SECONDARY);
tplUpdatePreview();

/* ---------- Eigener Farbwähler ---------- */
function hexToRgbA(hex){
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex||"");
  return m ? [parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)] : [255,255,255];
}
function rgbToHex(r,g,b){
  return "#"+[r,g,b].map(function(v){
    return Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,"0");
  }).join("").toUpperCase();
}
function rgbToHsv(r,g,b){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
  let h=0;
  if(d){
    if(max===r) h=((g-b)/d)%6;
    else if(max===g) h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h*=60; if(h<0) h+=360;
  }
  return [h, max===0?0:d/max, max];
}
function hsvToRgb(h,s,v){
  const c=v*s, x=c*(1-Math.abs((h/60)%2-1)), m=v-c;
  let r,g,b;
  if(h<60){r=c;g=x;b=0;}      else if(h<120){r=x;g=c;b=0;}
  else if(h<180){r=0;g=c;b=x;} else if(h<240){r=0;g=x;b=c;}
  else if(h<300){r=x;g=0;b=c;} else{r=c;g=0;b=x;}
  return [(r+m)*255,(g+m)*255,(b+m)*255];
}

let tplPickerTarget = null;
let tplPickerHSV    = [0,0,1];
let tplDraggingSV   = false;

const tplPicker        = document.getElementById("tplPicker");
const tplPickerSV      = document.getElementById("tplPickerSV");
const tplPickerSVCursor = document.getElementById("tplPickerSVCursor");
const tplPickerHue     = document.getElementById("tplPickerHue");
const tplPickerHexInput = document.getElementById("tplPickerHex");
const tplPickerSwatch  = document.getElementById("tplPickerSwatch");

function tplPickerRenderSV(){
  tplPickerSV.style.setProperty("--hue-color","hsl("+tplPickerHSV[0]+",100%,50%)");
}
function tplPickerRenderCursor(){
  tplPickerSVCursor.style.left = (tplPickerHSV[1]*100)+"%";
  tplPickerSVCursor.style.top  = ((1-tplPickerHSV[2])*100)+"%";
}
function tplPickerCommit(){
  const [r,g,b] = hsvToRgb(tplPickerHSV[0],tplPickerHSV[1],tplPickerHSV[2]);
  const hex = rgbToHex(r,g,b);
  tplPickerHexInput.value = hex;
  tplPickerSwatch.style.background = hex;
  if(tplPickerTarget) tplSetColor(tplPickerTarget, hex);
}

function tplOpenPicker(which, anchorEl){
  tplPickerTarget = which;
  const hex = which === "primary" ? TEMPLATE_PRIMARY : TEMPLATE_SECONDARY;
  const [r,g,b] = hexToRgbA(hex);
  tplPickerHSV = rgbToHsv(r,g,b);
  tplPickerHue.value = Math.round(tplPickerHSV[0]);
  tplPickerRenderSV();
  tplPickerRenderCursor();
  tplPickerHexInput.value = hex;
  tplPickerSwatch.style.background = hex;

  /* Position: unterhalb des Anker-Elements, mit Viewport-Korrektur */
  const r0 = anchorEl.getBoundingClientRect();
  let top  = r0.bottom + 10;
  let left = r0.left;
  /* BUG-FIX: Picker fällt nicht aus dem Viewport */
  const pickerW = 236;
  if(left + pickerW > window.innerWidth - 8) left = window.innerWidth - pickerW - 8;
  if(top + 220 > window.innerHeight - 8) top = r0.top - 220 - 10;
  tplPicker.style.left = left + "px";
  tplPicker.style.top  = top  + "px";
  tplPicker.classList.add("open");
  /* Fokus in den Picker für Barrierefreiheit */
  setTimeout(function(){ tplPickerHexInput.focus(); }, 50);
}
function tplClosePicker(){
  tplPicker.classList.remove("open");
  tplPickerTarget = null;
}

tplPrimarySwatch.addEventListener("click", function(e){
  e.stopPropagation();
  (tplPicker.classList.contains("open") && tplPickerTarget==="primary")
    ? tplClosePicker() : tplOpenPicker("primary", this);
});
tplSecondarySwatch.addEventListener("click", function(e){
  e.stopPropagation();
  (tplPicker.classList.contains("open") && tplPickerTarget==="secondary")
    ? tplClosePicker() : tplOpenPicker("secondary", this);
});
document.addEventListener("click", function(e){
  if(tplPicker.classList.contains("open") && !tplPicker.contains(e.target)) tplClosePicker();
});
document.addEventListener("keydown", function(e){
  if(e.key === "Escape" && tplPicker.classList.contains("open")) tplClosePicker();
});
window.addEventListener("scroll", function(){
  if(tplPicker.classList.contains("open")) tplClosePicker();
}, true);

function tplPickerSVFromEvent(e){
  const rect = tplPickerSV.getBoundingClientRect();
  const x = Math.min(Math.max((e.clientX||0) - rect.left, 0), rect.width);
  const y = Math.min(Math.max((e.clientY||0) - rect.top,  0), rect.height);
  tplPickerHSV[1] = x / rect.width;
  tplPickerHSV[2] = 1 - y / rect.height;
  tplPickerRenderCursor();
  tplPickerCommit();
}
tplPickerSV.addEventListener("pointerdown", function(e){
  tplDraggingSV = true;
  tplPickerSV.setPointerCapture(e.pointerId);
  tplPickerSVFromEvent(e);
});
tplPickerSV.addEventListener("pointermove", function(e){ if(tplDraggingSV) tplPickerSVFromEvent(e); });
tplPickerSV.addEventListener("pointerup",   function(){ tplDraggingSV = false; });

tplPickerHue.addEventListener("input", function(e){
  tplPickerHSV[0] = parseFloat(e.target.value);
  tplPickerRenderSV();
  tplPickerCommit();
});
tplPickerHexInput.addEventListener("change", function(e){
  const hex = e.target.value.trim();
  if(!gueltigerHex(hex)) return;
  const [r,g,b] = hexToRgbA(hex);
  tplPickerHSV = rgbToHsv(r,g,b);
  tplPickerHue.value = Math.round(tplPickerHSV[0]);
  tplPickerRenderSV();
  tplPickerRenderCursor();
  if(tplPickerTarget) tplSetColor(tplPickerTarget, hex.toUpperCase());
});

/* ========== Grafik erstellen ========== */
function starteNeu(typ){
  draft = emptyDraft(typ);
  if(lib.templates.length === 1) draft.template = lib.templates[0];
  document.getElementById("result").classList.remove("show");
  document.getElementById("hero").style.display = "block";
  openWizard(0);
}
document.querySelectorAll("[data-start]").forEach(function(btn){
  btn.addEventListener("click", function(){ starteNeu(btn.dataset.start); });
});

document.getElementById("editBtn").addEventListener("click", function(){
  openWizard(stepsFor(draft.typ).length - 1);
});

document.getElementById("newBtn").addEventListener("click", function(){
  document.getElementById("result").classList.remove("show");
  document.getElementById("hero").style.display = "block";
  window.scrollTo({ top:0, behavior:"smooth" });
});

document.getElementById("downloadBtn").addEventListener("click", function(){
  /* Schaltfläche während Export deaktivieren */
  const btn = this;
  btn.disabled = true;
  btn.textContent = "Wird erstellt…";
  try{
    const a = document.createElement("a");
    const gegner = (draft.opponent ? draft.opponent.name : "gegner")
      .toLowerCase()
      .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue")
      .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    const heute = new Date().toISOString().slice(0,10);
    const name = draft.typ === "ergebnis"
      ? "ergebnis-"+heute+"-scf-"+gegner+"-"+(draft.goalsOwn||"0")+"-"+(draft.goalsOpp||"0")
      : "matchday-"+(draft.date||heute)+"-scf-"+gegner;
    a.download = name+".png";
    /* BUG-FIX: canvas.toDataURL kann bei Sicherheitsfehler (CORS-Bild) werfen */
    try{
      a.href = canvas.toDataURL("image/png");
    } catch(corsErr){
      toast("Export fehlgeschlagen: Bild-CORS-Fehler. Bitte Seite neu laden.", 4000);
      btn.disabled = false;
      btn.innerHTML = '<svg style="width:14px;height:14px;display:inline-block;vertical-align:-2px;margin-right:6px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12M8 12l4 4 4-4"/><path d="M4 20h16"/></svg>PNG herunterladen';
      return;
    }
    a.click();
    toast("PNG gespeichert ✓");
  } catch(err){
    toast("Export fehlgeschlagen: "+err.message, 4000);
  } finally {
    /* Button nach kurzer Pause wieder aktivieren */
    setTimeout(function(){
      btn.disabled = false;
      btn.innerHTML = '<svg style="width:14px;height:14px;display:inline-block;vertical-align:-2px;margin-right:6px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12M8 12l4 4 4-4"/><path d="M4 20h16"/></svg>PNG herunterladen';
    }, 1200);
  }
});

/* ========== Start ========== */
document.fonts.ready.then(async function(){
  const ok = await loadLibrary();
  if(ok){
    document.querySelectorAll("[data-start]").forEach(function(b){ b.disabled = false; });
  } else {
    toast("Bibliothek nicht erreichbar — bitte Seite neu laden.", 5000);
  }
});
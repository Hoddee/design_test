"use strict";

/* ========== Ansichten ========== */
function zeigeAnsicht(name){
  document.querySelectorAll(".view").forEach(function(v){
    v.classList.toggle("active", v.dataset.view === name);
  });
  document.querySelectorAll(".nav-item").forEach(function(b){
    b.classList.toggle("active", b.dataset.view === name);
  });
  window.scrollTo({ top:0 });
}
document.querySelectorAll(".nav-item").forEach(function(b){
  b.addEventListener("click", function(){ zeigeAnsicht(b.dataset.view); });
});

/* ========== Toast ========== */
let toastTimer = null;
function toast(text){
  const el = document.getElementById("toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ el.classList.remove("show"); }, 2400);
}

/* ========== Einstellungen ========== */
function setzeThema(theme){
  document.documentElement.dataset.theme = theme;
  try{ localStorage.setItem("theme", theme); }catch(e){}
  document.querySelectorAll(".swatch").forEach(function(b){
    b.classList.toggle("active", b.dataset.theme === theme);
  });
}
function setzeModus(mode){
  document.documentElement.dataset.mode = mode;
  try{ localStorage.setItem("mode", mode); }catch(e){}
  document.querySelectorAll(".segmented [data-mode]").forEach(function(b){
    b.classList.toggle("active", b.dataset.mode === mode);
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
  try{
    const a = document.createElement("a");
    const gegner = (draft.opponent ? draft.opponent.name : "gegner")
      .toLowerCase()
      .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue")
      .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    const heute = new Date().toISOString().slice(0,10);
    const name = draft.typ === "ergebnis"
      ? "ergebnis-"+heute+"-scf-"+gegner+"-"+(draft.goalsOwn||"0")+"-"+(draft.goalsOpp||"0")
      : "matchday-"+(draft.date || heute)+"-scf-"+gegner;
    a.download = name+".png";
    a.href = canvas.toDataURL("image/png");
    a.click();
    toast("PNG gespeichert");
  }catch(err){
    toast("Export fehlgeschlagen: "+err.message);
  }
});

/* ========== Start ========== */
document.fonts.ready.then(async function(){
  const ok = await loadLibrary();
  if(ok){
    document.querySelectorAll("[data-start]").forEach(function(b){ b.disabled = false; });
  } else {
    toast("Bibliothek nicht erreichbar");
  }
});
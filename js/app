"use strict";

/* ========== Aktionen ========== */

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

/* "Angaben ändern" öffnet direkt die Übersicht — von dort führt
   jeder "ändern"-Link zum passenden Schritt und zurück */
document.getElementById("editBtn").addEventListener("click", function(){
  openWizard(stepsFor(draft.typ).length - 1);
});

/* "Neue Grafik" führt zurück zur Typauswahl */
document.getElementById("newBtn").addEventListener("click", function(){
  document.getElementById("result").classList.remove("show");
  document.getElementById("hero").style.display = "block";
  document.getElementById("hero").scrollIntoView({ behavior:"smooth", block:"start" });
});

document.getElementById("downloadBtn").addEventListener("click", function(){
  try{
    const a = document.createElement("a");
    const gegner = (draft.opponent ? draft.opponent.name : "gegner")
      .toLowerCase()
      .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue")
      .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    const heute = new Date().toISOString().slice(0,10);
    let name;
    if(draft.typ === "ergebnis"){
      name = "ergebnis-"+heute+"-scf-"+gegner+"-"+(draft.goalsOwn||"0")+"-"+(draft.goalsOpp||"0");
    } else {
      name = "matchday-"+(draft.date || heute)+"-scf-"+gegner;
    }
    a.download = name+".png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  }catch(err){
    alert("Die Grafik konnte nicht exportiert werden: "+err.message);
  }
});

/* ========== Start ========== */
document.fonts.ready.then(async function(){
  const ok = await loadLibrary();
  if(ok) document.querySelectorAll("[data-start]").forEach(function(b){ b.disabled = false; });
});

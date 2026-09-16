"use strict";

/* ========== Zustand einer Grafik ========== */
const TYPEN = {
  matchday: { label:"Spielankündigung", datei:"matchday" },
  ergebnis: { label:"Ergebnis",         datei:"ergebnis" }
};

function emptyDraft(typ){
  return {
    typ: typ || "matchday",   // "matchday" | "ergebnis"
    template:null,
    homeAway:null,            // "heim" | "auswaerts"
    opponent:null,
    player:null,
    sponsors:[],
    matchday:"",
    competition:CLUB.competition,
    /* Spielankündigung */
    date:"",
    time:"15:00",
    venue:"",
    /* Ergebnis */
    goalsOwn:"",
    goalsOpp:"",
    scorers:[]
  };
}

let draft = emptyDraft();

function nextSunday(){
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

function formatDate(iso){
  if(!iso) return "";
  const p = iso.split("-");
  return p.length===3 ? p[2]+"."+p[1]+"."+p[0] : "";
}

/* ========== Assistent ========== */
const overlay  = document.getElementById("wizOverlay");
const bodyEl   = document.getElementById("wizBody");
const titleEl  = document.getElementById("wizTitle");
const descEl   = document.getElementById("wizDesc");
const stepEl   = document.getElementById("wizStep");
const barEl    = document.getElementById("wizBar");
const backBtn  = document.getElementById("wizBack");
const nextBtn  = document.getElementById("wizNext");
const countEl  = document.getElementById("wizCount");

let stepIndex = 0;
let returnToSummary = false;
let lastFocused = null;

/* Schrittkatalog — jeder Grafiktyp stellt seine Reihenfolge daraus zusammen */
const STEP = {
  template: {
    id:"template", title:"Vorlage", desc:"",
    render:renderTemplateStep,
    valid:function(){ return !!draft.template; }, error:"Bitte eine Vorlage auswählen."
  },
  homeAway: {
    id:"homeAway", title:"Heim oder auswärts?", desc:"",
    render:renderHomeAwayStep,
    valid:function(){ return !!draft.homeAway; }, error:"Bitte Heim oder auswärts wählen."
  },
  opponent: {
    id:"opponent", title:"Gegner", desc:"",
    render:renderOpponentStep,
    valid:function(){ return !!draft.opponent; }, error:"Bitte einen Gegner auswählen."
  },
  result: {
    id:"result", title:"Ergebnis", desc:"",
    render:renderResultStep,
    valid:function(){ return draft.goalsOwn !== "" && draft.goalsOpp !== ""; },
    error:"Bitte beide Torzahlen eintragen."
  },
  player: {
    id:"player", title:"Spielerbild", desc:"Optional",
    render:renderPlayerStep, valid:function(){ return true; }
  },
  sponsors: {
    id:"sponsors", title:"Sponsoren", desc:"Bis zu "+MAX_SPONSORS+", optional",
    render:renderSponsorStep, valid:function(){ return true; }
  },
  details: {
    id:"details", title:"Spieldaten", desc:"",
    render:renderDetailStep,
    valid:function(){ return !!draft.date && !!draft.time; }, error:"Bitte Datum und Anstoßzeit angeben."
  },
  detailsShort: {
    id:"details", title:"Spieldaten", desc:"",
    render:renderDetailStep, valid:function(){ return true; }
  },
  summary: {
    id:"summary", title:"Übersicht", desc:"",
    render:renderSummaryStep, valid:function(){ return true; }
  }
};

function stepsFor(typ){
  if(typ === "ergebnis"){
    return [STEP.template, STEP.homeAway, STEP.opponent, STEP.result,
            STEP.player, STEP.sponsors, STEP.detailsShort, STEP.summary];
  }
  return [STEP.template, STEP.homeAway, STEP.opponent,
          STEP.player, STEP.sponsors, STEP.details, STEP.summary];
}

let steps = stepsFor("matchday");

function openWizard(startAt){
  steps = stepsFor(draft.typ);
  stepIndex = typeof startAt === "number" ? startAt : 0;
  lastFocused = document.activeElement;
  overlay.classList.add("open");
  renderStep();
}

function closeWizard(){
  overlay.classList.remove("open");
  returnToSummary = false;
  if(lastFocused && lastFocused.focus) lastFocused.focus();
}

function renderStep(richtung){
  const step = steps[stepIndex];
  /* Der Inhalt gleitet in die Richtung, in die man geht */
  bodyEl.classList.remove("slide-next","slide-back");
  if(richtung){
    void bodyEl.offsetWidth;   /* Animation neu starten */
    bodyEl.classList.add(richtung === "back" ? "slide-back" : "slide-next");
  }
  titleEl.textContent = step.title;
  descEl.textContent  = step.desc;
  stepEl.textContent  = "Schritt "+(stepIndex+1)+" von "+steps.length;
  barEl.style.width   = (((stepIndex+1)/steps.length)*100)+"%";
  backBtn.style.visibility = stepIndex === 0 ? "hidden" : "visible";
  nextBtn.textContent = step.id === "summary" ? "Grafik erstellen" : "Weiter";
  countEl.textContent = "";
  bodyEl.innerHTML = "";
  step.render();
  bodyEl.scrollTop = 0;
  const focusable = bodyEl.querySelector("button, input");
  if(focusable) focusable.focus();
  else nextBtn.focus();
}

function showError(msg){
  let el = bodyEl.querySelector(".err");
  if(!el){
    el = document.createElement("div");
    el.className = "err";
    bodyEl.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
}

function clearError(){
  const el = bodyEl.querySelector(".err");
  if(el) el.classList.remove("show");
}

nextBtn.addEventListener("click", async function(){
  const step = steps[stepIndex];
  if(!step.valid()){
    showError(step.error || "Bitte eine Auswahl treffen.");
    return;
  }
  clearError();

  if(step.id === "summary"){
    await buildGraphic();
    closeWizard();
    return;
  }

  if(returnToSummary){
    returnToSummary = false;
    stepIndex = steps.length - 1;
  } else {
    stepIndex++;
  }
  renderStep("next");
});

backBtn.addEventListener("click", function(){
  if(stepIndex > 0){ stepIndex--; renderStep("back"); }
});

document.getElementById("wizClose").addEventListener("click", closeWizard);
overlay.addEventListener("click", function(e){ if(e.target === overlay) closeWizard(); });
document.addEventListener("keydown", function(e){
  if(e.key === "Escape" && overlay.classList.contains("open")) closeWizard();
});

/* ---------- Schritt-Inhalte ---------- */
function tileGrid(items, isSelected, onPick, emptyText){
  if(items.length === 0){
    const p = document.createElement("div");
    p.className = "empty";
    p.textContent = emptyText;
    bodyEl.appendChild(p);
    return;
  }
  const grid = document.createElement("div");
  grid.className = "grid-tiles";
  items.forEach(function(item){
    const tile = document.createElement("button");
    tile.className = "tile-opt" + (isSelected(item) ? " selected" : "");
    const img = document.createElement("img");
    img.src = item.url; img.alt = item.name; img.loading = "lazy";
    const nm = document.createElement("span");
    nm.className = "name"; nm.textContent = item.name;
    const badge = document.createElement("span");
    badge.className = "badge"; badge.textContent = "✓";
    tile.appendChild(img); tile.appendChild(nm); tile.appendChild(badge);
    tile.addEventListener("click", function(){ onPick(item, tile, grid); });
    grid.appendChild(tile);
  });
  bodyEl.appendChild(grid);
}

function renderTemplateStep(){
  tileGrid(
    lib.templates,
    function(t){ return draft.template && draft.template.file === t.file; },
    function(t, tile, grid){
      draft.template = t;
      grid.querySelectorAll(".tile-opt").forEach(function(x){ x.classList.remove("selected"); });
      tile.classList.add("selected");
      clearError();
    },
    "Noch keine Vorlage in der Bibliothek. Sie gehört in den Ordner „vorlagen“."
  );
}

function renderHomeAwayStep(){
  const opts = [
    { id:"heim", ic:"H", t:"Heimspiel", d:CLUB.venue },
    { id:"auswaerts", ic:"A", t:"Auswärtsspiel", d:"Spielort wird vorgeschlagen" }
  ];
  opts.forEach(function(o){
    const b = document.createElement("button");
    b.className = "choice" + (draft.homeAway === o.id ? " selected" : "");
    b.innerHTML =
      '<span class="ic">'+o.ic+'</span>'+
      '<span><span class="t">'+o.t+'</span><span class="d">'+o.d+'</span></span>';
    b.addEventListener("click", function(){
      draft.homeAway = o.id;
      bodyEl.querySelectorAll(".choice").forEach(function(x){ x.classList.remove("selected"); });
      b.classList.add("selected");
      draft.venue = "";
      clearError();
    });
    bodyEl.appendChild(b);
  });
}

function renderOpponentStep(){
  const opponents = lib.crests.filter(function(c){ return c.file !== CLUB.file; });
  tileGrid(
    opponents,
    function(c){ return draft.opponent && draft.opponent.file === c.file; },
    function(c, tile, grid){
      draft.opponent = c;
      grid.querySelectorAll(".tile-opt").forEach(function(x){ x.classList.remove("selected"); });
      tile.classList.add("selected");
      draft.venue = "";
      clearError();
    },
    "Keine Gegner-Wappen in der Bibliothek."
  );
}

function renderPlayerStep(){
  const none = document.createElement("button");
  none.className = "choice" + (draft.player ? "" : " selected");
  none.innerHTML = '<span class="ic">—</span><span><span class="t">Ohne Spielerbild</span></span>';
  none.addEventListener("click", function(){
    draft.player = null;
    bodyEl.querySelectorAll(".choice, .tile-opt").forEach(function(x){ x.classList.remove("selected"); });
    none.classList.add("selected");
  });
  bodyEl.appendChild(none);

  if(lib.players.length === 0){
    const p = document.createElement("div");
    p.className = "empty";
    p.textContent = "Noch keine Spielerbilder. Wie du welche anlegst, steht unter Hilfe.";
    bodyEl.appendChild(p);
    return;
  }

  const spacer = document.createElement("div");
  spacer.style.height = "8px";
  bodyEl.appendChild(spacer);

  tileGrid(
    lib.players,
    function(p){ return draft.player && draft.player.file === p.file; },
    function(p, tile, grid){
      draft.player = p;
      bodyEl.querySelectorAll(".choice").forEach(function(x){ x.classList.remove("selected"); });
      grid.querySelectorAll(".tile-opt").forEach(function(x){ x.classList.remove("selected"); });
      tile.classList.add("selected");
    },
    ""
  );
}

function renderSponsorStep(){
  if(lib.sponsors.length === 0){
    const p = document.createElement("div");
    p.className = "empty";
    p.textContent = "Noch keine Sponsorenlogos in der Bibliothek.";
    bodyEl.appendChild(p);
    return;
  }

  function updateCount(){
    countEl.textContent = draft.sponsors.length+" von "+MAX_SPONSORS+" gewählt";
  }

  tileGrid(
    lib.sponsors,
    function(s){ return draft.sponsors.some(function(x){ return x.file === s.file; }); },
    function(s, tile){
      const i = draft.sponsors.findIndex(function(x){ return x.file === s.file; });
      if(i >= 0){
        draft.sponsors.splice(i,1);
        tile.classList.remove("selected");
      } else {
        if(draft.sponsors.length >= MAX_SPONSORS){
          showError("Mehr als "+MAX_SPONSORS+" Sponsoren passen nicht in die Leiste.");
          return;
        }
        draft.sponsors.push(s);
        tile.classList.add("selected");
        clearError();
      }
      updateCount();
    },
    ""
  );
  updateCount();
}

/* Vereinskürzel am Wortanfang - für den Ortsvorschlag */

function renderDetailStep(){
  if(!draft.date) draft.date = nextSunday();
  if(!draft.venue) draft.venue = suggestVenue();

  function field(label, id, type, value, attrs){
    const w = document.createElement("div");
    w.className = "field";
    const l = document.createElement("label");
    l.setAttribute("for", id); l.textContent = label;
    const i = document.createElement("input");
    i.type = type; i.id = id; i.value = value || "";
    if(attrs) Object.keys(attrs).forEach(function(k){ i.setAttribute(k, attrs[k]); });
    w.appendChild(l); w.appendChild(i);
    return { wrap:w, input:i };
  }

  const md = field("Spieltag","f_matchday","text",draft.matchday,{ maxlength:"28", placeholder:"4 oder Pokal-Viertelfinale" });
  md.input.addEventListener("input", function(e){ draft.matchday = e.target.value; });
  bodyEl.appendChild(md.wrap);

  const comp = field("Wettbewerb","f_competition","text",draft.competition,{ maxlength:"46" });
  comp.input.addEventListener("input", function(e){ draft.competition = e.target.value; });
  bodyEl.appendChild(comp.wrap);

  /* Die Ergebnis-Grafik zeigt weder Datum noch Ort */
  if(draft.typ === "ergebnis") return;

  const rowWrap = document.createElement("div");
  rowWrap.className = "field";
  const row = document.createElement("div");
  row.className = "row2";
  const dWrap = document.createElement("div");
  const tWrap = document.createElement("div");
  const d = field("Datum","f_date","date",draft.date);
  const t = field("Anstoß","f_time","time",draft.time);
  d.input.addEventListener("input", function(e){ draft.date = e.target.value; clearError(); });
  t.input.addEventListener("input", function(e){ draft.time = e.target.value; clearError(); });
  dWrap.appendChild(d.wrap); tWrap.appendChild(t.wrap);
  row.appendChild(dWrap); row.appendChild(tWrap);
  rowWrap.appendChild(row);
  bodyEl.appendChild(rowWrap);

  const v = field("Spielort","f_venue","text",draft.venue,{ maxlength:"40" });
  v.input.addEventListener("input", function(e){ draft.venue = e.target.value; });
  bodyEl.appendChild(v.wrap);

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = "Spielort ist ein Vorschlag und lässt sich ändern.";
  bodyEl.appendChild(hint);
}

function renderSummaryStep(){
  const box = document.createElement("div");
  box.className = "summary";

  function row(key, value, stepId, pics){
    const r = document.createElement("div");
    r.className = "sum-row";
    const k = document.createElement("span");
    k.className = "k"; k.textContent = key;
    const v = document.createElement("span");
    v.className = "v"; v.textContent = value;
    r.appendChild(k); r.appendChild(v);

    if(pics && pics.length){
      const p = document.createElement("span");
      p.className = "pics";
      pics.slice(0,4).forEach(function(src){
        const im = document.createElement("img");
        im.src = src; im.alt = "";
        p.appendChild(im);
      });
      r.appendChild(p);
    }

    const e = document.createElement("button");
    e.className = "sum-edit"; e.textContent = "ändern";
    e.addEventListener("click", function(){
      const idx = steps.findIndex(function(s){ return s.id === stepId; });
      if(idx >= 0){
        returnToSummary = true;
        stepIndex = idx;
        renderStep("back");
      }
    });
    r.appendChild(e);
    box.appendChild(r);
  }

  const oppName = draft.opponent ? draft.opponent.name : "—";
  const heim = draft.homeAway === "heim";
  const paarung = heim ? CLUB.name+"  vs.  "+oppName : oppName+"  vs.  "+CLUB.name;
  const bilder  = draft.opponent && lib.own
    ? (heim ? [lib.own.url, draft.opponent.url] : [draft.opponent.url, lib.own.url]) : [];

  row("Grafik", TYPEN[draft.typ].label, "template");
  row("Vorlage", draft.template ? draft.template.name : "—", "template",
      draft.template ? [draft.template.url] : []);
  row("Spielort-Typ", heim ? "Heimspiel" : "Auswärtsspiel", "homeAway");
  row("Begegnung", paarung, "opponent", bilder);

  if(draft.typ === "ergebnis"){
    const own = draft.goalsOwn === "" ? "–" : draft.goalsOwn;
    const opp = draft.goalsOpp === "" ? "–" : draft.goalsOpp;
    row("Endstand", heim ? own+" : "+opp : opp+" : "+own, "result");
    row("Torschützen", torschuetzenTexte().join(", "), "result");
  }

  row("Spielerbild", draft.player ? draft.player.name : "ohne", "player",
      draft.player ? [draft.player.url] : []);
  row("Sponsoren", draft.sponsors.length ? draft.sponsors.length+" ausgewählt" : "keine", "sponsors",
      draft.sponsors.map(function(s){ return s.url; }));
  row("Spieltag", draft.matchday ? draft.matchday : "—", "details");
  row("Wettbewerb", draft.competition || "—", "details");
  if(draft.typ === "matchday"){
    row("Anstoß", (formatDate(draft.date) || "—")+"  ·  "+(draft.time || "—")+" Uhr", "details");
    row("Ort", draft.venue || "—", "details");
  }

  bodyEl.appendChild(box);
}


/* ---------- Ergebnis: Endstand und Torschützen ---------- */
function renderResultStep(){
  const heim = draft.homeAway === "heim";
  const oppName = draft.opponent ? draft.opponent.name : "Gegner";

  /* Tore — Heim links, Gast rechts, wie in der Grafik */
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lab = document.createElement("label");
  lab.textContent = "Endstand";
  wrap.appendChild(lab);

  const score = document.createElement("div");
  score.className = "score-row";

  function teamBox(name, img, key){
    const box = document.createElement("div");
    box.className = "score-team";
    const pic = document.createElement("img");
    pic.src = img ? img.url : ""; pic.alt = "";
    const nm = document.createElement("span");
    nm.className = "score-name"; nm.textContent = name;
    const inp = document.createElement("input");
    inp.type = "number"; inp.min = "0"; inp.max = "99"; inp.inputMode = "numeric";
    inp.className = "score-input";
    inp.value = draft[key] === "" ? "" : draft[key];
    inp.placeholder = "0";
    inp.addEventListener("input", function(e){
      const v = e.target.value.replace(/[^0-9]/g,"").slice(0,2);
      e.target.value = v;
      draft[key] = v;
      clearError();
    });
    box.appendChild(pic); box.appendChild(nm); box.appendChild(inp);
    return box;
  }

  const eigen  = teamBox(CLUB.name, lib.own, "goalsOwn");
  const gegner = teamBox(oppName, draft.opponent, "goalsOpp");
  const sep = document.createElement("span");
  sep.className = "score-sep"; sep.textContent = ":";
  if(heim){ score.appendChild(eigen); score.appendChild(sep); score.appendChild(gegner); }
  else    { score.appendChild(gegner); score.appendChild(sep); score.appendChild(eigen); }
  wrap.appendChild(score);
  bodyEl.appendChild(wrap);

  /* Torschützen — je Zeile: wie oft getroffen + Name. In der Grafik
     wird daraus "2x F. Ergezen, T. Rohrbach", Mehrfachtorschützen zuerst. */
  const tw = document.createElement("div");
  tw.className = "field";
  const tl = document.createElement("label");
  tl.textContent = "Torschützen "+CLUB.name;
  tw.appendChild(tl);

  const list = document.createElement("div");
  list.className = "scorer-list";
  tw.appendChild(list);

  const MAX_SCORERS = 12;

  function zeichneListe(){
    list.innerHTML = "";
    draft.scorers.forEach(function(sc, i){
      const row = document.createElement("div");
      row.className = "scorer-row";

      const sel = document.createElement("select");
      sel.className = "scorer-count";
      sel.setAttribute("aria-label","Anzahl Tore");
      for(let k = 1; k <= 9; k++){
        const o = document.createElement("option");
        o.value = k; o.textContent = k+"x";
        if(k === (parseInt(sc.count,10)||1)) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener("change", function(e){ draft.scorers[i].count = parseInt(e.target.value,10); updateCount(); });

      const inp = document.createElement("input");
      inp.type = "text"; inp.value = sc.name || ""; inp.maxLength = 30;
      inp.placeholder = "z. B. F. Ergezen";
      inp.addEventListener("input", function(e){ draft.scorers[i].name = e.target.value; updateCount(); });
      inp.addEventListener("keydown", function(e){
        if(e.key === "Enter"){ e.preventDefault(); neu(); }
      });

      const del = document.createElement("button");
      del.type = "button"; del.className = "scorer-del"; del.textContent = "✕";
      del.setAttribute("aria-label","Torschütze entfernen");
      del.addEventListener("click", function(){
        draft.scorers.splice(i,1); zeichneListe();
      });

      row.appendChild(sel); row.appendChild(inp); row.appendChild(del);
      list.appendChild(row);
    });
    add.disabled = draft.scorers.length >= MAX_SCORERS;
    updateCount();
  }
  function neu(){
    if(draft.scorers.length >= MAX_SCORERS) return;
    draft.scorers.push({ name:"", count:1 });
    zeichneListe();
    const inputs = list.querySelectorAll("input");
    if(inputs.length) inputs[inputs.length-1].focus();
  }
  function updateCount(){
    const tore = draft.scorers.reduce(function(a,s){ return a + (s.name.trim() ? (parseInt(s.count,10)||1) : 0); }, 0);
    countEl.textContent = tore ? tore+" Tor"+(tore===1?"":"e")+" eingetragen" : "";
  }

  const add = document.createElement("button");
  add.type = "button"; add.className = "btn btn-ghost scorer-add";
  add.textContent = "+ Torschütze";
  add.addEventListener("click", neu);
  zeichneListe();
  tw.appendChild(add);

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = "Ohne Eintrag steht ein Strich. Enter legt die nächste Zeile an.";
  tw.appendChild(hint);

  bodyEl.appendChild(tw);
}
"use strict";

/* ========== Konfiguration ========== */
const SUPABASE_URL = "https://kzrnclebljkvsndsfryg.supabase.co";
const SUPABASE_KEY = "sb_publishable_-JhlGFRGR3RKRD-BMjIWiQ_FsSZOTWV";
const BUCKET = "grafiken";

/* Unterordner der Bibliothek */
const DIRS = {
  vorlagen:      "vorlagen",
  wappen:        "wappen",
  spielerbilder: "spielerbilder",
  sponsoren:     "sponsoren",
  fonts:         "fonts/zing"
};

const CLUB = {
  file:"SC_Fornsbach.png",
  name:"SC Fornsbach",
  venue:"Sportplatz Fornsbach",
  competition:"Kreisliga B2 Rems/Murr/Hall"
};

const MAX_SPONSORS = 5;

/* Schrift der Vorlage. Liegt als OTF in der Bibliothek. */
const FONT_NAME = "ZingRust";
const FONT_FILE = "ZingRustDemo-Base.otf";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth:{ persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }
});

function publicUrl(path){
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/* ========== Namen aus Dateinamen ==========
   Dateinamen dürfen keine Umlaute und keine Schrägstriche enthalten.
   Vereinbart ist: ae/oe/ue für Umlaute, Bindestrich für den Schrägstrich
   bei Spielgemeinschaften. Beides wird hier zurückübersetzt. */

/* Nach einem Vokal ist "ue" fast immer echtes eu/au (Neuenstadt, Bauer)
   und kein ü. Nur nach Konsonanten wird umgewandelt. */
const VOKALE = "aeiouäöüAEIOUÄÖÜ";

/* Namen, bei denen die Regel danebenläge */
const NAME_AUSNAHMEN = {
  "Michael":"Michael", "Raphael":"Raphael", "Israel":"Israel",
  "Samuel":"Samuel",   "Manuel":"Manuel",   "Emanuel":"Emanuel"
};

function umlaute(text){
  let out = "";
  for(let i = 0; i < text.length; i++){
    const paar = text.substr(i,2).toLowerCase();
    const davor = i > 0 ? text[i-1] : "";
    const istVokalDavor = davor && VOKALE.indexOf(davor) >= 0;
    if((paar === "ae" || paar === "oe" || paar === "ue") && !istVokalDavor){
      const gross = text[i] === text[i].toUpperCase();
      const uml = paar === "ae" ? "ä" : paar === "oe" ? "ö" : "ü";
      out += gross ? uml.toUpperCase() : uml;
      i++;
    } else {
      out += text[i];
    }
  }
  return out;
}

function schuetzeAusnahmen(text){
  let t = text;
  Object.keys(NAME_AUSNAHMEN).forEach(function(w){
    t = t.replace(new RegExp(w,"gi"), function(m){ return "\u0000"+m+"\u0000"; });
  });
  return t;
}

function loeseAusnahmen(text){
  return text.replace(/\u0000/g,"");
}

/* Dateiname -> Anzeigename */
function prettyName(file, opts){
  let n = file.replace(/\.[^/.]+$/,"");          /* Endung weg */
  if(opts && opts.stripPrefix){
    n = n.replace(new RegExp("^"+opts.stripPrefix+"[_ -]*","i"), "");
  }
  n = n.replace(/_/g," ");                        /* Unterstrich -> Leerzeichen */
  if(opts && opts.slash){
    /* Bindestrich steht für den Schrägstrich der Spielgemeinschaft */
    n = n.replace(/\s*-\s*/g," / ");
  } else {
    n = n.replace(/\s*-\s*/g," ");
  }
  if(opts && opts.und){
    n = n.replace(/\bund\b/g,"und");
  }
  /* Ausnahmen markieren, umwandeln, Markierung entfernen */
  n = loeseAusnahmen(umlaute(schuetzeAusnahmen(n)));
  return n.replace(/\s+/g," ").trim();
}

/* ========== Bibliothek ========== */
const lib = { templates:[], crests:[], players:[], sponsors:[], own:null };
const imgCache = {};

function loadImage(url){
  if(imgCache[url]) return Promise.resolve(imgCache[url]);
  return new Promise(function(resolve,reject){
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function(){ imgCache[url] = img; resolve(img); };
    img.onerror = function(){ reject(new Error("Bild konnte nicht geladen werden.")); };
    img.src = url;
  });
}

function setConn(status,text){
  const dot = document.getElementById("connDot");
  dot.classList.remove("ok","err");
  if(status) dot.classList.add(status);
  document.getElementById("connText").textContent = text;
}

/* Einen Unterordner auslesen */
async function listDir(dir, opts){
  const res = await sb.storage.from(BUCKET).list(dir, {
    limit:500, sortBy:{ column:"name", order:"asc" }
  });
  if(res.error) throw new Error(res.error.message);
  return (res.data||[])
    .filter(function(f){ return f && f.id && /\.(png|jpe?g|webp)$/i.test(f.name); })
    .map(function(f){
      return {
        file: f.name,
        name: prettyName(f.name, opts),
        url:  publicUrl(dir+"/"+f.name)
      };
    });
}

/* Schrift der Vorlage nachladen */
async function loadFont(){
  if(!window.FontFace) return false;
  try{
    const face = new FontFace(FONT_NAME, 'url("'+publicUrl(DIRS.fonts+"/"+FONT_FILE)+'")');
    await face.load();
    document.fonts.add(face);
    return true;
  }catch(err){
    console.warn("Schrift konnte nicht geladen werden, nutze Ersatzschrift.", err);
    return false;
  }
}

async function loadLibrary(){
  setConn(null,"lade Bibliothek …");
  try{
    const [tpl, crests, players, sponsors] = await Promise.all([
      listDir(DIRS.vorlagen),
      listDir(DIRS.wappen,        { slash:true }),
      listDir(DIRS.spielerbilder, { stripPrefix:"Spielerbild" }),
      listDir(DIRS.sponsoren,     { stripPrefix:"Sponsor" })
    ]);

    lib.templates = tpl;
    lib.crests    = crests;
    lib.players   = players;
    lib.sponsors  = sponsors;
    lib.own       = crests.filter(function(x){ return x.file === CLUB.file; })[0] || null;

    if(lib.own) document.getElementById("clubLogo").src = lib.own.url;

    fontReady = await loadFont();

    setConn("ok",
      lib.crests.length+" Wappen · "+lib.templates.length+" Vorlagen · "+
      lib.players.length+" Spielerbilder · "+lib.sponsors.length+" Sponsoren"+
      (fontReady ? "" : " · Ersatzschrift")
    );
    return true;
  }catch(err){
    setConn("err","nicht verbunden");
    console.error(err);
    return false;
  }
}

let fontReady = false;

/* ========== Zustand einer Spielankündigung ========== */
function emptyDraft(){
  return {
    template:null,
    homeAway:null,      // "heim" | "auswaerts"
    opponent:null,
    player:null,
    sponsors:[],
    matchday:"",
    competition:CLUB.competition,
    date:"",
    time:"15:00",
    venue:""
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

const steps = [
  {
    id:"template",
    title:"Vorlage auswählen",
    desc:"Welches Design soll die Grafik bekommen?",
    render:renderTemplateStep,
    valid:function(){ return !!draft.template; },
    error:"Bitte eine Vorlage auswählen."
  },
  {
    id:"homeAway",
    title:"Heim oder auswärts?",
    desc:"Danach richtet sich der vorgeschlagene Spielort.",
    render:renderHomeAwayStep,
    valid:function(){ return !!draft.homeAway; },
    error:"Bitte Heim oder auswärts wählen."
  },
  {
    id:"opponent",
    title:"Wer ist der Gegner?",
    desc:"Wappen aus der Bibliothek deines Vereins.",
    render:renderOpponentStep,
    valid:function(){ return !!draft.opponent; },
    error:"Bitte einen Gegner auswählen."
  },
  {
    id:"player",
    title:"Spielerbild auswählen",
    desc:"Erscheint freigestellt auf der rechten Seite. Optional.",
    render:renderPlayerStep,
    valid:function(){ return true; }
  },
  {
    id:"sponsors",
    title:"Sponsoren auswählen",
    desc:"Bis zu "+MAX_SPONSORS+" Logos für die Leiste unten. Optional.",
    render:renderSponsorStep,
    valid:function(){ return true; }
  },
  {
    id:"details",
    title:"Spieltag, Termin und Ort",
    desc:"Der Spielort ist passend zur Auswahl vorausgefüllt.",
    render:renderDetailStep,
    valid:function(){ return !!draft.date && !!draft.time; },
    error:"Bitte Datum und Anstoßzeit angeben."
  },
  {
    id:"summary",
    title:"Alles richtig?",
    desc:"Prüf die Angaben und erstelle die Grafik.",
    render:renderSummaryStep,
    valid:function(){ return true; }
  }
];

function openWizard(startAt){
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

function renderStep(){
  const step = steps[stepIndex];
  titleEl.textContent = step.title;
  descEl.textContent  = step.desc;
  stepEl.textContent  = "SCHRITT "+(stepIndex+1)+" VON "+steps.length;
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
  renderStep();
});

backBtn.addEventListener("click", function(){
  if(stepIndex > 0){ stepIndex--; renderStep(); }
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
    tile.className = "tile" + (isSelected(item) ? " selected" : "");
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
      grid.querySelectorAll(".tile").forEach(function(x){ x.classList.remove("selected"); });
      tile.classList.add("selected");
      clearError();
    },
    "Noch keine Vorlage in der Bibliothek. Sie gehört in den Ordner „vorlagen“."
  );
}

function renderHomeAwayStep(){
  const opts = [
    { id:"heim", ic:"H", t:"Heimspiel", d:"Spielort wird automatisch auf „"+CLUB.venue+"“ gesetzt." },
    { id:"auswaerts", ic:"A", t:"Auswärtsspiel", d:"Spielort wird aus dem Gegnernamen vorgeschlagen und ist änderbar." }
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
      grid.querySelectorAll(".tile").forEach(function(x){ x.classList.remove("selected"); });
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
  none.innerHTML = '<span class="ic">—</span><span><span class="t">Ohne Spielerbild</span>'+
                   '<span class="d">Wappen und Spielinfos werden mittig größer gesetzt.</span></span>';
  none.addEventListener("click", function(){
    draft.player = null;
    bodyEl.querySelectorAll(".choice, .tile").forEach(function(x){ x.classList.remove("selected"); });
    none.classList.add("selected");
  });
  bodyEl.appendChild(none);

  if(lib.players.length === 0){
    const p = document.createElement("div");
    p.className = "empty";
    p.textContent = "Noch keine Spielerbilder in der Bibliothek. Sie gehören als freigestellte PNG in den Ordner „spielerbilder“.";
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
      grid.querySelectorAll(".tile").forEach(function(x){ x.classList.remove("selected"); });
      tile.classList.add("selected");
    },
    ""
  );
}

function renderSponsorStep(){
  if(lib.sponsors.length === 0){
    const p = document.createElement("div");
    p.className = "empty";
    p.textContent = "Noch keine Sponsoren-Logos in der Bibliothek. Sie gehören in den Ordner „sponsoren“.";
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
const KUERZEL = /^(Türkspor|Tuerkspor|SpVgg|SGM|SVG|TSV|TSG|VfB|VfL|VfR|FSV|SSV|MTV|SC|SV|SG|SF|FC|FV|TV|TB|VfR)\s+/i;

function ortsname(vereinsname){
  /* Bei Spielgemeinschaften nur den ersten Verein nehmen */
  let n = vereinsname.split("/")[0].trim();
  n = n.replace(KUERZEL, "");
  /* Mannschaftsnummer am Ende entfernen: "Allmersbach III" -> "Allmersbach" */
  n = n.replace(/\s+(I{1,3}|IV|V|\d)\s*$/i, "");
  return n.trim();
}

function suggestVenue(){
  if(draft.homeAway === "heim") return CLUB.venue;
  if(draft.opponent){
    const ort = ortsname(draft.opponent.name);
    return "Sportplatz "+(ort || draft.opponent.name);
  }
  return "";
}

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

  const md = field("Spieltag","f_matchday","text",draft.matchday,{ maxlength:"28", placeholder:"z. B. 4 — oder Pokal-Viertelfinale" });
  md.input.addEventListener("input", function(e){ draft.matchday = e.target.value; });
  bodyEl.appendChild(md.wrap);

  const comp = field("Wettbewerb","f_competition","text",draft.competition,{ maxlength:"46" });
  comp.input.addEventListener("input", function(e){ draft.competition = e.target.value; });
  bodyEl.appendChild(comp.wrap);

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
  hint.textContent = draft.homeAway === "heim"
    ? "Heimspiel — Spielort automatisch gesetzt, bei Bedarf überschreibbar."
    : "Auswärtsspiel — Vorschlag aus dem Gegnernamen, bei Bedarf überschreibbar.";
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
        renderStep();
      }
    });
    r.appendChild(e);
    box.appendChild(r);
  }

  row("Vorlage", draft.template ? draft.template.name : "—", "template",
      draft.template ? [draft.template.url] : []);
  row("Spielort-Typ", draft.homeAway === "heim" ? "Heimspiel" : "Auswärtsspiel", "homeAway");
  row("Begegnung", CLUB.name+"  vs.  "+(draft.opponent ? draft.opponent.name : "—"), "opponent",
      draft.opponent && lib.own ? [lib.own.url, draft.opponent.url] : []);
  row("Spielerbild", draft.player ? draft.player.name : "ohne", "player",
      draft.player ? [draft.player.url] : []);
  row("Sponsoren", draft.sponsors.length ? draft.sponsors.length+" ausgewählt" : "keine", "sponsors",
      draft.sponsors.map(function(s){ return s.url; }));
  row("Spieltag", draft.matchday ? draft.matchday : "—", "details");
  row("Wettbewerb", draft.competition || "—", "details");
  row("Anstoß", (formatDate(draft.date) || "—")+"  ·  "+(draft.time || "—")+" Uhr", "details");
  row("Ort", draft.venue || "—", "details");

  bodyEl.appendChild(box);
}

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
    alert("Mindestens ein Bild konnte nicht geladen werden. Die Grafik wird ohne dieses Bild erstellt.");
  }

  draw();
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
    for(let y = 0; y < ch; y++){
      for(let x = 0; x < cw; x++){
        if(px[(y*cw + x)*4 + 3] > 12){
          opak++;
          if(x < minX) minX = x;
          if(x > maxX) maxX = x;
          if(y < minY) minY = y;
          if(y > maxY) maxY = y;
        }
      }
    }
    if(maxX < 0){ boxCache[key] = fallback; return fallback; }

    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const box = {
      x: minX/s,
      y: minY/s,
      w: bw/s,
      h: bh/s,
      /* Anteil sichtbarer Pixel innerhalb des Inhaltsrahmens —
         ein runder oder spitzer Umriss füllt seinen Rahmen weniger
         als ein Schild und würde bei gleicher Rahmengröße kleiner wirken */
      fill: opak / (bw*bh)
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

/* ---------- Layout ---------- */

/* Alle Maße sind aus der Referenzgrafik abgenommen (1080 x 1080) */
const LAYOUT = {
  PAD: 22,                /* linker Rand */
  BAR_TOP: 859,           /* hellblauer Balken der Vorlage */
  BAR_BOTTOM: 878,
  HEAD_TOP: 192,          /* Oberkante Einzelbild, unter MATCHDAY */
  HEAD_TOP_PAIR: 228,     /* Oberkante Doppelbild — etwas kleiner, damit
                             weniger angeschnitten werden muss */
  PLAYER_MAX_W: 640,      /* Notbremse bei fehlender Freistellung */
  PLAYER_GAP: 22,         /* Mindestabstand Spieler ↔ linke Elemente */
  PLAYER_INSET: 22,       /* Einzelbilder: Abstand zum rechten Rand */
  PLAYER_OVERHANG_MAX: 70, /* Doppelbilder: höchstens so viel Anschnitt, dann verkleinern */
  CREST_CY: 465,          /* Wappenreihe */
  CREST_L: 130,           /* Mitte linkes Wappen */
  CREST_R: 436,           /* Mitte rechtes Wappen */
  CREST_H: 204,           /* Höhe beider Wappen — Vorgabe vom eigenen Wappen */
  CREST_MAX_W: 214,       /* Bremse für sehr breite Formen */
  NAME_BASE: 608,         /* Grundlinie der Teamnamen */
  NAME_CAP: 25,
  INFO_ICON_X: 49,
  INFO_TEXT_X: 105,
  INFO_CAP: 28
};

/* Rechnet alle Positionen aus, ohne zu zeichnen. Der Spieler wird vor
   den Texten gezeichnet, muss aber wissen, wie weit die Texte reichen. */
function computeLayout(){
  const K = LAYOUT;
  const L = {};

  L.heim = draft.homeAway !== "auswaerts";
  const oppName = draft.opponent ? draft.opponent.name : "Gegner";

  /* Heim steht links, Gast rechts */
  L.links  = L.heim ? { img:render.own,      name:CLUB.name }
                    : { img:render.opponent, name:oppName };
  L.rechts = L.heim ? { img:render.opponent, name:oppName }
                    : { img:render.own,      name:CLUB.name };

  /* Wappen */
  L.mL = L.links.img  ? measureHeight(L.links.img,  K.CREST_H, K.CREST_MAX_W) : { w:200, h:K.CREST_H };
  L.mR = L.rechts.img ? measureHeight(L.rechts.img, K.CREST_H, K.CREST_MAX_W) : { w:200, h:K.CREST_H };

  /* VS. mittig zwischen den Innenkanten */
  const innenL = K.CREST_L + L.mL.w/2;
  const innenR = K.CREST_R - L.mR.w/2;
  L.vsCap = 46;
  setFont(sizeForCap(L.vsCap));
  while(textWidth("VS.") > (innenR - innenL) - 28 && L.vsCap > 30){
    L.vsCap -= 1;
    setFont(sizeForCap(L.vsCap));
  }
  L.vsCX = (innenL + innenR)/2 - L.vsCap*0.09;

  /* Teamnamen: links ist der Platz durch den Rand begrenzt */
  const maxWL = 2 * (K.CREST_L - K.PAD + 10);
  const maxWR = 310;
  L.nameL = wrapLines(L.links.name.toUpperCase(),  maxWL, K.NAME_CAP, 2);
  L.nameR = wrapLines(L.rechts.name.toUpperCase(), maxWR, K.NAME_CAP, 2);

  /* Spieltag / Liga / Ort / Zeit als Texte */
  let mdRoh = (draft.matchday||"").trim();
  let mdZahl = mdRoh.replace(/^spieltag\s*/i,"").replace(/\.$/,"");
  L.mdText = (/^\d+$/.test(mdZahl) ? "SPIELTAG "+mdZahl+"." : (mdRoh || "SPIELTAG")).toUpperCase();
  L.ligaText = (draft.competition||"").toUpperCase();
  L.ortText  = (draft.venue||"").toUpperCase();
  L.zeitText = (formatDate(draft.date)+" "+(draft.time||"").replace(":",".")+" UHR").toUpperCase();

  /* Wie weit reichen die linken Elemente nach rechts? Daraus ergibt sich
     die Grenze für das Spielerbild. MATCHDAY zählt nicht — der Kopf darf
     wie in der Vorlage daneben stehen. */
  const hasPlayer = !!render.player;
  const colW = hasPlayer ? 545 : 860;
  const kanten = [
    K.PAD + fittedWidth(L.ligaText, colW, 36, 22),
    K.CREST_R + L.mR.w/2,
    K.CREST_R + L.nameR.breite/2,
    K.INFO_TEXT_X + fittedWidth(L.ortText,  colW - 70, K.INFO_CAP, 18),
    K.INFO_TEXT_X + fittedWidth(L.zeitText, colW - 70, K.INFO_CAP, 18)
  ];
  L.colW = colW;
  L.rechteKante = Math.max.apply(null, kanten);

  /* Spielerbild */
  if(hasPlayer){
    const b = contentBox(render.player);
    const pname = (draft.player && draft.player.name) || "";
    const zwei = /\bund\b/i.test(pname) || (b.w / b.h) > 0.72;

    const oben = zwei ? K.HEAD_TOP_PAIR : K.HEAD_TOP;
    let s = (K.BAR_BOTTOM - oben) / b.h;         /* Bild endet hinter dem Balken */
    if(b.w * s > K.PLAYER_MAX_W) s = K.PLAYER_MAX_W / b.w;
    let w = b.w*s, h = b.h*s;

    const minX = L.rechteKante + K.PLAYER_GAP;
    let x;
    if(zwei){
      /* So weit links wie erlaubt, nur so viel Anschnitt wie nötig */
      x = Math.max(W - w, minX);
      if(x - (W - w) > K.PLAYER_OVERHANG_MAX){
        /* zu viel Anschnitt nötig → verkleinern */
        s *= (W + K.PLAYER_OVERHANG_MAX - minX) / w;
        w = b.w*s; h = b.h*s;
        x = minX;
      }
    } else {
      /* Ganz zeigen, mit etwas Abstand zum Rand; wenn zu breit, verkleinern */
      x = W - w - K.PLAYER_INSET;
      if(x < minX){
        s *= (W - K.PLAYER_INSET - minX) / w;
        w = b.w*s; h = b.h*s;
        x = minX;
      }
    }
    L.player = { b:b, x:x, y:K.BAR_BOTTOM - h, w:w, h:h };
  } else {
    L.player = null;
  }
  return L;
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

function draw(){
  const K = LAYOUT;
  const L = computeLayout();
  ctx.clearRect(0,0,W,H);
  ctx.textBaseline = "alphabetic";

  /* Hintergrund */
  if(render.template) drawTemplateFrom(0);
  else { ctx.fillStyle = "#0F4C8A"; ctx.fillRect(0,0,W,H); }

  /* Spielerbild — vor den Texten, endet hinter dem Balken */
  if(L.player){
    const p = L.player;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.22)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetX = -8;
    ctx.drawImage(render.player, p.b.x, p.b.y, p.b.w, p.b.h, p.x, p.y, p.w, p.h);
    ctx.restore();
    drawTemplateFrom(K.BAR_TOP);
  }

  /* Vereinswappen oben rechts */
  if(render.own) fitContain(render.own, W - K.PAD - 32, K.PAD + 30, 64, 64);

  /* Kopfzeile — Grundlinien 178 / 251 / 296 */
  shadowOn(20,.45);
  ctx.fillStyle = "#FFFFFF";
  skewFit("MATCHDAY", K.PAD, 178, 1055, 148, 90);
  ctx.fillStyle = "#AFC3D8";
  skewFit(L.mdText, K.PAD, 251, L.colW, 64, 36);
  ctx.fillStyle = "#FFFFFF";
  skewFit(L.ligaText, K.PAD, 296, L.colW, 36, 22);
  shadowOff();

  /* Wappen */
  shadowOn(22,.4);
  if(L.links.img)  drawMeasured(L.links.img,  L.mL, K.CREST_L, K.CREST_CY);
  if(L.rechts.img) drawMeasured(L.rechts.img, L.mR, K.CREST_R, K.CREST_CY);
  shadowOff();

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

  /* Sponsorenleiste — Überschrift auf 923, Logos zwischen 950 und 1042 */
  if(render.sponsors.length > 0){
    ctx.fillStyle = "#FFFFFF";
    setFont(sizeForCap(27));
    skewText("WIRD PRÄSENTIERT VON", W/2, 923, "center");
    const n = render.sponsors.length;
    const areaTop = 950, areaBottom = 1042;
    const cellW = (W - 2*K.PAD) / n;
    const maxLogoW = Math.min(cellW - 24, 330);
    const maxLogoH = Math.min(areaBottom - areaTop, 92);
    render.sponsors.forEach(function(img, i){
      if(!img) return;
      fitContain(img, K.PAD + cellW*i + cellW/2, (areaTop + areaBottom)/2, maxLogoW, maxLogoH);
    });
  }
}

/* ========== Aktionen ========== */
document.getElementById("startBtn").addEventListener("click", function(){
  draft = emptyDraft();
  if(lib.templates.length === 1) draft.template = lib.templates[0];
  openWizard(0);
});

/* "Angaben ändern" öffnet direkt die Übersicht — von dort führt
   jeder "ändern"-Link zum passenden Schritt und zurück */
document.getElementById("editBtn").addEventListener("click", function(){
  openWizard(steps.length - 1);
});

document.getElementById("newBtn").addEventListener("click", function(){
  draft = emptyDraft();
  if(lib.templates.length === 1) draft.template = lib.templates[0];
  document.getElementById("result").classList.remove("show");
  document.getElementById("hero").style.display = "block";
  openWizard(0);
});

document.getElementById("downloadBtn").addEventListener("click", function(){
  try{
    const a = document.createElement("a");
    const slug = ("scf-"+(draft.opponent ? draft.opponent.name : "gegner"))
      .toLowerCase()
      .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue")
      .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    a.download = "matchday-"+(draft.date || "ohne-datum")+"-"+slug+".png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  }catch(err){
    alert("Die Grafik konnte nicht exportiert werden: "+err.message);
  }
});

/* ========== Start ========== */
document.fonts.ready.then(async function(){
  const ok = await loadLibrary();
  if(ok) document.getElementById("startBtn").disabled = false;
});

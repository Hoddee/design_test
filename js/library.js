"use strict";

/* ========== Supabase ========== */
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
  if(opts && opts.slash){
    /* Doppelter Unterstrich steht für den Schrägstrich der Spielgemeinschaft.
       Ein einzelner Bindestrich bleibt ein echter Bindestrich (z. B.
       "Murrhardt-Kirchenkirnberg") und wird nicht mehr angefasst. */
    n = n.replace(/\s*__\s*/g," / ");
  }
  n = n.replace(/_/g," ");                        /* einzelner Unterstrich -> Leerzeichen */
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

/* ========== Ortsvorschlag ========== */
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

// ===== Club Edgemore Karaoke — shared logic used by index.html and join.html =====
(function(global){
  "use strict";

  var app = firebase.initializeApp(FIREBASE_CONFIG);
  var db = firebase.database();

  // ---------- Session (one event = one namespaced branch in the database) ----------
  var sessionCode = null;
  var sessionRoot = null; // "sessions/<code>"

  function setSession(code){
    sessionCode = code;
    sessionRoot = "sessions/" + code;
  }
  function getSession(){ return sessionCode; }
  function ref(path){
    if(!sessionRoot) throw new Error("Edgemore.setSession(code) must be called before using the database.");
    return db.ref(sessionRoot + "/" + path);
  }

  function slugify(str){
    var s = String(str || "").toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);
    return s || "event";
  }
  function makeSessionCode(name){
    var suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit, avoids leading zero
    return slugify(name) + "-" + suffix;
  }

  function escapeHtml(str){
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function toArray(val){
    val = val || {};
    return Object.keys(val).map(function(k){
      var o = {};
      for(var p in val[k]) o[p] = val[k][p];
      o._id = k;
      return o;
    });
  }

  // ---------- Settings (title / subtitle / skin) — shared within a session ----------
  function subscribeSettings(cb){
    ref("settings").on("value", function(snap){ cb(snap.val() || {}); });
  }
  function saveSettings(partial){
    return ref("settings").update(partial);
  }

  // ---------- Queue ----------
  function subscribeQueue(cb){
    ref("queue").on("value", function(snap){
      var arr = toArray(snap.val());
      arr.sort(function(a,b){ return (a.order||0) - (b.order||0); });
      cb(arr);
    });
  }
  function addToQueue(name, song, videoId, thumb, order){
    return ref("queue").push({
      name: name, song: song, videoId: videoId, thumb: thumb || "",
      order: order, createdAt: firebase.database.ServerValue.TIMESTAMP
    });
  }
  function removeFromQueue(id){ return ref("queue/" + id).remove(); }
  function reorderQueue(idA, orderA, idB, orderB){
    var updates = {};
    updates[sessionRoot + "/queue/" + idA + "/order"] = orderB;
    updates[sessionRoot + "/queue/" + idB + "/order"] = orderA;
    return db.ref().update(updates);
  }
  function clearQueue(){ return ref("queue").remove(); }

  // ---------- Now playing ----------
  function subscribeNow(cb){
    ref("now").on("value", function(snap){
      var v = snap.val();
      cb(v && !v.cleared ? v : null);
    });
  }
  function setNow(obj){ return ref("now").set(obj); }
  function clearNow(){ return ref("now").set({ cleared: true, at: Date.now() }); }

  // ---------- History ----------
  function subscribeHistory(cb){
    ref("history").on("value", function(snap){
      var arr = toArray(snap.val());
      arr.sort(function(a,b){ return (b.performedAt||0) - (a.performedAt||0); });
      cb(arr);
    });
  }
  function addHistory(name, song, performedAt){
    return ref("history").push({ name: name, song: song, performedAt: performedAt });
  }
  function clearHistory(){ return ref("history").remove(); }

  function formatDateTime(ms){
    if(!ms) return "";
    try{
      return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    }catch(e){
      return new Date(ms).toLocaleString();
    }
  }

  // ---------- YouTube search (uses the key baked into config.js) ----------
  function searchYouTube(query, onResults, onError){
    if(!YOUTUBE_API_KEY || YOUTUBE_API_KEY.indexOf("PASTE_") === 0){
      onError("No YouTube API key set up yet — edit config.js and add one.");
      return;
    }
    var q = encodeURIComponent(query + " karaoke");
    var url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=6&q=" + q + "&key=" + encodeURIComponent(YOUTUBE_API_KEY);
    fetch(url).then(function(r){
      if(!r.ok) return r.json().then(function(j){ throw new Error(j.error && j.error.message ? j.error.message : ("HTTP " + r.status)); });
      return r.json();
    }).then(function(data){ onResults(data.items || []); })
      .catch(function(err){ onError(err.message); });
  }

  // ---------- Announcement phrasing ----------
  var TEMPLATES = {
    mainstage: function(n,s){ return n + ", to the main stage for " + s + "!"; },
    giveitup: function(n,s){ return "Let's give it up for " + n + ", singing " + s + "!"; },
    next: function(n,s){ return "Coming up next: " + n + ", with " + s + "!"; }
  };
  var ALL_STYLES = ["mainstage","giveitup","next"];
  function buildAnnouncement(name, song, style){
    if(style === "none") return null;
    if(style === "random" || !TEMPLATES[style]) style = ALL_STYLES[Math.floor(Math.random()*ALL_STYLES.length)];
    return TEMPLATES[style](name, song);
  }

  // ---------- Decorative skin effects (Christmas lights / fall leaves / birthday confetti) ----------
  var prefersReducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var fxStyleInjected = false;
  var lightsEl = null;
  var fxCanvas = null, fxCtx = null, fxRAF = null, fxParticles = [], fxKind = null, fxLastT = 0;

  function injectFxStyles(){
    if(fxStyleInjected) return;
    fxStyleInjected = true;
    var style = document.createElement("style");
    style.textContent =
      ".edgemore-fx-canvas{position:fixed;inset:0;pointer-events:none;z-index:-1;}" +
      ".edgemore-lights{position:fixed;top:0;left:0;width:100%;height:56px;pointer-events:none;z-index:-1;overflow:visible;}" +
      ".edgemore-lights .bulb{position:absolute;width:10px;height:10px;border-radius:50%;margin-left:-5px;margin-top:-5px;animation:edgemoreTwinkle 3s ease-in-out infinite;}" +
      ".edgemore-lights .bulb.star{width:16px;height:16px;margin-left:-8px;margin-top:-8px;background:none;display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;}" +
      "@keyframes edgemoreTwinkle{0%,100%{opacity:.45;transform:scale(0.8);}50%{opacity:1;transform:scale(1.15);}}" +
      "@media (prefers-reduced-motion: reduce){.edgemore-lights .bulb{animation:none !important;opacity:0.85;}}";
    document.head.appendChild(style);
  }

  function cssVar(name, fallback){
    try{
      var v = getComputedStyle(document.body).getPropertyValue(name).trim();
      return v || fallback;
    }catch(e){ return fallback; }
  }

  // ---- Christmas lights (static CSS garland along the top edge) ----
  function buildLights(){
    injectFxStyles();
    if(lightsEl) return;
    lightsEl = document.createElement("div");
    lightsEl.className = "edgemore-lights";
    lightsEl.setAttribute("aria-hidden", "true");
    var colors = ["#ff5a5a", "#ffd23f", "#6fe0a0", "#fff6d8"];
    var count = 22;
    for(var i=0;i<count;i++){
      var pct = (i / (count-1)) * 100;
      var wave = Math.sin((i/count) * Math.PI * 3.2) * 14 + 20;
      var el = document.createElement("div");
      if(i % 5 === 4){
        el.className = "bulb star";
        el.textContent = "★";
        el.style.color = "#ffd23f";
        el.style.textShadow = "0 0 8px rgba(255,210,63,0.9), 0 0 16px rgba(255,210,63,0.5)";
      } else {
        var c = colors[i % colors.length];
        el.className = "bulb";
        el.style.background = c;
        el.style.boxShadow = "0 0 10px 3px " + c + ", 0 0 20px 6px " + c + "55";
      }
      el.style.left = pct + "%";
      el.style.top = wave + "px";
      el.style.animationDuration = (2.2 + Math.random()*2).toFixed(2) + "s";
      el.style.animationDelay = (Math.random()*2).toFixed(2) + "s";
      lightsEl.appendChild(el);
    }
    document.body.insertBefore(lightsEl, document.body.firstChild);
  }
  function removeLights(){
    if(lightsEl){ lightsEl.parentNode && lightsEl.parentNode.removeChild(lightsEl); lightsEl = null; }
  }

  // ---- Canvas particle engine (fall leaves / birthday confetti) ----
  function ensureCanvas(){
    injectFxStyles();
    if(fxCanvas) return;
    fxCanvas = document.createElement("canvas");
    fxCanvas.className = "edgemore-fx-canvas";
    fxCanvas.setAttribute("aria-hidden", "true");
    document.body.insertBefore(fxCanvas, document.body.firstChild);
    fxCtx = fxCanvas.getContext("2d");
    resizeFxCanvas();
    window.addEventListener("resize", resizeFxCanvas);
    document.addEventListener("visibilitychange", function(){
      if(document.hidden) stopRAF();
      else if(fxKind && !prefersReducedMotion) startRAF();
    });
  }
  function resizeFxCanvas(){
    if(!fxCanvas) return;
    var dpr = window.devicePixelRatio || 1;
    fxCanvas.width = window.innerWidth * dpr;
    fxCanvas.height = window.innerHeight * dpr;
    fxCanvas.style.width = window.innerWidth + "px";
    fxCanvas.style.height = window.innerHeight + "px";
    fxCtx.setTransform(dpr,0,0,dpr,0,0);
  }
  function makeParticle(kind){
    var w = window.innerWidth, h = window.innerHeight;
    if(kind === "leaves"){
      var colors = [cssVar("--pink","#d97a34"), cssVar("--gold","#e8b64a"), cssVar("--cyan","#c9932f"), cssVar("--purple","#8a4b23")];
      return {
        x: Math.random()*w, y: Math.random()*h - h,
        size: 8 + Math.random()*8,
        speed: 18 + Math.random()*22,
        sway: 20 + Math.random()*30,
        swayFreq: 0.5 + Math.random()*0.7,
        phase: Math.random()*Math.PI*2,
        rot: Math.random()*Math.PI*2,
        rotSpeed: (Math.random()-0.5) * 1.4,
        color: colors[Math.floor(Math.random()*colors.length)]
      };
    }
    var colors2 = [cssVar("--pink","#ff5eae"), cssVar("--purple","#7b2ff7"), cssVar("--cyan","#3ad0ff"), cssVar("--gold","#ffd23f")];
    return {
      x: Math.random()*w, y: Math.random()*h - h,
      w_: 6 + Math.random()*5, h_: 3 + Math.random()*3,
      speed: 40 + Math.random()*40,
      sway: 15 + Math.random()*25,
      swayFreq: 0.6 + Math.random()*0.8,
      phase: Math.random()*Math.PI*2,
      rot: Math.random()*Math.PI*2,
      rotSpeed: (Math.random()-0.5) * 3,
      flipFreq: 2 + Math.random()*3,
      flipPhase: Math.random()*Math.PI*2,
      color: colors2[Math.floor(Math.random()*colors2.length)]
    };
  }
  function drawParticle(p){
    fxCtx.save();
    fxCtx.translate(p.x, p.y);
    fxCtx.rotate(p.rot);
    if(fxKind === "leaves"){
      var s = p.size;
      fxCtx.beginPath();
      fxCtx.moveTo(0,-s);
      fxCtx.quadraticCurveTo(s*0.8, -s*0.2, 0, s);
      fxCtx.quadraticCurveTo(-s*0.8, -s*0.2, 0, -s);
      fxCtx.fillStyle = p.color;
      fxCtx.fill();
      fxCtx.strokeStyle = "rgba(0,0,0,0.18)";
      fxCtx.lineWidth = 1;
      fxCtx.beginPath(); fxCtx.moveTo(0,-s); fxCtx.lineTo(0,s); fxCtx.stroke();
    } else if(fxKind === "confetti"){
      var scaleX = Math.cos(p.flipPhase);
      fxCtx.scale(scaleX, 1);
      fxCtx.fillStyle = p.color;
      fxCtx.fillRect(-p.w_/2, -p.h_/2, p.w_, p.h_);
    }
    fxCtx.restore();
  }
  function drawStatic(){
    if(!fxCtx) return;
    fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height);
    fxParticles.forEach(drawParticle);
  }
  function tick(t){
    if(!fxKind){ return; }
    var dt = Math.min(0.05, (t - fxLastT) / 1000);
    fxLastT = t;
    var h = window.innerHeight;
    fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height);
    fxParticles.forEach(function(p){
      p.y += p.speed * dt;
      p.rot += p.rotSpeed * dt;
      if(fxKind === "confetti") p.flipPhase += p.flipFreq * dt;
      p.x += Math.sin(t/1000 * p.swayFreq + p.phase) * p.sway * dt * 2;
      if(p.y > h + 20){ p.y = -20; p.x = Math.random()*window.innerWidth; }
      drawParticle(p);
    });
    fxRAF = requestAnimationFrame(tick);
  }
  function startRAF(){
    if(fxRAF) return;
    fxLastT = performance.now();
    fxRAF = requestAnimationFrame(tick);
  }
  function stopRAF(){
    if(fxRAF){ cancelAnimationFrame(fxRAF); fxRAF = null; }
  }
  function startFx(kind){
    ensureCanvas();
    fxKind = kind;
    var count = kind === "leaves" ? 26 : 42;
    fxParticles = [];
    for(var i=0;i<count;i++) fxParticles.push(makeParticle(kind));
    if(!prefersReducedMotion) startRAF();
    else drawStatic();
  }
  function stopFx(){
    fxKind = null;
    stopRAF();
    if(fxCtx && fxCanvas) fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height);
    fxParticles = [];
  }

  function applySkin(skin){
    if(skin && skin !== "classic") document.body.setAttribute("data-skin", skin);
    else document.body.removeAttribute("data-skin");

    removeLights();
    stopFx();
    if(skin === "christmas") buildLights();
    else if(skin === "fall") startFx("leaves");
    else if(skin === "birthday") startFx("confetti");
    // halloween & classic: no extra decoration
  }

  global.Edgemore = {
    db: db,
    setSession: setSession, getSession: getSession,
    slugify: slugify, makeSessionCode: makeSessionCode,
    escapeHtml: escapeHtml,
    subscribeSettings: subscribeSettings, saveSettings: saveSettings,
    subscribeQueue: subscribeQueue, addToQueue: addToQueue, removeFromQueue: removeFromQueue,
    reorderQueue: reorderQueue, clearQueue: clearQueue,
    subscribeNow: subscribeNow, setNow: setNow, clearNow: clearNow,
    subscribeHistory: subscribeHistory, addHistory: addHistory, clearHistory: clearHistory,
    formatDateTime: formatDateTime,
    searchYouTube: searchYouTube,
    buildAnnouncement: buildAnnouncement,
    applySkin: applySkin
  };
})(window);

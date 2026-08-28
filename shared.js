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

  function applySkin(skin){
    if(skin && skin !== "classic") document.body.setAttribute("data-skin", skin);
    else document.body.removeAttribute("data-skin");
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

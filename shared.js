// ===== Club Edgemore Karaoke — shared logic used by index.html and join.html =====
(function(global){
  "use strict";

  var app = firebase.initializeApp(FIREBASE_CONFIG);
  var db = firebase.database();

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

  // ---------- Settings (title / subtitle / skin) — shared across every page ----------
  function subscribeSettings(cb){
    db.ref("settings").on("value", function(snap){ cb(snap.val() || {}); });
  }
  function saveSettings(partial){
    return db.ref("settings").update(partial);
  }

  // ---------- Queue ----------
  function subscribeQueue(cb){
    db.ref("queue").on("value", function(snap){
      var arr = toArray(snap.val());
      arr.sort(function(a,b){ return (a.order||0) - (b.order||0); });
      cb(arr);
    });
  }
  function addToQueue(name, song, videoId, thumb, order){
    return db.ref("queue").push({
      name: name, song: song, videoId: videoId, thumb: thumb || "",
      order: order, createdAt: firebase.database.ServerValue.TIMESTAMP
    });
  }
  function removeFromQueue(id){ return db.ref("queue/" + id).remove(); }
  function reorderQueue(idA, orderA, idB, orderB){
    var updates = {};
    updates["queue/" + idA + "/order"] = orderB;
    updates["queue/" + idB + "/order"] = orderA;
    return db.ref().update(updates);
  }
  function clearQueue(){ return db.ref("queue").remove(); }

  // ---------- Now playing ----------
  function subscribeNow(cb){
    db.ref("now").on("value", function(snap){
      var v = snap.val();
      cb(v && !v.cleared ? v : null);
    });
  }
  function setNow(obj){ return db.ref("now").set(obj); }
  function clearNow(){ return db.ref("now").set({ cleared: true, at: Date.now() }); }

  // ---------- History ----------
  function subscribeHistory(cb){
    db.ref("history").on("value", function(snap){
      var arr = toArray(snap.val());
      arr.sort(function(a,b){ return (b.performedAt||0) - (a.performedAt||0); });
      cb(arr);
    });
  }
  function addHistory(name, song, performedAt){
    return db.ref("history").push({ name: name, song: song, performedAt: performedAt });
  }
  function clearHistory(){ return db.ref("history").remove(); }

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

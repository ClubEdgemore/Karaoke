// ===== Club Edgemore Karaoke — shared configuration =====
// Edit the two blocks below, then upload this file alongside index.html and join.html.
// Nothing else in the app needs to change.

// 1) Firebase Realtime Database config.
//    Firebase console (console.firebase.google.com) → your project → gear icon
//    "Project settings" → scroll to "Your apps" → the </> (web) app → the firebaseConfig object.
//    This "apiKey" is Firebase's public web key — it's meant to be visible in client code,
//    unlike the YouTube key below. Access is controlled by your Database Rules instead.
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyB-5ZJ0Dh74pjAV9fDMGiSo4TRzC9cX9Ek",
  authDomain: "club-edgemore-karaoke.firebaseapp.com",
  databaseURL: "https://club-edgemore-karaoke-default-rtdb.firebaseio.com",
  projectId: "club-edgemore-karaoke",
  storageBucket: "club-edgemore-karaoke.firebasestorage.app",
  messagingSenderId: "303305640591",
  appId: "1:303305640591:web:9545d1df7630ffcca3fefa"
};

// 2) YouTube Data API v3 key.
//    Google Cloud Console (console.cloud.google.com) → APIs & Services → Credentials → Create API key.
//    Then enable "YouTube Data API v3" for the project, and (recommended) restrict this key
//    to HTTP referrer "clubedgemore.github.io/*" so it can't be used from other sites.
var YOUTUBE_API_KEY = "PASTE_YOUTUBE_API_KEY_HERE";

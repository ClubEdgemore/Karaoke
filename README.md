# Club Edgemore Karaoke

A browser-based karaoke queue app. Guests scan a QR code, add their name and song from
their own phone, and the host screen announces each performer (text-to-speech) and plays
their video. No app install, no accounts — just a link.

Live at: `https://clubedgemore.github.io/Karaoke/`

## Features

- **Guest self-serve queue** — guests search YouTube and add their own song from `join.html`, no host bottleneck.
- **Live sync** — everyone watching (host screen + every guest's phone) sees the same queue update in real time.
- **Announcer** — text-to-speech calls up the next performer in one of a few phrasings, or can be turned off entirely (Settings → Announcement Style → "No announcer").
- **Full-screen video** — one click to make the player fill the screen.
- **Multiple events, one site** — anyone can host their own separate event from this same link; each gets its own private queue via a session code (see below). Nobody's queue mixes with anyone else's.
- **Seasonal skins** — Classic Neon, Christmas, Fall, Halloween, Birthday (Settings → Theme).
- **Performance history with timestamps** — every completed song is logged with the date and time, so you can pull together a "year in review" later.
- **QR code** — self-generating, always points at the correct join link for whichever event is running.

## Files in this repo

| File | Purpose |
|---|---|
| `index.html` | The host / stage screen. Search, queue, player, announcer, settings. |
| `join.html` | The guest page. Name + song + search + submit. Read-only queue/now-playing preview. |
| `config.js` | **The only file you should need to edit.** Your Firebase config and YouTube API key. |
| `shared.js` | Shared logic both pages use (database calls, search, announcer phrasing). Don't need to touch this. |

All four files need to live in the same folder for the app to work — they load each other by relative path.

## One-time setup

### 1. Firebase (powers the live shared queue)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → name it anything → skip Google Analytics → **Create**.
2. Left sidebar → **Build → Realtime Database** → **Create Database** → pick a location → start in test mode.
3. **Realtime Database → Rules** tab → replace the JSON with:
   ```json
   { "rules": { ".read": true, ".write": true } }
   ```
   Publish. (Test mode otherwise expires after 30 days — this keeps it open permanently. There's nothing sensitive in a song queue, so this is fine.)
4. Gear icon → **Project settings** → scroll to **Your apps** → click the `</>` (web) icon → register the app (skip Firebase Hosting, you don't need it) → copy the `firebaseConfig` object it shows you.
5. Paste those values into the `FIREBASE_CONFIG` block in `config.js`.

### 2. YouTube Data API key

1. [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials → Create Credentials → API key**.
2. Enable **YouTube Data API v3** for that project (APIs & Services → Library → search for it → Enable).
3. (Recommended) Click into the key → **Application restrictions → Websites** → restrict it to `clubedgemore.github.io/*`. This is a client-visible key (it lives in your page's source), so restricting it stops randoms from borrowing it.
4. Paste the key into `YOUTUBE_API_KEY` in `config.js`.

Upload the edited `config.js` to the repo alongside the other three files.

## Running an event

1. Open `index.html` on the screen/laptop connected to the speakers.
2. First time on that browser, it'll ask you to **name your event** — anything works (e.g. "edgemore"). It generates a code like `edgemore-4821`, shown in the "Guests join here" box.
3. Share the QR code or link shown there. It already points at the right event — guests don't type anything.
4. Guests add their name, song, and pick a YouTube result from their own phone.
5. Click **Announce & Play Next** to call up the next performer and start their video.

Reopening `index.html` on that same browser later resumes the same event automatically (no need to re-enter the name). To start a completely fresh event on the same computer, use **Settings (⚙) → Start a different event**.

## Settings (⚙, on `index.html`)

- **Event Title / Subtitle** — shown on both the host screen and the join page.
- **Theme / Skin** — shared across both pages.
- **Announcer Voice** — per-device; pick whichever browser voice sounds best on the stage speakers.
- **Announcement Style** — the phrasing used, or "No announcer — just play the video" to skip TTS entirely.
- **Clear queue & history** — wipes the current event's queue and performance log.
- **Start a different event** — abandons the current session code on this device and starts over with a new one.

## Troubleshooting

- **"No YouTube API key set yet" even after editing config.js** — almost always caching. GitHub Pages sits behind a CDN that can take a couple minutes to pick up a fresh push. Wait a minute, then hard-refresh (Cmd/Ctrl+Shift+R) or open in a private/incognito window before assuming something's broken.
- **QR code / session doesn't seem to update after a change** — same story, hard-refresh or use a private window.
- **A video won't embed ("playback on other websites has been disabled")** — the video's owner blocked embedding. Search already filters for `videoEmbeddable=true`, so this should be rare; if it happens, just search again and pick a different result.
- **Search fails outright** — check the browser's dev console for the actual error. Common causes: YouTube Data API not enabled on the Cloud project, daily quota exceeded, or the key's HTTP-referrer restriction doesn't match your actual domain.
- **Two people picked the same event name and now share a queue** — session codes have a random 4-digit suffix specifically to avoid this, but it's not impossible with a common name + bad luck. Use "Start a different event" to get a new code.

## How multi-event sessions work (for the curious)

Every host gets a session code (`your-name-1234`). All data — queue, now-playing, history, title/skin — lives in Firebase under `sessions/<code>/...`, so different hosts' events never overlap. The code lives in the URL (`?s=your-name-1234`) and is remembered in that browser's local storage, which is why reopening the page resumes the same event without re-asking.

There's no login or password — anyone who knows (or guesses) a session code could technically view or modify that event's queue. For a karaoke night that's an acceptable trade-off (the queue itself isn't sensitive), but it's worth knowing if this ever gets used somewhere higher-stakes.

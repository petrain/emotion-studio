# Emotion Studio

**Live:** https://petrain.github.io/emotion-studio/ — on your first visit a dialog asks for your Speech resource region and key (you can reopen it any time with **Connect**, top right). Keys stay in your browser and go only to Azure.

An emotion-first playground for Azure Speech: pick a model, locale, and voice, spin the emotion wheel, and hear the same line performed in each style.

Supported models:

| Model | Voice suffix | How the style is sent |
|---|---|---|
| MAI-Voice-2.1 | `:MAI-Voice-2.1` | `<mstts:express-as style>` |
| MAI-Voice-2.1 Flash | `:MAI-Voice-2.1-Flash` | `<mstts:express-as style>` |
| Dragon HD Omni | `:DragonHDOmniLatestNeural` | `<mstts:express-as style>` + temperature + paralinguistics |
| Dragon HD | `:DragonHDLatestNeural` | inline `[style]` tag + temperature + paralinguistics |
| Dragon HD Flash | `:DragonHDFlashLatestNeural` | `<mstts:express-as style>` (per-voice styles) |

## Run

```bash
# Option A: the key stays on the server (recommended)
SPEECH_KEY=<your-key> SPEECH_REGION=eastus node server.js

# Option B: no server key. Open http://localhost:5173, click Connect (top right), and paste your region + key.
node server.js
```

The page is plain static files with no build step and no dependencies. Opening `index.html` directly also works in Option B mode, because Azure TTS allows CORS.

## Features

- **Emotion wheel**: scroll, drag, click, or use ↑/↓. Only the styles the selected voice supports are listed. Enter (or a click on the `[ tag ]`) speaks.
- **Emotion orb**: a WebGL sphere that takes on each emotion's color palette and moves with the audio amplitude.
- **Auto-play**: after the first Speak, changing the emotion re-performs the line. Results are cached per SSML, so going back to an emotion replays instantly.
- **Emotion sweep**: plays the line through 5 consecutive emotions and pre-fetches the next one while the current one plays.
- **Word-by-word highlight** while the audio plays. The timing is estimated from the playback position.
- **Paralinguistics** (HD models): insert `[laughter]`, `[sighing]`, and others at the cursor.
- **SSML panel** with Copy, and an **MP3 download** of the last take.
- **Live catalog sync**: once connected, the app loads `voices/list` from your resource (cached for 24 hours). It picks up new MAI and HD voices along with their `StyleList`. The doc tables in `data.js` are the offline fallback.

## Files

- `index.html`, `styles.css`: layout. Light and dark themes, responsive down to phone width.
- `data.js`: voice and style catalog taken from the MAI-voices and HD-voices docs, plus sample lines in 24 languages.
- `app.js`: wheel physics, SSML builder, synthesis, playback, and sync.
- `orb.js`: WebGL orb shader.
- `server.js`: zero-dependency static server and `/api/tts` + `/api/voices` proxy.

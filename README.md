# Loopee Live Station

A minimal five-track browser loop studio with microphone capture, synchronized overdubs, per-track transport, undo/redo, input and track effects, synthesized rhythms, and stereo WAV export.

## Run and build

Requires Node.js 24.

```sh
npm ci
npm run dev
npm run build
node --test tests/*.test.js
```

Development and Netlify use `/`. The GitHub Pages workflow builds with `--base=/loopee/`.

## Make a loop

1. Choose BPM and 1, 2, 4 or 8 bars in 4/4. Tap tempo is available before the session has audio.
2. Press **Gravar** on an empty slot. Allow microphone access and enter after the four-beat count-in.
3. The selected cycle records and starts looping automatically. The recording guide shows when capture starts and ends.
4. Record into another slot to build a separate track, or press **Overdub** to layer audio into an existing track.
5. A second record press finishes on the next bar, padding the remaining cycle with silence. While waiting, the main action cancels capture.
6. Each track offers synced start/stop, volume, mute/solo, one-level Undo/Redo, Reverse, half speed and Clear. **Tocar todas / Parar todas** control the station.

Switch off Reverse and half speed before overdubbing that track. BPM and loop length stay fixed after audio is created; **Novo loop** clears the session after confirmation and unlocks them.

## Effects and rhythms

**Efeitos de entrada** processes only the microphone and is baked into new recordings. **Efeitos da pista** changes only the selected track during playback. A manual microphone gain control adjusts input level before capture. Both use original reverb, delay, filter, drive, chorus and compressor implementations. Recorded tracks start with dry playback effects.

The metronome and two synthesized rhythm patterns follow the audio clock. They are not digitally fed into capture; use headphones to avoid acoustic re-recording. WAV mixdown includes audible tracks, effects and the active rhythm. If an audible track uses half speed, export spans two base cycles to include its whole phrase.

## Save sessions

**Salvar sessão** stores actual PCM audio and settings in IndexedDB on this browser/device. **My sessions** lists sessions and restores their audio. Sessions do not sync across devices, and clearing browser site data removes them. Save a WAV backup outside the browser. Very large sessions may exceed browser storage quota.

## Mobile microphone

Requires HTTPS and microphone permission. **Alto-falantes · reduzir eco** requests browser echo cancellation; it cannot guarantee isolation and may change musical tone. **Fones / interface · áudio puro** disables echo processing. Noise suppression and automatic gain remain off to preserve music. Input effects can still intentionally process this signal. Real-device latency and echo suppression vary; no latency calibration is implemented yet.

## Deploy

Netlify: connect `main`; `netlify.toml` uses `npm run build`, publish directory `dist`, and Node 24. For manual upload, upload the contents of `dist`, not the source checkout.

GitHub Pages: in repository Settings → Pages select Deploy from a branch, `gh-pages / (root)`. The workflow updates that branch on pushes to `main`.

## Reference and implementation scope

The requested reference is BOSS RC-505mkII. Official/manual retrieval was blocked by HTTP 403 in this environment. Loopee adapts loop-station workflows with original Web Audio code; it is not a complete emulation of the proprietary DSP, MIDI/USB, effect catalogue or independent track-length modes. See [design and limits](docs/loop-station-design.md).

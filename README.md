# Loopee Studio

Browser-based music loop studio with microphone recording, audio import, six live effects, mute/solo controls, and stereo WAV export.

## Development

Requires Node.js 24.

```sh
npm ci
npm run dev
```

## Build

```sh
npm run build
```

The default Vite base path is `/`, for Netlify and local development. The GitHub Pages workflow builds with `--base=/loopee/`.

## GitHub Pages

In repository **Settings → Pages**, choose **Deploy from a branch**, then **gh-pages / (root)** and save. The deployment workflow rebuilds and updates `gh-pages` on pushes to `main`.

Expected URL after Pages activation: https://lojauget-star.github.io/loopee/

## Current limits

Microphone capture requires HTTPS and browser permission. Saved sessions contain mix settings, not audio. WAV export includes the separate effect chain of each unmuted track. Imported audio is padded or trimmed to the shared loop duration, without time-stretching. This is a prototype, not yet a production commercial looper.

## Netlify

Connect the `main` branch of this repository. `netlify.toml` sets the build command to `npm run build`, the publish directory to `dist`, and Node.js to 24.

For manual deployment, run `npm ci` and `npm run build`, then upload the **dist** folder, not the source checkout. Its root must contain `index.html` and `assets/`.

## Live looper

1. Start with an empty canvas. Choose BPM and 1, 2, 4 or 8 bars in 4/4.
2. Press Record and allow microphone access. A four-beat count-in precedes the first take.
3. Play for the selected number of bars. Capture ends automatically and the recorded layer loops immediately.
4. Press Record again. Capture begins at the next loop boundary while existing layers continue uninterrupted.
5. Press Record during capture to finish on the next bar boundary. Remaining bars are silence; every layer keeps the shared loop length.
6. Stop cancels an active or armed take and stops playback. Novo loop clears the session after confirmation and unlocks BPM and loop duration.

Use headphones to keep speakers from being recorded into new layers. Recording uses AudioWorklet PCM capture on the audio render clock. Browser/device input latency can affect performance; there is no latency calibration yet. Session settings do not preserve recorded audio across reloads; export WAV before closing.

Run capture boundary tests with `node --test tests/loop-recorder.test.js`.

## Avoid recording existing layers again

The recorder is connected only to microphone input, never to the playback/effects bus. With speakers, microphone pickup can still include existing layers acoustically. The **Alto-falantes · reduzir eco** mode requests browser echo cancellation (enabled by default); effectiveness depends on the browser, device and room and can affect music tone. The app warns if the input settings do not confirm echo cancellation. **Fones / interface · áudio puro** disables echo processing; use headphones or an isolated audio interface output. Noise suppression and automatic gain remain off in both modes to preserve music. The chosen mode persists on the device and cannot change during capture.

Verified in Chromium with a silent simulated microphone: playing demo layers with reverb and delay do not appear in the captured PCM. This establishes digital routing isolation, not real-world acoustic echo removal.

## Guided recording interface

Use **Gravar primeira camada**, then **Gravar nova camada**. Each button press prepares capture directly; no separate empty-track creation is needed. The recording guide derives its state from the audio clock and shows microphone permission, waiting/count-in, recording, finishing, and loop playback. It displays beats until entry, seconds until automatic completion, progress, and a pending layer in the canvas. The main button becomes **Cancelar entrada** while waiting or **Concluir no próximo compasso** during capture. Existing layers remain playing throughout an overdub. Timing state tests run with `node --test tests/*.test.js`.

## Mobile controls and per-track effects

BPM, loop bars, and the metronome remain visible on phone layouts with touch-sized controls. BPM/bars are fixed once a loop has audio; the interface explains that **Novo loop** unlocks them.

Each imported or recorded track starts dry, with its own reverb, delay, filter, drive, chorus and compressor. Use the track's **FX** button or the effects panel's track selector. Edits and Reset affect only that track. Track effect settings are saved with session settings, and WAV rendering uses the same per-track processing graph. Microphone input remains separate from playback and effects. Effects are summed into master output; volume/mute/solo apply after each track's effect chain.

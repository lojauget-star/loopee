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

Microphone capture requires HTTPS and browser permission. Saved sessions contain mix settings, not audio. WAV export does not include live effects. Imported audio is padded or trimmed to the shared loop duration, without time-stretching. This is a prototype, not yet a production commercial looper.

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

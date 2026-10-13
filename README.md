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

The Vite base path is `/loopee/` for GitHub Pages.

## GitHub Pages

In repository **Settings → Pages**, choose **Deploy from a branch**, then **gh-pages / (root)** and save. The deployment workflow rebuilds and updates `gh-pages` on pushes to `main`.

Expected URL after Pages activation: https://lojauget-star.github.io/loopee/

## Current limits

Microphone capture requires HTTPS and browser permission. Saved sessions contain mix settings, not audio. WAV export does not include live effects. Imported audio is not time-stretched to project tempo. This is a prototype, not yet a production commercial looper.

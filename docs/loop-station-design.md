# Loopee Live Station: adaptation of the requested RC-505mkII reference

Reference supplied by the user: BOSS RC-505mkII, linked through Classic Keyboards. Official resources: https://www.boss.info/global/products/rc-505mk2/ and https://www.boss.info/global/support/by_product/rc-505mk2/owners_manuals/ . Attempts to retrieve the product page and an official PDF in this environment returned HTTP 403. These links are provided for later verification; the manual was not read here. This is an original implementation of familiar loop-station operations, not a firmware reverse engineering or a complete hardware emulation.

| Operation | Loopee adaptation |
| --- | --- |
| Five tracks | Five stereo audio slots, each with direct record/overdub and independent volume |
| Record / Play / Overdub | Clock-scheduled microphone capture; a new take becomes playback, or is summed into the selected track's raw buffer |
| Synchronization | All tracks share the selected 1/2/4/8-bar 4/4 grid; stop/start and playback transforms align to loop boundaries |
| All start / stop | Explicit controls for the full station; individual track transport remains available |
| Undo / redo | One level per track; restores exact audio buffers, including an empty slot after undoing its first recording |
| Input effects | Six original Web Audio effects before PCM capture; baked into the recorded input without routing playback to capture |
| Track effects | Separate six-effect graph per track; non-destructive edits and WAV rendering |
| Reverse / half speed | Reverse sample order; half-speed changes playback rate and repeats over two base cycles |
| Rhythm | Two original synthesized 4/4 patterns, volume control, metronome and tap tempo; rhythm is included in mix export but not digitally routed into mic capture |
| Session memories | Multiple IndexedDB sessions with actual stereo PCM and settings; saved on this browser/device |
| Portable output | Stereo 16-bit WAV with per-track effects, track gains, active rhythm, reverse and playback rate |

## Audio architecture

Microphone → browser echo processing (optional) → input effect chain → sample-clock PCM recorder → new track or overdub commit.

A manual input gain is applied before the input effect bank. Master output meters read actual left/right sample levels.

Each track's raw audio → reverse/playback rate → independent track effect chain → track gain/mute/solo/stopped state → master gain → speakers/headphones.

Rhythm → master gain → output. Recorder output is connected only to a zero-gain destination to keep the worklet running; playback and rhythm never connect to its input. Acoustic speaker bleed still requires headphones or effective browser echo cancellation.

The UI derives its waiting/recording/finishing state from scheduled start/end times. New slots are never created as dummy tracks. Overdub writes only to its chosen raw track, never to the processed output bus. Buffer history stores a single undo and redo reference to bound memory usage. Retired sources stop on the audio clock and dispose their LFO/effect graph when ended.

## Deliberate limits

- This version implements a shared fixed loop length, not the hardware's full multi-track independent length, one-shot, assignment, MIDI or USB feature set.
- It provides six original input effects and six original effects per track, not the complete proprietary BOSS algorithms or presets.
- Overdub currently requires normal forward playback; switch off reverse and half speed before capturing onto that track.
- There is no sample-latency calibration, pitch-preserving time stretch or automatic musical key detection. Half speed also lowers pitch.
- Undo/redo covers audio edits, not effect parameter changes, and history is not restored with saved sessions.
- Memory is local to the browser; clearing site data removes sessions. Export a WAV backup. No cloud accounts, payments, or commercial sound assets are included.

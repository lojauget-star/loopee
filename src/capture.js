// Disable noise suppression and automatic gain: they distort sustained notes.
// Echo cancellation uses the browser's speaker reference in speaker mode.
export function microphoneConstraints(mode) {
  return { audio: {
    echoCancellation: mode === 'speakers',
    noiseSuppression: false,
    autoGainControl: false,
  } };
}

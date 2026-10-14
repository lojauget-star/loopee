export function commitBuffer(track, buffer) {
  track.undoBuffer = track.buffer || null;
  track.undoAvailable = true;
  track.redoBuffer = null;
  track.redoAvailable = false;
  track.buffer = buffer;
  track.reversedBuffer = null;
}
export function undoTrack(track) {
  if (!track.undoAvailable) return false;
  track.redoBuffer = track.buffer;
  track.redoAvailable = true;
  track.buffer = track.undoBuffer;
  track.undoAvailable = false;
  track.reversedBuffer = null;
  return true;
}
export function redoTrack(track) {
  if (!track.redoAvailable) return false;
  track.undoBuffer = track.buffer;
  track.undoAvailable = true;
  track.buffer = track.redoBuffer;
  track.redoAvailable = false;
  track.reversedBuffer = null;
  return true;
}
export function mixSamples(previous, incoming) {
  if (previous.length !== incoming.length) throw new Error('Overdub must share the loop length');
  const mixed = new Float32Array(previous.length);
  for (let i=0;i<mixed.length;i++) mixed[i] = previous[i] + incoming[i];
  return mixed;
}

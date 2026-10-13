import { test } from 'node:test';
import assert from 'node:assert/strict';
import { microphoneConstraints } from '../src/capture.js';

test('speaker mode requests echo cancellation without suppressing music or changing gain', () => {
  assert.deepEqual(microphoneConstraints('speakers'), { audio: {
    echoCancellation: true, noiseSuppression: false, autoGainControl: false,
  } });
});

test('headphones mode preserves raw input without echo processing', () => {
  assert.deepEqual(microphoneConstraints('headphones'), { audio: {
    echoCancellation: false, noiseSuppression: false, autoGainControl: false,
  } });
});

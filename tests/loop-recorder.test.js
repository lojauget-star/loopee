import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const code = fs.readFileSync(new URL('../public/loop-recorder.js', import.meta.url), 'utf8');
function recorder() {
  let Processor;
  const results = [];
  const sandbox = { Float32Array, currentFrame: 0,
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage: data => results.push(data) }; } },
    registerProcessor: (_, implementation) => { Processor = implementation; },
  };
  vm.runInNewContext(code, sandbox);
  const node = new Processor();
  return { results,
    message: data => node.port.onmessage({ data }),
    block: (frame, left, right) => { sandbox.currentFrame = frame; node.process([[left, ...(right ? [right] : [])]]); },
  };
}

test('capture excludes count-in and stops at exact frame, even inside a block', () => {
  const r = recorder();
  r.message({ type: 'arm', start: 3, end: 9 });
  r.block(0, Float32Array.from([1,2,3,4,5,6,7,8]), Float32Array.from([11,12,13,14,15,16,17,18]));
  assert.equal(r.results.length, 0);
  r.block(8, Float32Array.from([9,10,11,12]));
  assert.deepEqual(Array.from(r.results[0].left), [4,5,6,7,8,9]);
  assert.deepEqual(Array.from(r.results[0].right), [14,15,16,17,18,9]);
  r.block(12, new Float32Array(128));
  assert.equal(r.results.length, 1);
});

test('early finish retains full loop duration and pads unused bars with silence', () => {
  const r = recorder();
  r.message({ type: 'arm', start: 0, end: 12 });
  r.block(0, Float32Array.from([1,2,3,4]));
  r.message({ type: 'finish', end: 6 });
  r.block(4, Float32Array.from([5,6,7,8]));
  assert.deepEqual(Array.from(r.results[0].left), [1,2,3,4,5,6,0,0,0,0,0,0]);
  assert.deepEqual(Array.from(r.results[0].right), Array.from(r.results[0].left));
});

test('cancel never emits an unfinished layer', () => {
  const r = recorder();
  r.message({ type: 'arm', start: 0, end: 8 });
  r.block(0, new Float32Array(4));
  r.message({ type: 'cancel' });
  r.block(4, new Float32Array(8));
  assert.equal(r.results.length, 0);
});

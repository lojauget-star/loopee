import {test} from 'node:test';import assert from 'node:assert/strict';import {shiftedCapture,shiftSamples,estimatedLatencyMs} from '../src/latency.js';
test('compensation never postpones or shortens the capture window',()=>{assert.deepEqual(shiftedCapture(100,1100,50,1000),{start:100,end:1100,offset:50});});
test('manual alignment wraps notes instead of dropping the beginning or end',()=>{assert.deepEqual([...shiftSamples(Float32Array.of(1,2,3,4),1)],[2,3,4,1]);assert.deepEqual([...shiftSamples(Float32Array.of(1,2,3,4),-1)],[4,1,2,3]);});
test('device estimate includes reported input/output and only active input compressor latency',()=>{assert.equal(estimatedLatencyMs({baseLatency:.01,outputLatency:.02},{latency:.03},true),66);assert.equal(estimatedLatencyMs({},{}),0);});

for(const ms of [0,50,300,1000])test(`continuous audio remains complete at ${ms}ms compensation`,()=>{const input=Float32Array.from({length:1000},(_,i)=>.2+ i/10000);const {start,end,offset}=shiftedCapture(500,1500,ms,1000);assert.equal(end-start,input.length);assert.deepEqual([...shiftSamples(input,offset)].sort(),[...input].sort());});

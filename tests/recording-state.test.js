import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordingView } from '../src/recording-state.js';
const input={busy:false,take:null,now:0,beatDuration:.5,loopDuration:4,playing:false,layers:0};

test('first take has one direct recording action',()=>{
  const view=recordingView(input);
  assert.equal(view.phase,'idle');assert.match(view.action,/Gravar primeira camada/);
});
test('an armed take shows beats remaining, not recording progress',()=>{
  const view=recordingView({...input,playing:true,layers:2,now:2.1,take:{startTime:4,endTime:8,layer:3}});
  assert.equal(view.phase,'waiting');assert.equal(view.counter,'4');assert.equal(view.progress,0);assert.equal(view.action,'Cancelar entrada');
});
test('live capture shows exact time remaining and full-loop progress',()=>{
  const view=recordingView({...input,now:6,take:{startTime:4,endTime:8,layer:1}});
  assert.equal(view.phase,'recording');assert.equal(view.counter,'2.0');assert.equal(view.progress,.5);assert.equal(view.step,2);
});
test('manual finish uses shortened capture deadline without shortening the loop',()=>{
  const view=recordingView({...input,now:5,take:{startTime:4,endTime:6,layer:2,finishing:true}});
  assert.equal(view.phase,'finishing');assert.equal(view.counter,'1.0');assert.equal(view.progress,.25);
});
test('completed take becomes a looping state ready for another one-click overdub',()=>{
  const view=recordingView({...input,playing:true,layers:2});
  assert.equal(view.phase,'looping');assert.equal(view.counter,'2');assert.match(view.action,/Gravar nova camada/);assert.equal(view.step,3);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshEffects} from '../src/effects.js';
test('each new track has its own dry effect settings',()=>{
 const a=freshEffects(),b=freshEffects();a[0].on=true;a[0].value=99;
 assert.equal(b[0].on,false);assert.equal(b[0].value,28);
 assert.ok(b.every(e=>!e.on));
});

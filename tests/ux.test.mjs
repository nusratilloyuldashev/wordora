import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('practice has a persistent action bar and no old forced top scroll after answer',()=>{
 const app=read('src/app.js'),css=read('src/styles.css');
 assert.match(app,/practice-actionbar/);
 assert.match(css,/\.practice-actionbar\{position:fixed/);
 assert.match(css,/@media\(max-width:590px\)/);
 const fn=app.split('async function saveAndAdvance')[1].split('function checkTyped')[0];
 assert.doesNotMatch(fn,/window\.scrollTo\(/);
 assert.doesNotMatch(fn,/positionPractice\(/);
});

test('mixed mode uses only supported persisted modes',()=>{
 const app=read('src/app.js');
 assert.match(app,/id:'mix'/);
 assert.match(app,/\['choice','write','listen'\]/);
 assert.match(app,/mode:questionMode\(\)/);
});

test('keyboard, session limits, focus and opt-in auto-next exist',()=>{
 const app=read('src/app.js');
 for(const token of ['sessionLimit','session-length','auto-next-toggle','scheduleAutoNext','keydown','preventScroll:true','selectChoice','action===\'skip\'']) assert.ok(app.includes(token),token);
 assert.match(app,/!state.autoNext/);
});
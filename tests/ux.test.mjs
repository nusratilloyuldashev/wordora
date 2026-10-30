import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
test('practice never forces scroll on each new question',()=>{
 const afterSave=app.split('async function saveAndAdvance(quality)')[1].split('function checkTyped')[0];
 assert.doesNotMatch(afterSave,/window\.scrollTo|scrollIntoView/);
 assert.doesNotMatch(app,/positionPractice\(/);
});
test('action buttons stay visible while practicing',()=>{
 assert.match(app,/practice-actionbar/);
 assert.match(css,/\.practice-actionbar\{position:fixed/);
});
test('keyboard and optional auto progression supported',()=>{
 assert.match(app,/addEventListener\('keydown'/);
 assert.match(app,/scheduleAutoNext/);
 assert.match(app,/sessionLimit/);
});
test('mixed mode saves a supported practice type',()=>{
 assert.match(app,/questionMode\(\)/);
 assert.match(app,/mode:questionMode\(\)/);
});

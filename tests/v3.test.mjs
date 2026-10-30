import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('words keep owner and category while adding independent topic and POS',()=>{
 const sql=read('supabase/upgrade_3_0.sql');
 assert.match(sql,/add column if not exists topic/);
 assert.match(sql,/add column if not exists word_type/);
 assert.match(sql,/using \(owner_id=\(select auth\.uid\(\)\) and category='mine'\)/);
 assert.doesNotMatch(sql.split('\n').filter(line=>!line.trim().startsWith('--')).join('\n'),/drop table|truncate|delete from public\./i);
});
test('word tags safely persisted and missing migration detected',()=>{
 const api=read('src/supabase-api.js');
 assert.match(api,/taxonomyReady = false/);
 assert.match(api,/\.insert\(payload\)/);
 assert.match(api,/payload.topic=topic;payload.word_type=wordType/);
 assert.match(api,/method==='PATCH'/);
 assert.match(api,/\.eq\('owner_id',user\.id\)/);
});
test('learning and tests are separate',()=>{
 const app=read('src/wordora-v3.js');
 assert.match(app,/function v3LearnPage\(/);
 assert.match(app,/function v3ExercisesPage\(/);
 assert.match(app,/modes\.filter\(m=>m\.id!=='cards'\)/);
});
test('learned words still return for due review',()=>{
 const app=read('src/wordora-v3.js');
 assert.match(app,/repetitions\|\|0\)>=3/);
 assert.match(app,/v3Due\(w\)&&v3Stage\(w\)==='mastered'/);
 assert.match(app,/v3ReadyWords\(pool/);
});
test('all custom markup is HTML-escaped for stored fields',()=>{
 const app=read('src/wordora-v3.js');
 for(const expression of ['esc(w.en)','esc(w.uz)','esc(w.example_en)','esc(state.search)','esc(editing.en)'])assert.ok(app.includes(expression));
});
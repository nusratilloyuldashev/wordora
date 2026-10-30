import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const js=read('src/wordora-v5.js');
const flow=read('src/wordora-v4.js');
const sql=read('supabase/upgrade_5_0.sql');
const html=read('src/index.html');
const css=read('src/wordora-v5.css');
test('English word validation differentiates unknown, unavailable and verified',()=>{
 assert.match(js,/api\.dictionaryapi\.dev\/api\/v2\/entries\/en/);
 assert.match(js,/api\.datamuse\.com\/sug\?s=/);
 assert.match(js,/response\.status===404/);
 assert.match(js,/status:'unknown'/);
 assert.match(js,/status:'offline'/);
 assert.match(js,/validation\.status!=='valid'/);
});
test('POS is suggested from dictionary but remains editable',()=>{
 assert.match(js,/v5InferPOS/);
 assert.match(js,/partOfSpeech/);
 assert.match(js,/typeTouched/);
 assert.match(js,/v3-type-add/);
 assert.match(js,/v5InferTopic/);
});
test('Unit collection is many-to-many and independent of category and grammar',()=>{
 assert.match(sql,/create table if not exists public\.word_collections/);
 assert.match(sql,/create table if not exists public\.word_collection_items/);
 assert.match(sql,/primary key\(user_id,collection_id,word_id\)/);
 assert.doesNotMatch(sql,/\b(drop table|truncate table|delete from public\.words|delete from public\.progress)\b/i);
 assert.match(js,/v5Link\(id,collection\.id\)/);
 assert.match(js,/v5Include\(w,V5\.learnCollection\)/);
 assert.match(js,/v5OldPracticeWords/);
 assert.match(js,/v5OldGroups/);
});
test('collection authorization is row-scoped, and membership cannot refer to private third-party words',()=>{
 assert.match(sql,/alter table public\.word_collections enable row level security/);
 assert.match(sql,/alter table public\.word_collection_items enable row level security/);
 assert.match(sql,/user_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/w\.owner_id is null or w\.owner_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/foreign key\(collection_id,user_id\)/);
});
test('duplicate existing starter words are linked instead of inserted',()=>{
 assert.match(js,/validation\.already/);
 assert.match(js,/if\(duplicate\)/);
 assert.match(js,/id=duplicate\.id/);
 assert.match(js,/if\(collection\)await v5Link/);
});
test('correct learning answers automatically continue, manual checkbox respects preference',()=>{
 assert.match(flow,/WordoraV5Schedule\?\.\(\)/);
 assert.match(js,/window\.WordoraV5Schedule=v5AutoAdvanceSchedule/);
 assert.match(js,/950/);
 assert.match(js,/v4Advance\(\)/);
 assert.match(js,/localStorage\.setItem\('wordora-v5-auto-advance'/);
});
test('version 5 is optional before database migration, not a destructive replacement',()=>{
 assert.match(js,/if\(!V5\.ready\)return html/);
 assert.match(js,/v5EarlierLoad/);
 assert.match(html,/wordora-v5\.js/);
 assert.match(html,/wordora-v5\.css/);
 assert.match(css,/@media\(max-width:590px\)/);
});
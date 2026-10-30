import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../' + p, import.meta.url),'utf8');

test('all 86 starter words in one reproducible SQL setup',()=>{
  const sql = read('supabase/setup.sql');
  const seed = sql.split('from (values\n')[1].split(') as v(category,en,uz,example_en,example_uz,level)')[0];
  assert.equal((seed.match(/^\('/gm)||[]).length,86);
  assert.match(sql,/where not exists \(/i);
});
test('RLS and user-scoped review RPC in SQL',()=>{
  const sql = read('supabase/setup.sql');
  for (const table of ['words','progress','reviews']) assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(sql,/wordora_review\(/);
  assert.match(sql,/v_user uuid := auth\.uid\(\)/);
  assert.match(sql,/security definer set search_path = ''/);
  assert.match(sql,/revoke all on public\.words, public\.progress, public\.reviews from public, anon, authenticated/);
  assert.match(sql,/grant execute on function public\.wordora_review\(bigint,text,integer\) to authenticated/);
  assert.doesNotMatch(sql,/grant (insert|update) on public\.(progress|reviews) to authenticated/);
});
test('the frontend uses Supabase instead of old localhost FastAPI',()=>{
  const app=read('src/app.js'), adapter=read('src/supabase-api.js'), html=read('src/index.html');
  assert.doesNotMatch(app,/wordora_token|fetch\('\/api/);
  assert.match(adapter,/\.rpc\('wordora_review'/);
  assert.match(app,/\.auth\.signOut/);
  assert.match(html,/supabase-js@/);
});

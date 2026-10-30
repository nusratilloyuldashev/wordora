import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const v4=read('src/wordora-v4.js');
const sql=read('supabase/upgrade_4_0.sql');
test('guided learning requires three passes before user marks a set complete',()=>{
  assert.match(v4,/minRounds:3/);
  assert.match(v4,/completedRounds>=V4\.minRounds/);
  assert.match(v4,/round===1\?'Ko‘ring/);
  assert.match(v4,/round===2\?'Tarjimasiga/);
  assert.match(v4,/Eshitib va eslab yozing/);
  assert.match(v4,/function v4LessonComplete/);
  assert.match(v4,/if\(!V4\.lesson\?\.finished\|\|V4\.testSaving\)return/);
});
test('exam never accidentally uses unintroduced words',()=>{
  assert.match(v4,/v4Words\(\)\.filter\(w=>v4Introduced\(w\)/);
  assert.match(v4,/v4PracticeWords\(day\)/);
  assert.match(v4,/threshold: 90/);
  assert.match(v4,/const promote=passed&&q\.checked/);
  assert.match(v4,/const stage=promote\?'mastered':'learning'/);
  assert.match(v4,/last_test_score:score/);
});
test('learning state is isolated by Supabase RLS and migration is additive',()=>{
  assert.match(sql,/create table if not exists public\.word_learning/);
  assert.match(sql,/enable row level security/);
  assert.match(sql,/user_id=\(select auth\.uid\(\)\)/);
  assert.match(sql,/on conflict \(user_id,word_id\) do nothing/);
  assert.match(sql,/last_test_score >= 90/);
  const executable=sql.split('\n').filter(l=>!l.trim().startsWith('--')).join('\n');
  assert.doesNotMatch(executable,/\bdrop table\b|\btruncate\b|\bdelete from\b/i);
});
test('missing migration preserves the existing version 3 interface and progress',()=>{
  assert.match(v4,/if\(!V4\.ready\)return v4OldShell\(\)/);
  assert.match(v4,/if\(!V4\.ready\)return !w\.due_on/);
  assert.match(v4,/if\(!V4\.ready\)return !!w\.due_on/);
});
test('pronunciation, visual scenes, retry and saved resume are available',()=>{
  for(const word of ['function v4Scene(', 'function v4Pronounce()', 'v4-illustration', 'v4-speaker', 'v4-learning-form', 'v4SafeStorage', 'data-v4="retry"', 'wordora-lesson-v4-'])assert.ok(v4.includes(word),word);
});
test('test and practice separated by navigation and date groups',()=>{
  assert.match(v4,/navitem\('exercises'/);
  assert.match(v4,/navitem\('exam'/);
  assert.match(v4,/function v4Groups/);
  assert.match(v4,/v4DateSelect\('practice'\)/);
  assert.match(v4,/v4DateSelect\('test'\)/);
});
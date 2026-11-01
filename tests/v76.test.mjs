import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

function sandbox() {
  const handlers = {};
  const stored = new Map();
  const calls = {renders:0, navigation:'', practice:''};
  const words = [
    {id:1,en:'apple',uz:'olma'},
    {id:2,en:'school',uz:'maktab'},
    {id:3,en:'<script>alert(1)</script>',uz:'<img src=x>'},
  ];
  const memory = {
    1:{stage:'learning',introduced_on:'2026-11-01',next_review_on:'2026-11-01',last_test_score:60},
    2:{stage:'learning',introduced_on:'2026-10-25',next_review_on:'2026-10-31',last_test_score:null},
    3:{stage:'mastered',introduced_on:'2026-11-01',next_review_on:'2026-11-05',last_test_score:45},
  };
  const context = {
    window:{localStorage:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)}},
    document:{addEventListener:(kind,fn)=>{handlers[kind]=fn}},
    state:{user:{id:'alpha'},words},
    V4:{ready:true,memory,threshold:90,practiceDate:'today',reviewOnly:false},
    dashboardPage:()=>'<main><section class="v75-dashboard">7.5</section><div class="v4-stat-strip"></div></main>',
    localISODate:()=> '2026-11-01',
    esc:s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])),
    render:()=>{calls.renders++},
    v4Navigate:p=>{calls.navigation=p},
    startPractice:p=>{calls.practice=p},
  };
  vm.createContext(context);
  vm.runInContext(read('src/wordora-v76.js'),context,{timeout:2000});
  return {context,handlers,stored,calls,words,memory};
}

test('counts today introductions and due reviews, not historical activity',()=>{
  const {context,words,memory}=sandbox();
  const report=context.window.WordoraV76.counts(words,memory,'2026-11-01');
  assert.equal(report.introduced,2);
  assert.equal(report.due,2);
  assert.equal(report.weakTotal,1);
  assert.equal(report.weak[0].en,'apple');
});

test('ignores duplicate ids, null scores and already mastered words',()=>{
  const {context,words,memory}=sandbox();
  const report=context.window.WordoraV76.counts([...words,words[0]],memory,'2026-11-01');
  assert.equal(report.introduced,2);
  assert.equal(report.weakTotal,1);
});

test('personal daily goal is scoped to the current account and rejects unexpected values',()=>{
  const {context,stored}=sandbox();
  const goals=context.window.WordoraV76;
  assert.equal(goals.goalFor('alpha'),10);
  stored.set('wordora-v76-goal-alpha','20');
  stored.set('wordora-v76-goal-beta','5');
  assert.equal(goals.goalFor('alpha'),20);
  assert.equal(goals.goalFor('beta'),5);
  stored.set('wordora-v76-goal-alpha','999');
  assert.equal(goals.goalFor('alpha'),10);
});

test('dashboard appends goal panel without removing 7.5 review calendar',()=>{
  const {context}=sandbox();
  const html=context.dashboardPage();
  assert.match(html,/Kunlik yangi so‘z maqsadi/);
  assert.match(html,/Qayta test talab qiladigan so‘zlar/);
  assert.match(html,/v75-dashboard/);
  assert.match(html,/data-v76="learn"/);
  assert.match(html,/data-v76="review"/);
  assert.doesNotMatch(html,/<script>alert/);
});

test('untrusted dictionary content is HTML-escaped in review priorities',()=>{
  const {context}=sandbox();
  context.V4.memory['3'].stage='learning';
  const html=context.dashboardPage();
  assert.doesNotMatch(html,/<script>alert/);
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/&lt;img src=x&gt;/);
});

test('changing goal updates only that account local preference',()=>{
  const {context,handlers,stored,calls}=sandbox();
  handlers.change({target:{closest:()=>({value:'30'})}});
  assert.equal(stored.get('wordora-v76-goal-alpha'),'30');
  assert.equal(calls.renders,1);
  handlers.change({target:{closest:()=>({value:'999'})}});
  assert.equal(stored.get('wordora-v76-goal-alpha'),'30');
  context.state.user={id:'beta'};
  handlers.change({target:{closest:()=>({value:'5'})}});
  assert.equal(stored.get('wordora-v76-goal-beta'),'5');
  assert.equal(stored.get('wordora-v76-goal-alpha'),'30');
});

test('quick actions use existing 90%-compatible lesson and practice flows',()=>{
  const {context,handlers,calls}=sandbox();
  let stopped=0;
  const event=action=>({target:{closest:()=>({dataset:{v76:action}})},
    preventDefault:()=>{},stopImmediatePropagation:()=>{stopped++}});
  handlers.click(event('learn'));
  assert.equal(calls.navigation,'learn');
  handlers.click(event('review'));
  assert.equal(calls.practice,'mix');
  assert.equal(context.V4.reviewOnly,true);
  assert.equal(context.V4.practiceDate,'all');
  assert.equal(stopped,2);
});

test('no extra network, RPC or database writes and cloud security headers are packaged',()=>{
  const script=read('src/wordora-v76.js');
  assert.doesNotMatch(script,/\bfetch\s*\(|\.rpc\s*\(|\.insert\s*\(|\.upsert\s*\(|\.delete\s*\(/);
  const headers=read('src/_headers');
  assert.match(headers,/X-Frame-Options: DENY/);
  assert.match(headers,/X-Content-Type-Options: nosniff/);
  assert.match(headers,/Permissions-Policy:/);
  const index=read('src/index.html'),worker=read('src/service-worker.js');
  assert.match(index,/wordora-v76\.js/);
  assert.match(index,/wordora-v76\.css/);
  assert.match(worker,/wordora-v76\.js/);
  assert.match(worker,/wordora-v76\.css/);
  assert.match(worker,/wordora-pwa-7\.8\.0/);
  assert.equal(JSON.parse(read('package.json')).version,'7.8.0');
  new Function(script);
});

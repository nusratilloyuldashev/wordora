import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function sandbox(){
 const events={},actions={nav:[],render:0};
 const state={user:{id:'user-1'},page:'library',words:[
  {id:1,en:'apple'},{id:2,en:'run'},{id:3,en:'book'},{id:4,en:'water'}],
  libraryStage:'mastered',libraryTopic:'food',libraryType:'verb',librarySource:'mine',
  libraryPage:4,search:'old'};
 const V4={ready:true,memory:{'2':{stage:'learning',next_review_on:'2026-11-01'},
  '3':{stage:'mastered',next_review_on:'2026-11-07'}},topic:'food',wordType:'verb',
  practiceDate:'2026-11-01',examDate:'2026-11-01',reviewOnly:true};
 const V5={ready:true,libraryCollection:'all',learnCollection:'all',practiceCollection:'all',
  examCollection:'all',collections:[{id:10,name:'Book 1 — Unit 1'},{id:20,name:'Book 1 — Unit 2'}],
  itemIndex:{byCollection:new Map([['10',new Set(['1','2','3'])],['20',new Set(['4'])]])}};
 const context={state,V4,V5,document:{addEventListener:(name,fn)=>{events[name]=fn}},
  window:{},localISODate:()=> '2026-11-01',
  libraryPage:()=>'<main><div class="v3-stage-tabs">ORIGINAL LIBRARY</div></main>',
  esc:x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;')
   .replaceAll('>','&gt;').replaceAll('"','&quot;'),
  render:()=>{actions.render++},v4Navigate:page=>{actions.nav.push(page);state.page=page}};
 vm.createContext(context);vm.runInContext(read('src/wordora-v78.js'),context);
 function click(action,id){
  let cancelled=0;events.click({target:{closest:()=>({dataset:{v78:action,unit:id}})},
  preventDefault:()=>{cancelled++},stopImmediatePropagation:()=>{}});
  return cancelled;
 }
 return {context,actions,click};
}
test('Unit breakdown respects actual membership and 90% mastered stage',()=>{
 const {context}=sandbox();
 const x=context.window.WordoraV78.summary(context.state.words,context.V4.memory,
  context.V5.collections,context.V5.itemIndex);
 assert.deepEqual([x[0].total,x[0].fresh,x[0].learning,x[0].mastered,x[0].due,x[0].progress],
  [3,1,1,1,1,33]);
 assert.equal(x[1].fresh,1);
});
test('dashboard library panel preserves old filters and existing library HTML',()=>{
 const {context}=sandbox(),html=context.libraryPage();
 assert.match(html,/Unit bo‘yicha o‘qish/);
 assert.match(html,/ORIGINAL LIBRARY/);
 assert.match(html,/Book 1 — Unit 1/);
 assert.match(html,/data-v78="learn"/);
 assert.match(html,/data-v78="practice"/);
 assert.match(html,/data-v78="exam"/);
});
test('Unit selection resets stale library filters without deleting words',()=>{
 const {context,click}=sandbox();
 click('open','10');
 assert.equal(context.V5.libraryCollection,'10');
 assert.equal(context.state.libraryPage,0);
 assert.equal(context.state.search,'');
 assert.equal(context.state.libraryTopic,'all');
 assert.equal(context.state.libraryStage,'all');
 assert.equal(context.state.words.length,4);
});
test('lesson shortcut scopes to Unit and resets unrelated topic/POS filters',()=>{
 const {context,actions,click}=sandbox();
 assert.equal(click('learn','10'),1);
 assert.equal(context.V5.learnCollection,'10');
 assert.equal(context.V4.topic,'all');
 assert.equal(context.V4.wordType,'all');
 assert.deepEqual(actions.nav,['learn']);
});
test('practice and exam shortcuts use existing routes and selected Unit',()=>{
 const {context,actions,click}=sandbox();
 click('practice','10');
 assert.equal(context.V5.practiceCollection,'10');
 assert.equal(context.V4.practiceDate,'all');
 assert.equal(context.V4.reviewOnly,false);
 click('exam','10');
 assert.equal(context.V5.examCollection,'10');
 assert.equal(context.V4.examDate,'all');
 assert.deepEqual(actions.nav,['exercises','exam']);
});
test('buttons with no eligible words do not bypass prerequisites',()=>{
 const {context,actions,click}=sandbox();
 context.V5.collections.push({id:99,name:'Empty'});
 click('learn','99');click('practice','99');click('exam','99');
 assert.deepEqual(actions.nav,[]);
 const html=context.libraryPage();
 assert.match(html,/data-unit="99" disabled/);
});
test('Unit names are escaped; no extra network calls or database mutations',()=>{
 const {context}=sandbox();
 context.V5.collections[0].name='<img src=x onerror=alert(1)>';
 const html=context.libraryPage();
 assert.doesNotMatch(html,/<img src=x/);
 assert.match(html,/&lt;img src=x/);
 const src=read('src/wordora-v78.js');
 assert.doesNotMatch(src,/\bfetch\s*\(|\.rpc\s*\(|\.upsert\s*\(|\.insert\s*\(|\.update\s*\(/);
 new Function(src);
});
test('7.8 is included in PWA and preview build',()=>{
 const html=read('src/index.html'),sw=read('src/service-worker.js');
 assert.match(html,/wordora-v78\.js/);assert.match(html,/wordora-v78\.css/);
 assert.match(sw,/wordora-v78\.js/);assert.match(sw,/wordora-v78\.css/);
 assert.match(sw,/wordora-pwa-7\.8\.0/);
 assert.equal(JSON.parse(read('package.json')).version,'7.8.0');
});

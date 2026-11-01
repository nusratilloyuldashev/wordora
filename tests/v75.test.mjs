import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

function sandbox(extra={}){
 const listeners={};
 const words=[{id:1,en:'hello'},{id:2,en:'fine'},{id:3,en:'fast'},{id:4,en:'light'}];
 const memory={
  1:{stage:'mastered',next_review_on:'2026-11-01'},
  2:{stage:'learning',next_review_on:'2026-11-02'},
  4:{stage:'mastered',next_review_on:'2026-10-30'}
 };
 const collection={id:17,name:'Essential 1 — Unit 1'};
 const context={
  window:{},
  document:{addEventListener:(kind,cb)=>{listeners[kind]=cb}},
  state:{user:{id:'a'},words,libraryPage:4,libraryStage:'review',libraryTopic:'food',
   libraryType:'verb',librarySource:'mine',search:'old'},
  V4:{ready:true,memory,reviewOnly:false,practiceDate:'all'},
  V5:{ready:true,collections:[collection],libraryCollection:'all',
   itemIndex:{byCollection:new Map([['17',new Set(['1','2','3'])]])},
   items:[]},
  dashboardPage:()=>'<main><div class="v4-stat-strip">Old cards</div></main>',
  localISODate:()=> '2026-11-01',
  esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
   .replaceAll('>','&gt;').replaceAll('"','&quot;'),
  v4Navigate:()=>{},startPractice:()=>{},
  ...extra
 };
 vm.createContext(context);
 vm.runInContext(read('src/wordora-v75.js'),context,{timeout:2000});
 return {context,listeners,words,memory};
}

test('7-day planning handles overdue dates, upcoming dates, and month rollover',()=>{
 const {context}=sandbox();
 const f=context.window.WordoraV75.v75Forecast;
 const words=[{id:1},{id:2},{id:3},{id:4},{id:5},{id:6}];
 const m={
  1:{next_review_on:'2026-10-30'},
  2:{next_review_on:'2026-11-01'},
  3:{next_review_on:'2026-11-02'},
  4:{next_review_on:'2026-11-05'},
  5:{next_review_on:'2026-12-01'},
  6:{next_review_on:null}
 };
 const report=f(words,m,'2026-11-01');
 assert.deepEqual(Array.from(report.buckets),[2,1,0,0,1,0,0]);
 assert.equal(report.overdue,1);
 assert.equal(report.unscheduled,1);
 assert.equal(report.weekTotal,4);
 assert.equal(context.window.WordoraV75.v75Days('2026-12-30',3),'2027-01-02');
});

test('Unit progress shows only actual 90%-test mastered state, not generic repetitions',()=>{
 const {context,words,memory}=sandbox();
 const summarize=context.window.WordoraV75.v75Units;
 const units=summarize(words,memory,[{id:17,name:'Book 1'}],
  {byCollection:new Map([['17',new Set(['1','2','3'])]])},[], '2026-11-01');
 assert.equal(units.length,1);
 assert.deepEqual(
  [units[0].total,units[0].mastered,units[0].learning,units[0].percent,units[0].due],
  [3,1,1,33,1]
 );
});

test('Unit progress also works with unindexed items; unknown words are not counted',()=>{
 const {context,words,memory}=sandbox();
 const unit=context.window.WordoraV75.v75Units(words,memory,
  [{id:77,name:'My Unit'}],null,
  [{collection_id:77,word_id:4},{collection_id:77,word_id:999}],'2026-11-01')[0];
 assert.equal(unit.total,1);
 assert.equal(unit.mastered,1);
 assert.equal(unit.percent,100);
});

test('dashboard adds calendar and unit cards without removing existing dashboard stats',()=>{
 const {context}=sandbox();
 const html=context.dashboardPage();
 assert.match(html,/Keyingi 7 kun/);
 assert.match(html,/O‘rganish xaritasi/);
 assert.match(html,/data-v75="open-unit"/);
 assert.match(html,/data-v75="review-due"/);
 assert.match(html,/v4-stat-strip/);
 assert.match(html,/Essential 1 — Unit 1/);
});

test('open Unit action resets stale filters before navigating',()=>{
 let navigated='';
 const {context,listeners}=sandbox({v4Navigate:page=>{navigated=page}});
 const button={dataset:{v75:'open-unit',id:'17'}};
 listeners.click({
  target:{closest:()=>button},
  preventDefault(){},stopImmediatePropagation(){}
 });
 assert.equal(navigated,'library');
 assert.equal(context.V5.libraryCollection,'17');
 assert.equal(context.state.libraryPage,0);
 assert.equal(context.state.libraryStage,'all');
 assert.equal(context.state.search,'');
 assert.equal(context.state.librarySource,'all');
});

test('no user-specific data is sent to third parties by 7.5 dashboard',()=>{
 const source=read('src/wordora-v75.js');
 assert.doesNotMatch(source,/fetch\s*\(|\.rpc\s*\(|\.insert\s*\(|\.upsert\s*\(/);
 const oldThreshold=read('src/wordora-v4.js');
 assert.match(oldThreshold,/threshold: 90/);
});

test('Wordora 7.5 PWA includes new dashboard scripts and styles',()=>{
 const index=read('src/index.html');
 const worker=read('src/service-worker.js');
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'7.8.0');
 assert.match(index,/wordora-v75\.js/);
 assert.match(index,/wordora-v75\.css/);
 assert.match(worker,/wordora-v75\.js/);
 assert.match(worker,/wordora-v75\.css/);
 assert.match(worker,/wordora-pwa-7\.8\.0/);
 new Function(read('src/wordora-v75.js'));
});

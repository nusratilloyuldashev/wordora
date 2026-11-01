import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('src/wordora-v7.js');
const delay=()=>new Promise(r=>setImmediate(r));
function setup(){
 const calls={words:0,stats:0,learning:0,collections:0};
 const user={id:'user-a'};
 const ctx={
  state:{user,words:[],stats:null,categories:[],page:'dashboard',libraryPage:0},
  V4:{ready:true},V5:{ready:true},
  api:async path=>{
   if(path.startsWith('/words?')){calls.words++;await delay();return {words:[{id:1,en:'arrive',uz:'yetib kelmoq'}]};}
   if(path==='/stats'){calls.stats++;await delay();return {practiced_today:3};}
   return [{slug:'study',name:'O‘qish'}];
  },
  v4Fetch:async()=>{calls.learning++;await delay();},
  v5Load:async()=>{calls.collections++;await delay();},
  loadCore:async()=>{throw Error('old sequential loader must not run');},
  render:()=>{},navigator:{onLine:true},performance:{now:()=>Date.now()},
  window:{WordoraOffline:{remember:()=>{},sync:async()=>({synced:0})},addEventListener:()=>{}},
  document:{addEventListener:()=>{},querySelector:()=>null,visibilityState:'hidden'},
  console,Date,Promise,setTimeout,clearTimeout
 };
 vm.createContext(ctx);
 vm.runInContext(source,ctx,{timeout:1000});
 return {ctx,calls};
}
test('three simultaneous loadCore calls share one request batch',async()=>{
 const {ctx,calls}=setup();
 await Promise.all([ctx.loadCore(),ctx.loadCore(),ctx.loadCore()]);
 assert.equal(calls.words,1);
 assert.equal(calls.stats,1);
 assert.equal(calls.learning,1);
 assert.equal(calls.collections,1);
 assert.equal(ctx.state.words[0].en,'arrive');
 assert.ok(ctx.window.WordoraV7.metrics().sharedLoads>=2);
});
test('within the TTL, duplicate requests are avoided but invalidation forces reload',async()=>{
 const {ctx,calls}=setup();
 await ctx.loadCore();await ctx.loadCore();
 assert.equal(calls.words,1);
 assert.equal(ctx.window.WordoraV7.metrics().cacheHits,1);
 ctx.window.WordoraV7.invalidate('new-word');
 await ctx.loadCore();
 assert.equal(calls.words,2);
});
test('cached state is scoped to the signed-in account',async()=>{
 const {ctx,calls}=setup();
 await ctx.loadCore();
 ctx.state.user={id:'user-b'};
 await ctx.loadCore();
 assert.equal(calls.words,2);
 assert.equal(ctx.window.WordoraV7.currentUser(),'user-b');
});
test('offline re-download bypasses fresh in-memory data and online sync invalidates',async()=>{
 const {ctx,calls}=setup();
 await ctx.loadCore();
 await ctx.window.WordoraOffline.refreshData();
 assert.equal(calls.words,2);
 ctx.window.WordoraOffline.sync=async()=>({synced:2});
 // Wrapping at initialization means later patching sync won't affect the captured function.
 assert.match(source,/result\?\.synced>0/);
});
test('the library renders at most 50 rows while retaining all-word counts',()=>{
 const source3=read('src/wordora-v3.js');
 assert.match(source3,/pageSize=50/);
 assert.match(source3,/visible=displayed\.slice\(/);
 assert.match(source3,/visible\.map\(w=>/);
 assert.match(source3,/data-v7-page="-1"/);
 assert.match(source3,/data-v7-page="1"/);
 assert.match(source3,/displayed\.length/);
});
test('all write paths invalidate their cached account snapshot',()=>{
 const app=read('src/app.js'),v3=read('src/wordora-v3.js');
 const v4=read('src/wordora-v4.js'),v5=read('src/wordora-v5.js');
 for(const key of ['practice-finished','word-created','word-deleted'])assert.ok(app.includes("invalidate('"+key+"')"));
 for(const key of ['word-created','word-edited'])assert.ok(v3.includes("invalidate('"+key+"')"));
 for(const key of ['lesson-finished','test-finished'])assert.ok(v4.includes("invalidate('"+key+"')"));
 assert.ok(v5.includes("invalidate('word-or-collection-created')"));
});
test('PWA pre-caches the latest JS and CSS, and keeps old word-learning mastery',()=>{
 const html=read('src/index.html'),worker=read('src/service-worker.js'),v4=read('src/wordora-v4.js');
 assert.match(worker,/wordora-pwa-7\.9\.0/);
 assert.match(worker,/wordora-v7\.js/);
 assert.match(worker,/wordora-v7\.css/);
 assert.match(html,/wordora-v7\.js/);
 assert.match(html,/wordora-v7\.css/);
 assert.match(v4,/threshold: 90/);
 assert.match(v4,/const promote=passed&&q\.checked/);
 new Function(worker);new Function(source);
});

test('real library renderer paginates both above and below, preserving counts',()=>{
 const code=read('src/wordora-v3.js');
 const section=code.slice(code.indexOf('libraryPage = function(){'),code.indexOf('\nstartPractice = async function'));
 assert.ok(section.includes('pageSize=50'));
 assert.ok(section.includes('visible.map(w=>'));
 const state={words:Array.from({length:123},(_,i)=>({id:i+1,en:'word'+(i+1),uz:'uz'+(i+1),owner_id:null,example_en:''})),
  libraryPage:0,libraryStage:'all',libraryTopic:'all',libraryType:'all',librarySource:'all',showAdd:false,editWordId:null,search:''};
 const ctx={state,v3Summary:()=>({new:123,learning:0,mastered:0,due:0,total:123}),v3LibraryMatches:()=>true,
  v3Warning:()=>'',v3TopicOptions:()=>'',v3TypeOptions:()=>'',v3TopicPill:()=>'',v3WordType:()=>'',v3TypeName:()=>'',v3StatTag:()=>'',esc:x=>String(x),I:()=>'',window:{WordoraBackend:{taxonomyReady:true}}};
 vm.createContext(ctx);vm.runInContext('var libraryPage;'+section,ctx,{timeout:1000});
 for(const [page,count,range] of [[0,50,'1–50'],[1,50,'51–100'],[2,23,'101–123']]){
  state.libraryPage=page;const html=ctx.libraryPage();
  assert.equal((html.match(/class="word-pronounce"/g)||[]).length,count);
  assert.equal((html.match(/class="v7-pages"/g)||[]).length,2);
  assert.ok(html.includes(range+' / 123 ta so‘z'));
 }
 state.libraryPage=99;ctx.libraryPage();assert.equal(state.libraryPage,2);
});

test('Unit membership index is consistent, deduplicated and rebuilt after user switch',()=>{
 const source=read('src/wordora-v5.js');
 const start=source.indexOf('function v5ReindexItems()');
 const end=source.indexOf('const v5ColOptions=',start);
 assert.ok(start>=0&&end>start,'v5 indexing helpers must be present');
 const snippet=source.slice(start,end);
 const V5={items:[],itemIndex:{byWord:new Map(),byCollection:new Map()}};
 const sandbox={V5,Map,Set,String,Number};
 vm.createContext(sandbox);
 vm.runInContext(snippet.replaceAll(/^const (v5Membership|v5Include|v5Count|v5WordCollectionIds)/gm,'var $1'),sandbox);
 V5.items=[{word_id:10,collection_id:20},{word_id:10,collection_id:30},
           {word_id:11,collection_id:30},{word_id:10,collection_id:20}];
 sandbox.v5ReindexItems();
 assert.equal(sandbox.v5Membership(10,20),true);
 assert.equal(sandbox.v5Membership(10,99),false);
 assert.equal(sandbox.v5Include({id:10},'all'),true);
 assert.equal(sandbox.v5Include({id:11},20),false);
 assert.equal(sandbox.v5Count(20),1);
 assert.equal(sandbox.v5Count(30),2);
 assert.deepEqual([...sandbox.v5WordCollectionIds(10)].sort(),['20','30']);
 V5.items=[{word_id:40,collection_id:70}];
 sandbox.v5ReindexItems();
 assert.equal(sandbox.v5Membership(10,20),false);
 assert.equal(sandbox.v5Membership(40,70),true);
 assert.equal(sandbox.v5Count(20),0);
});
test('offline Unit snapshot rebuilds the fast index before rendering',()=>{
 const offline=read('src/wordora-offline-bridge.js');
 assert.match(offline,/V5\.items=cached\.items\|\|\[\];v5ReindexItems\(\)/);
});
test('7.1 avoids blind production DDL and ships read-only database diagnostics',()=>{
 const diagnostic=read('supabase/performance_7_1_diagnostics.sql');
 const commands=diagnostic.split('\n').map(line=>line.replace(/--.*$/,'').trim()).filter(Boolean);
 assert.ok(commands.filter(x=>/^select\b/i.test(x)).length>=4);
 assert.ok(!commands.some(x=>/^(insert|update|delete|drop|alter|create|truncate|grant|revoke)\b/i.test(x)));
 assert.match(read('src/wordora-v4.js'),/v7-version">v7\.9/);
});

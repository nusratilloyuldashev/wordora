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
 assert.match(worker,/wordora-pwa-7\.0\.0/);
 assert.match(worker,/wordora-v7\.js/);
 assert.match(worker,/wordora-v7\.css/);
 assert.match(html,/wordora-v7\.js/);
 assert.match(html,/wordora-v7\.css/);
 assert.match(v4,/threshold: 90/);
 assert.match(v4,/const promote=passed&&q\.checked/);
 new Function(worker);new Function(source);
});

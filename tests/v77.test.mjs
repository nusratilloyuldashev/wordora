import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function session(testIndexedDB={}){
 let complete;
 const originalApi=()=>new Promise(resolve=>{complete=resolve;});
 const storage=new Map(),backend={api:originalApi,client:{auth:{getUser:async()=>({data:{user:{id:'a'}}})}}};
 const w={WordoraBackend:backend,crypto:{randomUUID:()=> '12345678-1234-4234-8234-123456789abc'},indexedDB:testIndexedDB};
 const ctx={window:w,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  navigator:{onLine:true},indexedDB:testIndexedDB,document:{dispatchEvent(){}},CustomEvent:function(){},console,Date,Promise,setTimeout,clearTimeout,self:{crypto:w.crypto}};
 vm.createContext(ctx);
 vm.runInContext(read('src/wordora-offline.js'),ctx);
 return {ctx,w,backend,get complete(){return complete;}};
}
test('in-flight Supabase snapshots must never cross the user-account boundary',async()=>{
 const s=session(),offline=s.w.WordoraOffline;
 offline.remember({id:'a',email:'a@example.com'});
 const request=s.backend.api('/stats');
 offline.remember({id:'b',email:'b@example.com'});
 s.complete({secret:'account-a'});
 await assert.rejects(request,/Hisob almashdi/);
 assert.equal(offline.account(),'b');
});
test('stale owner cannot store or read another account offline snapshot',async()=>{
 const s=session(),offline=s.w.WordoraOffline;
 offline.remember({id:'a',email:'a@example.com'});
 offline.remember({id:'b',email:'b@example.com'});
 assert.equal(await offline.store('words',{secret:'a'},'a'),false);
 assert.equal(await offline.read('words','a'),null);
});
test('read-only SQL audit covers all user-owned tables and sensitive RPC grants',()=>{
 const sql=read('supabase/security_audit_7_7.sql');
 const noComments=sql.replace(/--[^\n]*/g,'');
 assert.doesNotMatch(noComments,/\b(create|alter|drop|truncate|insert|update|delete|grant|revoke|execute|call|do)\s+/i);
 for(const name of ['words','progress','reviews','word_learning','word_collections','word_collection_items',
 'wordora_review_requests','wordora_exam_requests','wordora_review_v2','wordora_save_exam_v74']){
  assert.ok(sql.includes(name),'missing SQL audit check: '+name);
 }
 assert.match(sql,/has_function_privilege/);
 assert.match(sql,/pg_policies/);
});
test('privacy delete is atomic and checks pending results before snapshot removal',()=>{
 const src=read('src/wordora-offline.js');
 assert.match(src,/db\.transaction\(\['outbox','snapshots'\],'readwrite'\)/);
 assert.match(src,/item\.value\?\.userId===userId/);
 assert.match(src,/row\.key\.startsWith\(userId\+':'\)/);
 assert.match(src,/clearOfflineCopies/);
 const ui=read('src/wordora-offline-bridge.js');
 assert.match(ui,/data-offline="clear"/);
 assert.match(ui,/status\.pending/);
 assert.match(ui,/window\.confirm/);
 assert.match(ui,/wordora-lesson-v4-/);
});
test('stale learning and Unit fetches are guarded before writing in-memory/cache state',()=>{
 const v4=read('src/wordora-v4.js'),v5=read('src/wordora-v5.js'),b=read('src/wordora-offline-bridge.js');
 assert.match(v4,/state\.user\?\.id!==loadingUser\|\|V4\.activeAccount!==loadingUser/);
 assert.match(v5,/state\.user\?\.id!==loadingUser\|\|V5\.account!==loadingUser/);
 assert.match(b,/OF\.read\('learning',loadingUser\)/);
 assert.match(b,/OF\.read\('collections',loadingUser\)/);
});
test('7.7 release retains 90 percent mastery and CSP baseline',()=>{
 const cfg=JSON.parse(read('package.json')),sw=read('src/service-worker.js'),v4=read('src/wordora-v4.js'),headers=read('src/_headers');
 assert.equal(cfg.version,'7.8.0');
 assert.match(sw,/wordora-pwa-7\.8\.0/);
 assert.match(v4,/threshold: 90/);
 assert.match(headers,/object-src 'none'/);
 assert.match(headers,/base-uri 'self'/);
 assert.match(headers,/form-action 'self'/);
 assert.match(read('src/wordora-v7.js'),/version:'7\.8'/);
});

function fakeDB(stores) {
 const db={
  objectStoreNames:{contains:()=>true},
  close(){},
  transaction(names,mode){
   const tx={
    error:null,aborted:false,oncomplete:null,onabort:null,
    abort(){this.aborted=true;queueMicrotask(()=>this.onabort?.());},
    objectStore(name){
     return {openCursor(){
      const request={error:null};
      const records=[...stores[name].entries()];
      let index=0;
      const next=()=>{
       if(tx.aborted)return;
       const entry=records[index];
       request.result=entry?{
        key:entry[0],value:entry[1],
        delete(){stores[name].delete(entry[0]);},
        continue(){index++;queueMicrotask(next);}
       }:null;
       request.onsuccess?.();
       if(!entry&&name==='snapshots')queueMicrotask(()=>tx.oncomplete?.());
      };
      queueMicrotask(next);
      return request;
     }};
    }
   };
   return tx;
  }
 };
 return {open(){
  const req={result:null};
  queueMicrotask(()=>{req.result=db;req.onsuccess?.();});
  return req;
 }};
}
test('atomic privacy cleanup refuses deletion when current user has unsent work',async()=>{
 const stores={outbox:new Map([['review-a',{id:'review-a',userId:'a'}]]),
  snapshots:new Map([['a:words',{key:'a:words'}],['b:words',{key:'b:words'}]])};
 const s=session(fakeDB(stores));
 s.w.WordoraOffline.remember({id:'a',email:'a@example.com'});
 await assert.rejects(s.w.WordoraOffline.clearOfflineCopies(),/Avval yuborilmagan/);
 assert.equal(stores.snapshots.size,2);
 assert.equal(stores.outbox.size,1);
});
test('atomic privacy cleanup removes only this user snapshots, not another account',async()=>{
 const stores={outbox:new Map([['review-b',{id:'review-b',userId:'b'}]]),
  snapshots:new Map([['a:words',{key:'a:words'}],['a:learning',{key:'a:learning'}],['b:words',{key:'b:words'}]])};
 const s=session(fakeDB(stores));
 s.w.WordoraOffline.remember({id:'a',email:'a@example.com'});
 const result=await s.w.WordoraOffline.clearOfflineCopies();
 assert.equal(result.cleared,2);
 assert.equal(result.userId,'a');
 assert.deepEqual([...stores.snapshots.keys()],['b:words']);
 assert.equal(stores.outbox.size,1);
});
test('late word_learning response cannot repopulate another user in memory',async()=>{
 const source=read('src/wordora-v4.js');
 const code=source.slice(source.indexOf('async function v4Fetch(){'),source.indexOf('\nconst v4PreviousLoad='));
 let resolve,changed=0;
 const request=new Promise(r=>{resolve=r;});
 const state={user:{id:'a'}};
 const V4={activeAccount:'a',ready:false,lesson:null,memory:{}};
 const client={from:()=>({select:()=>({eq:()=>({order:()=>({range:()=>request})})})})};
 const ctx={state,V4,client,v4Set:()=>changed++};
 vm.createContext(ctx);
 vm.runInContext(code,ctx);
 const job=ctx.v4Fetch();
 state.user={id:'b'};
 resolve({data:[{word_id:1,stage:'mastered'}],error:null});
 await job;
 assert.equal(changed,0);
 assert.equal(V4.ready,false);
});

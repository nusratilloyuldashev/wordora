import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

function localBrowser(rpc,online=true){
 const stores={snapshots:new Map(),outbox:new Map()};
 const db={
  objectStoreNames:{contains:()=>true},close:()=>{},
  transaction(name){
   const tx={oncomplete:null,onerror:null};
   tx.objectStore=()=>Object.fromEntries(['put','get','delete','getAll'].map(method=>[
    method,arg=>{
     const req={onsuccess:null,onerror:null,result:undefined};
     queueMicrotask(()=>{
      try{
       const store=stores[name];
       if(method==='put')store.set(arg.id??arg.key,structuredClone(arg));
       if(method==='get')req.result=structuredClone(store.get(arg));
       if(method==='delete')store.delete(arg);
       if(method==='getAll')req.result=structuredClone([...store.values()]);
       req.onsuccess?.();
       queueMicrotask(()=>tx.oncomplete?.());
      }catch(err){req.error=err;req.onerror?.();tx.onerror?.();}
     });
     return req;
    }
   ]));
   return tx;
  }
 };
 const indexedDB={open(){
  const request={result:db,onsuccess:null,onupgradeneeded:null};
  queueMicrotask(()=>request.onsuccess?.());
  return request;
 }};
 const storage=new Map();
 const backend={
  client:{
   auth:{getUser:async()=>({data:{user:{id:'user-1'}},error:null})},
   rpc,
   from(){return {upsert:async()=>({error:null})}}
  },api:async()=>({ok:true})
 };
 const window={WordoraBackend:backend,indexedDB,crypto:webcrypto};
 const context={
  window,self:window,indexedDB,navigator:{onLine:online},
  document:{dispatchEvent(){}},CustomEvent:class{constructor(name){this.type=name}},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),
    removeItem:k=>storage.delete(k)},console,Promise,Date,Math,Error,JSON,Uint8Array,
  Array,Map,Set
 };
 vm.createContext(context);
 vm.runInContext(read('src/wordora-offline.js'),context,{timeout:2000});
 window.WordoraOffline.remember({id:'user-1',email:'test@example.invalid'});
 return {offline:window.WordoraOffline,context,stores};
}
test('7.4 SQL saves entire exam atomically and checks old tested_at before any write',()=>{
 const sql=read('supabase/upgrade_7_4.sql');
 assert.match(sql,/primary key \(user_id,request_id\)/);
 assert.match(sql,/on conflict \(user_id,request_id\) do nothing/);
 assert.match(sql,/for update/);
 assert.match(sql,/is distinct from v_record\.expected_tested_at/);
 assert.ok(sql.indexOf('if cardinality(v_conflicts)>0')<sql.indexOf('update public.word_learning set'));
 assert.match(sql,/grant execute on function public\.wordora_save_exam_v74/);
 assert.doesNotMatch(sql,/^\s*(drop table|truncate|delete from public\.word_learning)\b/im);
});
test('new exam stores SERVER observed version, not a local pending test timestamp',()=>{
 const fake={
  V4:{threshold:90,memory:{
   '12':{tested_at:'2026-10-10T10:00:00.000Z'},
   '13':{tested_at:'2026-10-31T12:00:00.000Z',server_tested_at:'2026-10-08T09:00:00.000Z'}
  }},
  v4Today:()=> '2026-11-01',v4DayPlus:()=> '2026-11-02',
  v4ExamResults:()=>'',v4SaveExam:async()=>{},
  window:{WordoraOffline:{},WordoraV7:{}},render:()=>{},toast:()=>{},
  state:{}
 };
 vm.createContext(fake);vm.runInContext(read('src/wordora-v74.js'),fake,{timeout:1000});
 const rows=fake.window.WordoraExamV74.makeRows({
  finished:true,correct:2,
  items:[{id:12,checked:true},{id:13,checked:true}]
 });
 assert.equal(rows.length,2);
 assert.equal(rows[0].expected_tested_at,'2026-10-10T10:00:00.000Z');
 assert.equal(rows[1].expected_tested_at,'2026-10-08T09:00:00.000Z');
 assert.equal(rows[0].stage,'mastered');
 assert.equal(rows[0].last_test_score,100);
});
test('server reports cross-device conflict: queued exam remains durable and archived on approval',async()=>{
 const {offline}=localBrowser(async name=>{
  if(name==='wordora_save_exam_v74')
   return {data:{ok:false,conflict:true,word_ids:[12]},error:null};
  return {data:{ok:true},error:null};
 });
 await offline.enqueue('exam-v74',{rows:[{
  word_id:12,stage:'mastered',last_test_score:95,
  tested_at:'2026-11-01T00:00:00Z',expected_tested_at:null
 }]});
 const result=await offline.sync();
 assert.equal(result.synced,0);
 assert.equal(result.conflicts,1);
 assert.equal((await offline.pending()).length,1);
 assert.equal((await offline.syncStatus()).conflicts,1);
 const discarded=await offline.resolveConflicts();
 assert.equal(discarded,1);
 assert.equal((await offline.pending()).length,0);
 const archive=await offline.read('exam-conflict-archive');
 assert.equal(archive.length,1);
 assert.equal(archive[0].rows[0].word_id,12);
});
test('successful exam sync records the last successful sync time and clears queue',async()=>{
 const {offline}=localBrowser(async name=>{
  if(name==='wordora_save_exam_v74')
   return {data:{ok:true,conflict:false,saved:1,deduplicated:false},error:null};
  return {data:{ok:true},error:null};
 });
 await offline.enqueue('exam-v74',{rows:[{
  word_id:12,stage:'mastered',last_test_score:95,
  tested_at:'2026-11-01T00:00:00Z',expected_tested_at:null
 }]});
 const summary=await offline.sync();
 assert.equal(summary.synced,1);
 const status=await offline.syncStatus();
 assert.equal(status.pending,0);
 assert.equal(status.conflicts,0);
 assert.ok(!Number.isNaN(Date.parse(status.lastSyncedAt)));
});
test('client exposes account-scoped diagnostics and caches 7.4 exam code for offline PWA',()=>{
 const index=read('src/index.html'),worker=read('src/service-worker.js');
 const diagnostics=read('src/wordora-v7.js');
 assert.match(index,/wordora-v74\.js/);
 assert.match(worker,/wordora-pwa-7\.4\.0/);
 assert.match(worker,/wordora-v74\.js/);
 assert.match(diagnostics,/conflictedExams/);
 assert.match(diagnostics,/lastSyncedAt/);
 assert.match(read('src/wordora-offline-bridge.js'),/data-offline="resolve"/);
});

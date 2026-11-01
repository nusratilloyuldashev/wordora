import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

function browser({online=true,handler=async()=>({ok:true})}={}){
 const maps={snapshots:new Map(),outbox:new Map()};
 const db={
  objectStoreNames:{contains:()=>true},
  close:()=>{},
  transaction(storeName){
   const tx={oncomplete:null,onerror:null};
   tx.objectStore=()=>Object.fromEntries(['put','get','delete','getAll'].map(method=>[method,arg=>{
    const req={onsuccess:null,onerror:null,result:undefined};
    queueMicrotask(()=>{
     try{
      const map=maps[storeName];
      if(method==='put')map.set(arg.id||arg.key,structuredClone(arg));
      if(method==='delete')map.delete(arg);
      if(method==='get')req.result=structuredClone(map.get(arg));
      if(method==='getAll')req.result=structuredClone([...map.values()]);
      req.onsuccess?.();
      queueMicrotask(()=>tx.oncomplete?.());
     }catch(err){req.error=err;req.onerror?.();tx.onerror?.();}
    });
    return req;
   }]));
   return tx;
  }
 };
 const indexedDB={open(){
  const req={result:db,onupgradeneeded:null,onsuccess:null,onerror:null};
  queueMicrotask(()=>req.onsuccess?.());
  return req;
 }};
 const storage=new Map();
 const backend={api:handler,client:{auth:{getUser:async()=>({
  data:{user:{id:'user-test',email:'local@example.invalid'}},error:null
 })}}};
 const window={WordoraBackend:backend,indexedDB,crypto:webcrypto};
 const context={
  window,self:window,indexedDB,navigator:{onLine:online},document:{dispatchEvent:()=>{}},
  CustomEvent:class{constructor(type){this.type=type}},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,v)=>storage.set(key,v),removeItem:key=>storage.delete(key)},
  console,Promise,Date,Math,Error,JSON,Uint8Array,Set,Map,Array
 };
 vm.createContext(context);
 vm.runInContext(file('src/wordora-offline.js'),context,{timeout:1000});
 window.WordoraOffline.remember({id:'user-test',email:'local@example.invalid'});
 return {api:backend.api,offline:window.WordoraOffline,maps,context};
}
test('write-ahead review survives a lost acknowledgement and reuses the SAME UUID',async()=>{
 const seen=new Set(),sent=[];
 let first=true;
 const {api,offline}=browser({handler:async(path,options)=>{
  const p=JSON.parse(options.body);sent.push(p);
  if(!p.request_id||!/^[a-f0-9]{8}-/.test(p.request_id))throw Error('UUID missing');
  seen.add(p.request_id);
  if(first){first=false;throw Error('Failed to fetch');}
  return {ok:true,deduplicated:true};
 }});
 const firstReply=await api('/reviews',{method:'POST',body:JSON.stringify({
  word_id:7,mode:'choice',quality:5
 })});
 assert.equal(firstReply.queued,true);
 const queued=await offline.pending();
 assert.equal(queued.length,1);
 assert.equal(queued[0].id,queued[0].payload.request_id);
 const sync=await offline.sync();
 assert.equal(sync.synced,1);
 assert.equal((await offline.pending()).length,0);
 assert.equal(sent.length,2);
 assert.equal(sent[0].request_id,sent[1].request_id);
 assert.equal(seen.size,1);
});
test('confirmed online review is removed from IndexedDB outbox',async()=>{
 const {api,offline}=browser();
 const answer=await api('/reviews',{method:'POST',body:JSON.stringify({
  word_id:10,mode:'listen',quality:4
 })});
 assert.equal(answer.ok,true);
 assert.equal((await offline.pending()).length,0);
});
test('offline reviews remain per-account with stable request identifiers',async()=>{
 const {api,offline,context}=browser({online:false});
 const out=await api('/reviews',{method:'POST',body:JSON.stringify({
  word_id:11,mode:'cards',quality:5
 })});
 assert.equal(out.offline,true);
 assert.equal((await offline.pending()).length,1);
 const first=(await offline.pending())[0];
 assert.ok(first.payload.request_id);
 offline.remember({id:'user-other',email:'other@example.invalid'});
 assert.equal((await offline.pending()).length,0);
 offline.remember({id:'user-test',email:'local@example.invalid'});
 assert.equal((await offline.pending())[0].payload.request_id,first.payload.request_id);
 context.navigator.onLine=true;
});
test('database upgrade contains unique per-user request key and locked-down RPC',()=>{
 const sql=file('supabase/upgrade_7_3.sql');
 assert.match(sql,/primary key \(user_id,request_id\)/);
 assert.match(sql,/on conflict \(user_id,request_id\) do nothing/);
 assert.match(sql,/public\.wordora_review\(p_word_id,p_mode,p_quality\)/);
 assert.match(sql,/v_old\.word_id<>p_word_id/);
 assert.match(sql,/revoke all on function public\.wordora_review_v2/);
 assert.match(sql,/grant execute on function public\.wordora_review_v2/);
 assert.doesNotMatch(sql,/^\s*(drop table|truncate|delete from public\.reviews|update public\.progress)\b/im);
});
test('v7.3 idempotent API falls back ONLY when the new RPC is missing',()=>{
 const api=file('src/supabase-api.js');
 assert.match(api,/client\.rpc\('wordora_review_v2'/);
 assert.match(api,/result\.error\.code!=='PGRST202'/);
 assert.match(api,/reviewProtocol='idempotent-v2'/);
 assert.match(api,/reviewProtocol='legacy-migration-required'/);
 assert.match(file('src/service-worker.js'),/wordora-pwa-7\.7\.0/);
});

'use strict';
/* Wordora 5.4 — offline snapshots + per-account sync queue. No auth tokens stored here. */
(function(){
 const DB='wordora-offline-v1', USER_KEY='wordora-offline-user-v1';
 const backend=window.WordoraBackend,originalApi=backend.api;
 let activeUser=null,networkFailed=false,syncing=false;
 const online=()=>navigator.onLine!==false;
 const isOffline=()=>!online()||networkFailed;
 const networkError=e=>!online()||/failed to fetch|networkerror|network request|fetch failed|network is offline|err_network|connection refused|load failed|aborterror|network connection|timeout/i.test(String(e?.message||e||''));
 // Every review is assigned one stable UUID BEFORE a network request is sent.
 function newRequestId(){
  const secure=window.crypto||self.crypto;
  if(secure?.randomUUID)return secure.randomUUID();
  if(!secure?.getRandomValues)throw Error('Brauzer xavfsiz UUID yaratishni qo‘llab-quvvatlamaydi.');
  const bytes=new Uint8Array(16);secure.getRandomValues(bytes);
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
 }
 const isUUID=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
 const openDB=()=>new Promise((resolve,reject)=>{
  if(!('indexedDB' in window))return reject(Error('IndexedDB mavjud emas.'));
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>{
   if(!r.result.objectStoreNames.contains('snapshots'))r.result.createObjectStore('snapshots',{keyPath:'key'});
   if(!r.result.objectStoreNames.contains('outbox'))r.result.createObjectStore('outbox',{keyPath:'id'});
  };
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>reject(r.error||Error('Offline xotira ochilmadi.'));
 });
 async function operation(store,method,value){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(store,['get','all'].includes(method)?'readonly':'readwrite');
   const st=tx.objectStore(store);
   const request=method==='get'?st.get(value):method==='put'?st.put(value):method==='delete'?st.delete(value):st.getAll();
   let result;
   request.onsuccess=()=>{result=request.result;};
   request.onerror=()=>reject(request.error);
   tx.oncomplete=()=>{db.close();resolve(result);};
   tx.onerror=()=>{db.close();reject(tx.error||Error('Offline xotiraga yozilmadi.'));};
  });
 }
 const account=()=>activeUser?.id||null;
 const key=name=>account()+':'+name;
 async function store(name,data,requestedUser=account()){
  if(!requestedUser||requestedUser!==account())return false;
  // Pin the owner BEFORE IndexedDB work. Never relabel an old account's response.
  await operation('snapshots','put',{key:requestedUser+':'+name,data,updatedAt:Date.now()});
  return requestedUser===account();
 }
 async function read(name,requestedUser=account()){
  if(!requestedUser||requestedUser!==account())return null;
  const row=await operation('snapshots','get',requestedUser+':'+name);
  return requestedUser===account()?row?.data??null:null;
 }
 async function pending(){
  const records=await operation('outbox','all');
  return records.filter(x=>x.userId===account()).sort((a,b)=>a.at-b.at);
 }
 async function enqueue(type,payload){
  if(!account())throw Error('Offline amal uchun avval hisobga kirilgan bo‘lishi kerak.');
  const id=newRequestId();
  const data=type==='review'?{...payload,request_id:id}:payload;
  const record={id,userId:account(),type,payload:data,at:Date.now()};
  await operation('outbox','put',record);
  notify();
  return record;
 }

 // Atomic account-only cleanup: pending operations and cached snapshots are
 // checked within ONE readwrite transaction to protect unsent answers from races.
 async function clearOfflineCopies(){
  const userId=account();
  if(!userId)throw Error('Avval hisobga kiring.');
  const db=await openDB();
  return new Promise((resolve,reject)=>{
   let count=0,rejection=null,settled=false,tx;
   const finish=(error)=>{
    if(settled)return;
    settled=true;db.close();
    if(error)reject(error);else resolve({cleared:count,userId});
   };
   try{tx=db.transaction(['outbox','snapshots'],'readwrite');}
   catch(err){finish(err);return;}
   tx.oncomplete=()=>finish(null);
   tx.onabort=()=>finish(rejection||tx.error||Error('Offline nusxalarni tozalab bo‘lmadi.'));
   tx.onerror=()=>{rejection=tx.error||Error('IndexedDB xatoligi.');};
   const waiting=tx.objectStore('outbox').openCursor();
   waiting.onerror=()=>{rejection=waiting.error||Error('Offline navbatni tekshirib bo‘lmadi.');tx.abort();};
   waiting.onsuccess=()=>{
    const item=waiting.result;
    if(item){
     if(item.value?.userId===userId){
      rejection=Error('Avval yuborilmagan offline natijalarni sinxronlang. Navbat saqlandi.');
      tx.abort();return;
     }
     item.continue();return;
    }
    const list=tx.objectStore('snapshots').openCursor();
    list.onerror=()=>{rejection=list.error||Error('Offline nusxalarni o‘qib bo‘lmadi.');tx.abort();};
    list.onsuccess=()=>{
     const row=list.result;
     if(!row)return;
     if(typeof row.key==='string'&&row.key.startsWith(userId+':')){
      row.delete();count++;
     }
     row.continue();
    };
   };
  });
 }
 function remember(user){
  if(!user?.id)return;
  activeUser={id:user.id,email:user.email||'',username:user.username||''};
  try{localStorage.setItem(USER_KEY,JSON.stringify(activeUser));}catch{}
 }
 function remembered(){
  try{
   const x=JSON.parse(localStorage.getItem(USER_KEY)||'null');
   if(!x?.id||!x?.email)return null;
   return {id:x.id,email:x.email,username:x.username||x.email.split('@')[0]};
  }catch{return null;}
 }
 function restore(){const user=remembered();if(user)remember(user);return user;}
 function forget(){
  activeUser=null;try{localStorage.removeItem(USER_KEY);}catch{}
  notify();
 }
 function notify(){document.dispatchEvent(new CustomEvent('wordora-offline-status'));}
 function noteFailure(e){if(networkError(e))networkFailed=true;notify();}
 async function sync(){
  if(syncing||!online()||!account())return {synced:0};
  syncing=true;let done=0,conflicts=0;
  try{
   const {data,error}=await backend.client.auth.getUser();
   if(error||!data?.user||data.user.id!==account())return {synced:0,needsLogin:true};
   // Verified network recovery also counts when the queue is empty.
   networkFailed=false;
   const syncingUser=data.user.id;
   for(const item of await pending()){
    if(account()!==syncingUser)break;
    if(item.userId!==data.user.id)break;
    if(item.conflict){conflicts++;continue;}
    try{
     let response;
     if(item.type==='review'){
      // Upgrade a previously queued pre-v7.3 review safely: persist the UUID
      // before sending, so even a tab crash or lost ACK cannot rotate it.
      if(!isUUID(item.payload?.request_id)){
       item.payload={...item.payload,request_id:newRequestId()};
       await operation('outbox','put',item);
      }
      response={data:await originalApi('/reviews',{
       method:'POST',body:JSON.stringify(item.payload)
      }),error:null};
     }else if(item.type==='learning-insert'){
      response=await backend.client.from('word_learning').upsert(item.payload,{onConflict:'user_id,word_id',ignoreDuplicates:true});
     }else if(item.type==='learning-update'){
      const {wordId,fields}=item.payload;
      response=await backend.client.from('word_learning').update(fields).eq('user_id',data.user.id).eq('word_id',wordId);
     }else if(item.type==='exam'||item.type==='exam-v74'){
      // Legacy offline exams had no observed server version. Safely require an
      // empty previous tested_at instead of silently replacing another device.
      if(item.type==='exam'){
       const oldId=item.id;
       const upgraded={...item,id:isUUID(oldId)?oldId:newRequestId(),
        type:'exam-v74',payload:{rows:item.payload.map(x=>({
         ...x,expected_tested_at:null
        }))}};
       await operation('outbox','put',upgraded);
       if(upgraded.id!==oldId)await operation('outbox','delete',oldId);
       Object.assign(item,upgraded);
      }
      response=await backend.client.rpc('wordora_save_exam_v74',{
       p_request_id:item.id,p_items:item.payload.rows
      });
      if(!response.error&&response.data?.conflict){
       item.conflict={wordIds:response.data.word_ids||[],at:new Date().toISOString()};
       await operation('outbox','put',item);
       conflicts++;notify();
       continue;
      }
      if(!response.error&&response.data?.ok!==true)
       throw Error('Test tasdiqlanmadi, natija navbatda qoldi.');
     }else throw Error('Noma’lum offline amal: '+item.type);
     if(response.error)throw response.error;
     await operation('outbox','delete',item.id);
     done++;
    }catch(e){
     if(networkError(e))noteFailure(e);
     await recordError(e.code==='PGRST202'?'exam-sql-upgrade-required':networkError(e)?'network':'sync-rejected');
     console.warn('Offline sync failed:',e);break;
    }
   }
   if(done){
    networkFailed=false;
    const meta=await read('sync-meta')||{};
    await store('sync-meta',{...meta,lastSyncedAt:new Date().toISOString(),lastErrorCode:null});
   }
   return {synced:done,conflicts,remaining:(await pending()).length};
  }finally{syncing=false;notify();}
 }
 async function prepare(){
  if(!online())throw Error('Oldindan yuklash uchun internet kerak.');
  const {data,error}=await backend.client.auth.getUser();
  if(error||data?.user?.id!==account())throw Error('Avval internet orqali hisobga kiring.');
  await bridge.refreshData();
  if(!('serviceWorker' in navigator))throw Error('Ushbu brauzer offline PWA xizmatini qo‘llab-quvvatlamaydi.');
  const reg=await navigator.serviceWorker.ready;
  if(!reg.active)throw Error('Offline xizmati hali ishga tushmagan.');
  const result=await new Promise((resolve,reject)=>{
   const channel=new MessageChannel();
   const timeout=setTimeout(()=>{channel.port1.close();reject(Error('Offline fayllarni yuklash javobi kelmadi.'));},15000);
   channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();resolve(e.data);};
   reg.active.postMessage({type:'PRECACHE'},[channel.port2]);
  });
  if(!result?.shellReady||!result?.cdnReady)throw Error('Sayt fayllari yoki Supabase kutubxonasi saqlanmadi. Internetni tekshirib, yana urinib ko‘ring.');
  await store('pwa-ready',{prepared:true,version:1});
  networkFailed=false;notify();
 }
 async function syncStatus(){
  const [items,meta]=await Promise.all([pending(),read('sync-meta')]);
  return {pending:items.length,conflicts:items.filter(x=>x.conflict).length,
   lastSyncedAt:meta?.lastSyncedAt||null,lastErrorCode:meta?.lastErrorCode||null};
 }
 async function recordError(code){
  try{
   const meta=await read('sync-meta')||{};
   await store('sync-meta',{...meta,lastErrorCode:String(code).slice(0,48)});
  }catch{}
 }
 async function resolveConflicts(){
  const items=(await pending()).filter(x=>x.type==='exam-v74'&&x.conflict);
  if(!items.length)return 0;
  // Archive before deleting. No conflicting result is discarded silently.
  const archive=await read('exam-conflict-archive')||[];
  await store('exam-conflict-archive',[...archive,...items.map(x=>({
   at:x.at,rows:x.payload.rows,conflict:x.conflict
  }))].slice(-30));
  for(const item of items)await operation('outbox','delete',item.id);
  notify();return items.length;
 }
 const bridge={remember,remembered,restore,forget,account,store,read,pending,enqueue,sync,syncStatus,resolveConflicts,prepare,clearOfflineCopies,
  isOffline,online,networkError,noteFailure,refreshData:async()=>{}};
 window.WordoraOffline=bridge;
 backend.api=async function(path,opts={}){
  const method=opts.method||'GET';
  const snapshot=path.startsWith('/words?')||path==='/words'&&method==='GET'?'words':path==='/stats'?'stats':null;
  const requestUser=snapshot?account():null;
  const assertAccount=()=>{
   if(snapshot&&(!requestUser||requestUser!==account()))
    throw Error('Hisob almashdi. Ma’lumotlarni yangi hisobda qayta yuklang.');
  };
  if(method==='POST'&&path==='/reviews'){
   // Write-ahead outbox: an uncertain server acknowledgement cannot lose the
   // answer. Replays use the SAME request_id and become exactly-once after
   // Supabase upgrade_7_3.sql is installed.
   const record=await enqueue('review',JSON.parse(opts.body||'{}'));
   if(!online())return {offline:true,queued:true};
   try{
    const value=await originalApi(path,{
     ...opts,body:JSON.stringify(record.payload)
    });
    await operation('outbox','delete',record.id);
    notify();
    networkFailed=false;
    return value;
   }catch(e){
    if(networkError(e)){noteFailure(e);return {offline:true,queued:true};}
    throw e; // Keep the pending item, never drop an unconfirmed result.
   }
  }
  if(method!=='GET'&&!online())throw Error('Bu amal internet talab qiladi. Offline rejimda yodlash, mashqlar va test ishlaydi.');
  if(snapshot&&!online()){
   assertAccount();
   const data=await read(snapshot,requestUser);
   assertAccount();
   if(data===null)throw Error('Offline so‘zlar yuklanmagan. Internetda bir marta tizimga kiring.');
   return data;
  }
  try{
   const data=await originalApi(path,opts);
   if(snapshot){
    assertAccount();
    await store(snapshot,data,requestUser).catch(console.warn);
    assertAccount();
    networkFailed=false;
   }
   return data;
  }catch(e){
   assertAccount();
   if(networkError(e)){
    noteFailure(e);
    if(snapshot){
     const data=await read(snapshot,requestUser);
     assertAccount();
     if(data!==null)return data;
    }
   }
   throw e;
  }
 };
})();

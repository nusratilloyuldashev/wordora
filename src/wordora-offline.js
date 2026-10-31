'use strict';
/* Wordora 5.4 — offline snapshots + per-account sync queue. No auth tokens stored here. */
(function(){
 const DB='wordora-offline-v1', USER_KEY='wordora-offline-user-v1';
 const backend=window.WordoraBackend,originalApi=backend.api;
 let activeUser=null,networkFailed=false,syncing=false;
 const online=()=>navigator.onLine!==false;
 const isOffline=()=>!online()||networkFailed;
 const networkError=e=>!online()||/failed to fetch|networkerror|network request|fetch failed|network is offline|err_network|connection refused|load failed|aborterror|network connection|timeout/i.test(String(e?.message||e||''));
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
 async function store(name,data){
  if(!account())return;
  await operation('snapshots','put',{key:key(name),data,updatedAt:Date.now()});
 }
 async function read(name){
  if(!account())return null;
  return (await operation('snapshots','get',key(name)))?.data??null;
 }
 async function pending(){
  const records=await operation('outbox','all');
  return records.filter(x=>x.userId===account()).sort((a,b)=>a.at-b.at);
 }
 async function enqueue(type,payload){
  if(!account())throw Error('Offline amal uchun avval hisobga kirilgan bo‘lishi kerak.');
  const id=(self.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const record={id,userId:account(),type,payload,at:Date.now()};
  await operation('outbox','put',record);
  notify();
  return record;
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
  syncing=true;let done=0;
  try{
   const {data,error}=await backend.client.auth.getUser();
   if(error||!data?.user||data.user.id!==account())return {synced:0,needsLogin:true};
   for(const item of await pending()){
    if(item.userId!==data.user.id)break;
    try{
     let response;
     if(item.type==='review'){
      response=await backend.client.rpc('wordora_review',{
       p_word_id:Number(item.payload.word_id),p_mode:item.payload.mode,p_quality:Number(item.payload.quality)});
     }else if(item.type==='learning-insert'){
      response=await backend.client.from('word_learning').upsert(item.payload,{onConflict:'user_id,word_id',ignoreDuplicates:true});
     }else if(item.type==='learning-update'){
      const {wordId,fields}=item.payload;
      response=await backend.client.from('word_learning').update(fields).eq('user_id',data.user.id).eq('word_id',wordId);
     }else if(item.type==='exam'){
      response=await backend.client.from('word_learning').upsert(item.payload,{onConflict:'user_id,word_id'});
     }else throw Error('Noma’lum offline amal: '+item.type);
     if(response.error)throw response.error;
     await operation('outbox','delete',item.id);
     done++;
    }catch(e){console.warn('Offline sync failed:',e);break;}
   }
   if(done)networkFailed=false;
   return {synced:done,remaining:(await pending()).length};
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
 const bridge={remember,remembered,restore,forget,account,store,read,pending,enqueue,sync,prepare,
  isOffline,online,networkError,noteFailure,refreshData:async()=>{}};
 window.WordoraOffline=bridge;
 backend.api=async function(path,opts={}){
  const method=opts.method||'GET';
  const snapshot=path.startsWith('/words?')||path==='/words'&&method==='GET'?'words':path==='/stats'?'stats':null;
  if(method==='POST'&&path==='/reviews'&&!online()){
   await enqueue('review',JSON.parse(opts.body||'{}'));return {offline:true,queued:true};
  }
  if(method!=='GET'&&!online())throw Error('Bu amal internet talab qiladi. Offline rejimda yodlash, mashqlar va test ishlaydi.');
  if(snapshot&&!online()){
   const data=await read(snapshot);
   if(data===null)throw Error('Offline so‘zlar yuklanmagan. Internetda bir marta tizimga kiring.');
   return data;
  }
  try{
   const data=await originalApi(path,opts);
   if(snapshot){await store(snapshot,data).catch(console.warn);networkFailed=false;}
   return data;
  }catch(e){
   if(networkError(e)){
    noteFailure(e);
    if(method==='POST'&&path==='/reviews'){
     await enqueue('review',JSON.parse(opts.body||'{}'));return {offline:true,queued:true};
    }
    if(snapshot){const data=await read(snapshot);if(data!==null)return data;}
   }
   throw e;
  }
 };
})();

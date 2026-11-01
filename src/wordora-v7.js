'use strict';
/* Wordora 7.0 — resource-aware startup and UI pagination.
 * Wordora 6 offline snapshots and 90% mastery rules remain authoritative.
 * The cache is PRIVATE to one in-memory signed-in account, never a shared CDN cache.
 */
const V7={
  userId:null,loadedAt:0,inflight:null,inflightUser:null,invalidated:true,version:0,
  ttl:45000,
  metrics:{fullLoads:0,sharedLoads:0,cacheHits:0,lastLoadMs:0,lastWordCount:0,lastError:''}
};
function v7Invalidate(reason='change'){
 V7.invalidated=true;V7.version++;
 V7.metrics.lastReason=reason;
}
function v7HasFreshData(){
 return !V7.invalidated && Date.now()-V7.loadedAt<V7.ttl
  && Array.isArray(state.words)&&state.words.length>0&&V4.ready&&V5.ready;
}
const v7LegacyLoadCore=loadCore;
loadCore=async function(options={}){
 const user=state.user?.id;
 if(!user)return;
 if(V7.userId!==user){
  V7.userId=user;V7.loadedAt=0;v7Invalidate('account-switch');
  // Never keep another account's vocabulary visible if the new request fails.
  state.words=[];state.stats=null;state.categories=[];
  V4.memory={};V5.collections=[];V5.items=[];
 }
 if(!options.force&&v7HasFreshData()){V7.metrics.cacheHits++;return;}
 if(V7.inflight&&V7.inflightUser===user){
  V7.metrics.sharedLoads++;
  await V7.inflight;
  if((options.force||V7.invalidated)&&!v7HasFreshData())return loadCore({force:true});
  return;
 }
 const generation=V7.version,started=performance.now();
 const job=(async()=>{
  window.WordoraOffline?.remember(state.user);
  // Resolve independent Supabase requests in parallel, not through the V4 -> V5
  // sequential wrapper chain. V4 and V5 still keep their offline fallback logic.
  const [categories,words,stats]=await Promise.all([
   api('/categories'),api('/words?limit=2000'),api('/stats')
  ]);
  if(state.user?.id!==user)return;
  state.categories=categories;
  state.words=words.words;
  state.stats=stats;
  await Promise.all([v4Fetch(),v5Load()]);
  if(state.user?.id!==user)return;
  V7.metrics.fullLoads++;
  V7.metrics.lastWordCount=state.words.length;
  V7.metrics.lastLoadMs=Math.round(performance.now()-started);
  V7.metrics.lastError='';
  if(V7.version===generation){V7.invalidated=false;V7.loadedAt=Date.now();}
 })();
 V7.inflight=job;V7.inflightUser=user;
 try{await job;}catch(e){
  V7.metrics.lastError=String(e?.message||e);
  V7.invalidated=true;
  throw e;
 }finally{if(V7.inflight===job){V7.inflight=null;V7.inflightUser=null;}}
};
const perfApi={
 invalidate:v7Invalidate,
 refresh:async()=>{v7Invalidate('manual');await loadCore({force:true});render();},
 metrics:()=>({...V7.metrics,lastRefresh:V7.loadedAt,ttlMs:V7.ttl}),
 currentUser:()=>V7.userId
};
window.WordoraV7=perfApi;
// Local diagnostics only: no personal data or telemetry sent to a third party.
window.WordoraDiagnostics={
 async status(){
  const sync=await window.WordoraOffline?.syncStatus?.().catch(()=>null);
  return {
   version:'7.5',reviewProtocol:window.WordoraBackend?.reviewProtocol||'unknown',
   pendingOperations:sync?.pending??0,conflictedExams:sync?.conflicts??0,
   lastSyncedAt:sync?.lastSyncedAt??null,lastSyncErrorCode:sync?.lastErrorCode??null,
   offline:window.WordoraOffline?.isOffline?.()||false,
   ...perfApi.metrics()
  };
 }
};
// Refreshing a predownloaded offline package must NOT return a stale in-memory snapshot.
if(window.WordoraOffline){
 window.WordoraOffline.refreshData=async()=>{v7Invalidate('offline-download');await loadCore({force:true});};
 const originalSync=window.WordoraOffline.sync;
 window.WordoraOffline.sync=async function(...args){
  const result=await originalSync(...args);
  if(result?.synced>0)v7Invalidate('offline-sync');
  return result;
 };
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-v7-page]');if(!button)return;
 event.preventDefault();
 const delta=Number(button.dataset.v7Page);
 if(!Number.isInteger(delta)||![-1,1].includes(delta)||state.page!=='library')return;
 state.libraryPage=Math.max(0,(Number(state.libraryPage)||0)+delta);
 render();
 document.querySelector('.v7-pages')?.scrollIntoView({block:'nearest',behavior:'instant'});
},true);
document.addEventListener('change',event=>{
 if(['v3-library-topic','v3-library-type','v3-library-source'].includes(event.target.id)){
  state.libraryPage=0;
 }
},true);
document.addEventListener('click',event=>{
 if(event.target.closest('[data-v5="library-collection"],[data-action="v3-stage"]')){
  state.libraryPage=0;
 }
},true);
window.addEventListener('visibilitychange',()=>{
 if(document.visibilityState!=='visible'||!state.user||!navigator.onLine)return;
 if(!['dashboard','library','exercises'].includes(state.page))return;
 if(state.showAdd||state.editWordId!==null)return; // do not interrupt in-progress forms
 if(Date.now()-V7.loadedAt<120000||V7.inflight)return;
 v7Invalidate('return-to-tab');
 loadCore({force:true}).then(()=>render()).catch(e=>console.warn('Wordora refresh:',e));
});

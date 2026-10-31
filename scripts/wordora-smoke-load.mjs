// Wordora authorized smoke load: public static assets only, NO Supabase/Auth/DB calls.
// Bounded to <= 30 workers and <= 20 seconds by default. Node.js >= 20.
const BASE = (process.env.BASE_URL || 'https://wordora.pages.dev').replace(/\/+$/,'');
const VUS = Math.max(1,Math.min(30,Number(process.env.VUS)||5));
const SECONDS = Math.max(5,Math.min(20,Number(process.env.DURATION_SEC)||20));
const PAUSE_MS = Math.max(800,Number(process.env.PAUSE_MS)||1000);
const PATHS = ['/', '/manifest.webmanifest', '/wordora-v7.js', '/wordora-v7.css'];
if (new URL(BASE).hostname !== 'wordora.pages.dev') throw new Error('Only wordora.pages.dev is allowed by this smoke test');
const timings=[], errors=[],statuses={},byPath={};
const endAt=Date.now()+SECONDS*1000;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function worker(id) {
 let next=id%PATHS.length;
 while(Date.now()<endAt){
  const path=PATHS[next++%PATHS.length];
  const start=performance.now();
  try {
   const response=await fetch(BASE+path,{
    signal:AbortSignal.timeout(7000),
    headers:{'user-agent':'Wordora-owner-authorized-smoke-test/7.1'}
   });
   const bytes=(await response.arrayBuffer()).byteLength;
   const duration=performance.now()-start;
   timings.push(duration);
   statuses[String(response.status)]=(statuses[String(response.status)]||0)+1;
   const stats=byPath[path]||(byPath[path]={requests:0,errors:0,bytes:0});
   stats.requests++;stats.bytes+=bytes;
   if(!response.ok){errors.push(path+' HTTP '+response.status);stats.errors++;}
  }catch(error){
   errors.push(path+' '+String(error.message||error).slice(0,150));
   const stats=byPath[path]||(byPath[path]={requests:0,errors:0,bytes:0});
   stats.requests++;stats.errors++;
  }
  await sleep(PAUSE_MS);
 }
}
await Promise.all(Array.from({length:VUS},(_,i)=>worker(i)));
const sorted=timings.sort((a,b)=>a-b);
const percentile=p=>sorted.length?Math.round(sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)]):null;
const count=timings.length+errors.filter(x=>!x.includes('HTTP ')).length;
const report={
 kind:'PUBLIC_STATIC_ONLY', target:BASE,virtualUsers:VUS,durationSeconds:SECONDS,
 completedRequests:count,successRate:count?Number(((count-errors.length)/count*100).toFixed(2)):0,
 failedRequests:errors.length,httpStatusCounts:statuses,
 latencyMs:{p50:percentile(.5),p95:percentile(.95),p99:percentile(.99)},byPath,
 sampleErrors:errors.slice(0,8), testedAt:new Date().toISOString()
};
console.log('WORDORA_LOAD_REPORT_BEGIN');
console.log(JSON.stringify(report,null,2));
console.log('WORDORA_LOAD_REPORT_END');
if(count===0||errors.length/count>0.02||percentile(.95)>2500)process.exitCode=1;

// Wordora local Supabase Auth+PostgREST+RLS+RPC integrated load test.
// This NEVER connects to hosted Supabase. Local API_URL must be loopback.
// Uses 500 real LOCAL Auth accounts and real JWTs, not fabricated auth.uid().
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

const envText=readFileSync(process.env.SUPABASE_LOCAL_STATUS_FILE||'/tmp/wordora-local-supabase.env','utf8');
const vars=Object.fromEntries(envText.split(/\r?\n/).map(line=>{
 const i=line.indexOf('=');
 return i<1?[]:[line.slice(0,i),line.slice(i+1).replace(/^["']|["']$/g,'')];
}).filter(x=>x.length===2));
const base=vars.API_URL||vars.SUPABASE_URL;
const anon=vars.ANON_KEY;
const service=vars.SERVICE_ROLE_KEY;
if(!base||!anon||!service)throw Error('Local Supabase status missing API_URL/ANON_KEY/SERVICE_ROLE_KEY');
const target=new URL(base);
if(!['127.0.0.1','localhost','::1'].includes(target.hostname)||!['http:'].includes(target.protocol))
 throw Error('Refusing non-local Supabase API URL');
if(Number(target.port)!==54321)throw Error('Unexpected local Supabase API port');
const makeClient=(key=anon)=>createClient(base,key,{
 auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}
});
const root=makeClient(service);
const TOTAL=500;
const stages=[{users:100,maxActive:25},{users:250,maxActive:40},{users:500,maxActive:60}];
const nonce=randomUUID().replaceAll('-','').slice(0,16);
const password='WordoraTest-Aa1!-'+randomUUID();
const identities=[];
const creationFailures=[];
const runStart=performance.now();
const sleep=ms=>new Promise(res=>setTimeout(res,ms));

function unwrap(value,label){
 if(value.error)throw new Error(label+': '+String(value.error.message||value.error.code).slice(0,220));
 return value.data;
}
function percentile(values,p){
 if(!values.length)return null;
 const a=[...values].sort((x,y)=>x-y);
 return Math.round(a[Math.min(a.length-1,Math.max(0,Math.ceil(a.length*p)-1))]);
}
async function bounded(items,concurrency,task){
 let cursor=0,active=0,peak=0;
 const work=async()=>{
  while(true){
   const idx=cursor++;
   if(idx>=items.length)return;
   active++;peak=Math.max(peak,active);
   try{await task(items[idx],idx);}
   finally{active--;}
  }
 };
 await Promise.all(Array.from({length:Math.min(concurrency,items.length)},work));
 return peak;
}
async function adminUser(i){
 const email='wordora-local-'+nonce+'-'+i+'@example.com';
 const result=await root.auth.admin.createUser({email,password,email_confirm:true});
 if(result.error)throw new Error('Auth admin createUser #'+i+': '+result.error.message);
 if(!result.data?.user?.id)throw new Error('Auth createUser missing id');
 return {id:result.data.user.id,email};
}

// Read-only initial probe. Service-role key exists ONLY inside the runner, never in repository or output.
try{
 const probe=await fetch(base+'/rest/v1/',{headers:{apikey:anon,Authorization:'Bearer '+anon}});
 if(probe.status>=500)throw Error('Local REST service unavailable HTTP '+probe.status);
 console.log('Local Supabase Auth + REST endpoints discovered. Beginning isolated test account creation.');

 const created=Array(TOTAL);
 let createOk=0;
 await bounded(Array.from({length:TOTAL},(_,i)=>i),8,async i=>{
  try{
   created[i]=await adminUser(i);
   createOk++;
  }catch(e){creationFailures.push({user:i,error:String(e.message||e).slice(0,180)});}
 });
 if(creationFailures.length)throw Error('Auth provisioning failed for '+creationFailures.length+
  ' accounts: '+JSON.stringify(creationFailures.slice(0,4)));

 identities.push(...created);
 const seedData=unwrap(await root.from('words')
  .select('id').is('owner_id',null).order('id',{ascending:true}).limit(20),'seed words');
 const seed=seedData.map(x=>x.id);
 if(seed.length!==20)throw Error('Expected at least 20 starter words');
 console.log('Created '+createOk+' local Auth accounts; starter dictionary ready.');

 const summaries=[];
 for(const stage of stages){
  const timings=[],opTimes={},failures=[],completed=[],rps=[];
  const begun=performance.now();
  const nowTag='stage'+stage.users;
  const op=async(name,execute)=>{
   const started=performance.now();
   const result=await execute();
   (opTimes[name]??=[]).push(performance.now()-started);
   return unwrap(result,name);
  };
  const students=identities.slice(0,stage.users);
  async function study(person,i){
   const t=performance.now();
   const api=makeClient();
   try{
    const login=await op('auth_login',()=>api.auth.signInWithPassword({
      email:person.email,password
    }));
    if(login?.user?.id!==person.id||!login.session?.access_token)
     throw Error('Auth login returned wrong identity or no access token');

    const words=await op('dictionary_with_progress',()=>api.from('words')
      .select('id,en,uz,topic,word_type,progress(repetitions,due_on,correct_count,wrong_count,interval_days)')
      .order('id',{ascending:false}).range(0,999));
    if(!Array.isArray(words)||words.length<600)throw Error('Incomplete dictionary');

    const stats=await op('stats_rpc',()=>api.rpc('wordora_stats'));
    if(!stats||Number(stats.total)<600)throw Error('Statistics missing or incomplete');

    const mine=await op('personal_word',()=>api.from('words')
      .insert({owner_id:person.id,category:'mine',en:'test_'+nowTag+'_'+i,
       uz:'test',level:'Custom',topic:'study',word_type:'noun'})
      .select('id').single());
    if(!mine?.id)throw Error('Personal word was not created');

    const unit=await op('unit_create',()=>api.from('word_collections')
      .insert({user_id:person.id,name:'Load test '+nowTag+' — Unit 1'})
      .select('id').single());
    if(!unit?.id)throw Error('Unit was not created');

    const links=seed.map(word_id=>({
      user_id:person.id,collection_id:unit.id,word_id
    }));
    await op('unit_assign_20',()=>api.from('word_collection_items')
      .upsert(links,{onConflict:'user_id,collection_id,word_id',ignoreDuplicates:true}));
    const loaded=await op('unit_read',()=>api.from('word_collection_items')
      .select('word_id').eq('user_id',person.id).eq('collection_id',unit.id));
    if(loaded.length!==20)throw Error('Unit membership count not 20');

    const five=seed.slice(0,5);
    await op('lesson_save_5',()=>api.from('word_learning')
      .upsert(five.map(word_id=>({
        user_id:person.id,word_id,stage:'learning'
      })),{onConflict:'user_id,word_id',ignoreDuplicates:true}));
    for(const [j,mode] of ['cards','choice','write'].entries()){
     const requestId=randomUUID();
     const payload={
       p_word_id:five[j],p_mode:mode,p_quality:5,p_request_id:requestId
     };
     const result=await op('review_rpc_v2',()=>api.rpc('wordora_review_v2',payload));
     if(result?.ok!==true||result.deduplicated!==false)throw Error('Practice RPC did not save');
     // Retrying an identical request after an uncertain ACK must be a no-op.
     if(j===0){
      const duplicate=await op('review_rpc_retry',()=>api.rpc('wordora_review_v2',payload));
      if(duplicate?.ok!==true||duplicate.deduplicated!==true)
       throw Error('Duplicate review request was not deduplicated');
      if(i===0){
       const changed=await api.rpc('wordora_review_v2',{...payload,p_quality:2});
       if(!changed.error||changed.error.code!=='22023')
        throw Error('Reused request ID with different payload was not rejected');
      }
     }
    }

    const exam=await op('exam_95_write',()=>api.from('word_learning')
      .update({stage:'mastered',last_test_score:95,tested_at:new Date().toISOString()})
      .eq('user_id',person.id).in('word_id',five).select('word_id'));
    if(exam.length!==5)throw Error('Exam result count incorrect');
    const verified=await op('exam_read_back',()=>api.from('word_learning')
      .select('word_id,stage,last_test_score')
      .eq('user_id',person.id).in('word_id',five));
    if(verified.length!==5||verified.some(x=>x.stage!=='mastered'||x.last_test_score!==95))
     throw Error('Saved 95% exam result not found');

    if(i===0||i===stage.users-1){
     const other=students[i===0?stage.users-1:0];
     const foreign=await op('cross_account_rls',()=>api.from('word_collections')
       .select('id').eq('user_id',other.id));
     if(foreign.length)throw Error('CROSS ACCOUNT DATA LEAK');
     const invalid=await api.from('word_learning')
       .update({last_test_score:80})
       .eq('user_id',person.id).eq('word_id',five[0]);
     if(!invalid.error||invalid.error.code!=='23514')
      throw Error('Mastery 90% CHECK not enforced');
    }
    completed.push(i);
    timings.push(performance.now()-t);
   }catch(e){
    failures.push({user:i,error:String(e.message||e).slice(0,230)});
   }finally{
    await api.auth.signOut({scope:'local'}).catch(()=>{});
   }
  }
  const peak=await bounded(students,stage.maxActive,study);
  // Post-stage checks: run only after EVERY user has finished. The other account's
  // data now definitely exists, so an empty response actually proves RLS isolation.
  if(!failures.length){
   for(const j of [0,stage.users-1]){
    const user=students[j],other=students[j===0?stage.users-1:0];
    const client=makeClient();
    try{
     unwrap(await client.auth.signInWithPassword({email:user.email,password}),'isolation login');
     const foreignUnit=unwrap(await client.from('word_collections')
       .select('id').eq('user_id',other.id),'foreign Units');
     const foreignLearning=unwrap(await client.from('word_learning')
       .select('word_id').eq('user_id',other.id),'foreign learning');
     const foreignPersonal=unwrap(await client.from('words')
       .select('id').eq('owner_id',other.id),'foreign personal words');
     if(foreignUnit.length||foreignLearning.length||foreignPersonal.length)
      throw Error('Post-stage cross-account RLS leak');
    }catch(e){failures.push({user:j,error:String(e.message||e).slice(0,220)});}
    finally{await client.auth.signOut({scope:'local'}).catch(()=>{});}
   }
  }
  const row={
   kind:'LOCAL_SUPABASE_AUTH_REST_RLS_RPC_NOT_HOSTED',
   virtualUsers:stage.users,activeSessionCap:stage.maxActive,peakActiveFlows:peak,
   completed:completed.length,failed:failures.length,
   elapsedMs:Math.round(performance.now()-begun),
   userFlowLatencyMs:{p50:percentile(timings,.5),p95:percentile(timings,.95),p99:percentile(timings,.99)},
   operationsMs:Object.fromEntries(Object.entries(opTimes).map(([name,values])=>
    [name,{count:values.length,p95:percentile(values,.95)}])),
   sampleErrors:failures.slice(0,6)
  };
  summaries.push(row);
  console.log('WORDORA_LOCAL_SUPABASE_STAGE_BEGIN');
  console.log(JSON.stringify(row,null,2));
  console.log('WORDORA_LOCAL_SUPABASE_STAGE_END');
  if(failures.length){
    console.log('Stopping escalation after failing stage. No production data was changed.');
    break;
  }
  await sleep(1500);
 }
 // Count rows via LOCAL service-role only after the stages; this verifies persistence, not just HTTP 200.
 const count=async(table,query,personalOnly=false)=>{
  const selected=query.select('*',{count:'exact',head:true});
  const {count,error}=await (personalOnly?selected.not('owner_id','is',null):selected);
  if(error)throw Error('Count '+table+': '+error.message);
  return count;
 };
 const totals={
  personalWords:await count('personalWords',root.from('words'),true),
  units:await count('units',root.from('word_collections')),
  learning:await count('learning',root.from('word_learning')),
  reviews:await count('reviews',root.from('reviews')),
  unitItems:await count('unitItems',root.from('word_collection_items'))
 };
 const completedAll=summaries.length===stages.length&&summaries.every(s=>!s.failed&&s.completed===s.virtualUsers);
 const totalFlows=summaries.reduce((acc,x)=>acc+x.completed,0);
 const expected={
  personalWords:totalFlows,units:totalFlows,unitItems:20*totalFlows,
  reviews:3*totalFlows,learning:5*(completedAll?TOTAL:Math.max(...summaries.map(x=>x.virtualUsers)))
 };
 // For a successful complete run, users 0..499 each have 5 learning rows, and repeat stages
 // create unique Units/personal words/reviews but not duplicate learning rows.
 const integrity=completedAll&&Object.entries(expected).every(([key,value])=>totals[key]===value);
 const summary={
  kind:'LOCAL_FULL_SUPABASE_AUTH_REST_RLS_RPC_TEST',
  isolated:true,hostedProductionTested:false,
  stagedUsers:stages.map(x=>x.users),stages:summaries,
  completedAllStages:completedAll,integrity,expected,actual:totals,
  totalMs:Math.round(performance.now()-runStart),testedAt:new Date().toISOString()
 };
 console.log('WORDORA_LOCAL_SUPABASE_FINAL_BEGIN');
 console.log(JSON.stringify(summary,null,2));
 console.log('WORDORA_LOCAL_SUPABASE_FINAL_END');
 if(!completedAll||!integrity)process.exitCode=1;
}catch(e){
 console.error('Wordora isolated Supabase test error:',String(e.message||e).slice(0,550));
 process.exitCode=1;
}

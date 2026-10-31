// Wordora 500 virtual learners: real SQL, RLS and RPC on disposable PostgreSQL.
// Not a live Supabase Auth/GoTrue/REST/browser benchmark. NEVER connects to production.
// Run only on 127.0.0.1:5432, inside the GitHub Actions PostgreSQL service.
import pg from 'pg';
import {randomUUID} from 'node:crypto';
const VUS=500,POOL_MAX=60;
if(process.env.TEST_PG_HOST&&process.env.TEST_PG_HOST!=='127.0.0.1')
 throw Error('Only loopback PostgreSQL test hosts are allowed');
const pool=new pg.Pool({host:'127.0.0.1',port:5432,user:'postgres',
 password:process.env.TEST_PG_PASSWORD||'wordora-local-only',
 database:'postgres',max:POOL_MAX,connectionTimeoutMillis:90000,idleTimeoutMillis:5000});
const durations=[],errors=[],operations={},isolation=[];
const start=performance.now();
function record(name,time){(operations[name]??=[]).push(Math.round(time));}
async function q(client,name,sql,args=[]){
 const t=performance.now();const out=await client.query(sql,args);
 record(name,performance.now()-t);return out;
}
async function session(client,id){
 await client.query('BEGIN');
 await client.query('SET LOCAL ROLE authenticated');
 await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[id]);
 const me=await client.query('SELECT auth.uid() id');
 if(me.rows[0].id!==id)throw Error('RLS JWT identity mismatch');
}
function percent(arr,p){
 if(!arr.length)return null;
 const sorted=arr.toSorted((a,b)=>a-b);
 return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];
}
try{
 const users=Array.from({length:VUS},()=>randomUUID());
 const admin=await pool.connect();let seed;
 try{
  await admin.query('BEGIN');
  await admin.query("INSERT INTO public.words(category,en,uz,level,topic,word_type) "+
   "SELECT 'study','benchword_'||lpad(n::text,4,'0'),'tarjima_'||n,'A1','study','noun' "+
   "FROM generate_series(1,600) AS n");
  await admin.query("INSERT INTO auth.users(id,email) SELECT (x->>'id')::uuid,x->>'email' "+
   "FROM jsonb_array_elements($1::jsonb) x",[JSON.stringify(users.map((id,i)=>({id,email:'test-'+i+'@local.invalid'})))]);
  seed=(await admin.query("SELECT id FROM public.words WHERE owner_id IS NULL ORDER BY id LIMIT 20")).rows.map(x=>x.id);
  if(seed.length!==20)throw Error('Missing 20 seeded words');
  await admin.query('COMMIT');
 }catch(e){await admin.query('ROLLBACK');throw e;}finally{admin.release();}
 async function learner(id,i){
  const began=performance.now();let c=null,inTransaction=false;
  try{
   c=await pool.connect();
   await session(c,id);inTransaction=true;
   const words=await q(c,'read_words',"SELECT id,en,uz,topic,word_type FROM public.words ORDER BY id DESC LIMIT 1000");
   if(words.rows.length<600)throw Error('Word list incomplete');
   const stats=await q(c,'stats',"SELECT public.wordora_stats() value");
   if(Number(stats.rows[0].value.total)<600)throw Error('Statistics total incorrect');
   const personal=await q(c,'personal_insert',"INSERT INTO public.words(owner_id,category,en,uz,level,topic,word_type) "+
    "VALUES($1,'mine',$2,$3,'Custom','study','noun') RETURNING id",[id,'mine-'+i,'uz-'+i]);
   if(!personal.rows[0].id)throw Error('Personal dictionary insert failed');
   const col=await q(c,'create_unit',"INSERT INTO public.word_collections(user_id,name) "+
    "VALUES($1,'Essential 1 — Unit 1') RETURNING id",[id]);
   const colid=col.rows[0].id;
   await q(c,'add_20_to_unit',"INSERT INTO public.word_collection_items(user_id,collection_id,word_id) "+
    "SELECT $1,$2,unnest($3::bigint[])",[id,colid,seed]);
   const items=await q(c,'read_unit',"SELECT word_id FROM public.word_collection_items "+
    "WHERE user_id=$1 AND collection_id=$2",[id,colid]);
   if(items.rows.length!==20)throw Error('Unit must have 20 words');
   await q(c,'introduce_5',"INSERT INTO public.word_learning(user_id,word_id,stage) "+
    "SELECT $1,unnest($2::bigint[]),'learning' ON CONFLICT(user_id,word_id) DO NOTHING",
    [id,seed.slice(0,5)]);
   for(const [j,mode] of ['cards','choice','write'].entries()){
    const result=await q(c,'practice_review',"SELECT public.wordora_review($1,$2,$3) value",
     [seed[j],mode,5]);
    if(result.rows[0].value.ok!==true)throw Error('Review RPC failed');
   }
   const exam=await q(c,'save_exam_95',"UPDATE public.word_learning "+
    "SET stage='mastered',last_test_score=95,tested_at=now() "+
    "WHERE user_id=$1 AND word_id=ANY($2::bigint[]) RETURNING word_id",[id,seed.slice(0,5)]);
   if(exam.rows.length!==5)throw Error('Exam result did not persist');
   await c.query('SAVEPOINT check_low_score');
   let rejected=false;
   try{
    await c.query("UPDATE public.word_learning SET last_test_score=80 WHERE user_id=$1 AND word_id=$2",[id,seed[0]]);
   }catch(e){if(e.code==='23514')rejected=true;else throw e;}
   await c.query('ROLLBACK TO SAVEPOINT check_low_score');
   await c.query('RELEASE SAVEPOINT check_low_score');
   if(!rejected)throw Error('90% mastery constraint missing');
   await c.query('COMMIT');inTransaction=false;
   durations.push(Math.round(performance.now()-began));
  }catch(e){
   if(inTransaction)await c.query('ROLLBACK').catch(()=>{});
   errors.push({user:i,error:String(e.message||e).slice(0,220)});
  }finally{c?.release();}
 }
 await Promise.all(users.map(learner));
 if(!errors.length){
  for(const i of [0,1,50,99,250,499]){
   const c=await pool.connect();let trans=false;
   try{
    await session(c,users[i]);trans=true;
    const counts=[];
    for(const table of ['words','word_learning','word_collections','reviews','word_collection_items']){
     const where=table==='words'?'WHERE owner_id IS NOT NULL':'';
     const found=await c.query('SELECT count(*)::int AS n FROM public.'+table+' '+where);
     counts.push(found.rows[0].n);
    }
    if(counts.join(',')!=='1,5,1,3,20')throw Error('Cross-user RLS isolation failed: '+counts);
    await c.query('COMMIT');trans=false;isolation.push(i);
   }catch(e){if(trans)await c.query('ROLLBACK').catch(()=>{});errors.push({user:i,error:String(e.message||e)});}
   finally{c.release();}
  }
 }
 let totals=null;
 if(!errors.length){
  const admin=await pool.connect();
  try{
   const result=await admin.query("SELECT "+
    "(SELECT count(*)::int FROM public.words WHERE owner_id IS NOT NULL) AS personal,"+
    "(SELECT count(*)::int FROM public.word_learning) AS learning,"+
    "(SELECT count(*)::int FROM public.word_collections) AS collections,"+
    "(SELECT count(*)::int FROM public.reviews) AS reviews,"+
    "(SELECT count(*)::int FROM public.word_collection_items) AS items");
   totals=result.rows[0];
   if([totals.personal,totals.learning,totals.collections,totals.reviews,totals.items].join(',')!==
      [VUS,VUS*5,VUS,VUS*3,VUS*20].join(','))
    errors.push({user:'global',error:'Some learner results missing: '+JSON.stringify(totals)});
  }finally{admin.release();}
 }
 const report={kind:'ISOLATED_WORDORA_POSTGRESQL_ONLY',
  virtualLearners:VUS,maxDatabaseConnections:POOL_MAX,connectionPooling:true,
  concurrentClientsAtStart:VUS,completedUsers:durations.length,failedUsers:errors.length,
  wordsSeeded:686,persistedRows:totals,elapsedMs:Math.round(performance.now()-start),
  sessionMs:{p50:percent(durations,.5),p95:percent(durations,.95),p99:percent(durations,.99)},
  operationMs:Object.fromEntries(Object.entries(operations).map(([k,v])=>[k,{count:v.length,p95:percent(v,.95)}])),
  RLSIsolationAccounts:isolation,errors:errors.slice(0,8),testedAt:new Date().toISOString()};
 console.log('WORDORA_DB_500_REPORT_BEGIN');
 console.log(JSON.stringify(report,null,2));
 console.log('WORDORA_DB_500_REPORT_END');
 if(errors.length||durations.length!==VUS)process.exitCode=1;
}catch(e){console.error('Wordora test bootstrap:',String(e.stack||e));process.exitCode=1;}
finally{await pool.end();}

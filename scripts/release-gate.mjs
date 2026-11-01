import {readFileSync} from 'node:fs';
export function assessLocalLoad(report){
 const checks=[];
 const add=(id,ok,detail)=>checks.push({id,pass:!!ok,detail});
 const counts=[100,250,500],caps=[25,40,60],stages=report?.stages||[];
 add('isolated',report?.kind==='LOCAL_FULL_SUPABASE_AUTH_REST_RLS_RPC_TEST'&&report.isolated===true&&report.hostedProductionTested===false,'Isolated Supabase only');
 add('stage-count',stages.length===3,'100, 250, 500 account cohorts');
 for(let i=0;i<3;i++){
  const s=stages[i]||{},n=counts[i],cap=caps[i];
  add('cohort-'+n,s.virtualUsers===n&&s.completed===n&&s.failed===0,'All virtual account flows completed without errors');
  add('active-'+n,s.activeSessionCap===cap&&Number.isInteger(s.peakActiveFlows)&&s.peakActiveFlows>0&&s.peakActiveFlows<=cap,'The measured peak is bounded by the active flow cap; account count is not concurrency');
  const p95=s.userFlowLatencyMs?.p95;
  add('p95-'+n,Number.isFinite(p95)&&p95>0&&p95<=60000,'Local end-to-end user flow p95 <= 60 seconds');
  const ops=s.operationsMs||{};
  add('security-'+n,ops.auth_login?.count===n&&ops.review_rpc_v2?.count===n*3&&ops.exam_v74_write?.count===n&&Number(ops.cross_account_rls?.count)>=2,'Auth, idempotent reviews, atomic exams, RLS checks required');
 }
 add('complete',report?.completedAllStages===true,'Every stage completed');
 add('integrity',report?.integrity===true&&!!report?.expected&&!!report?.actual&&Object.keys(report.expected).length>=5&&Object.entries(report.expected).every(([k,v])=>Number.isInteger(v)&&report.actual[k]===v),'Persisted row counts agree');
 return {kind:'WORDORA_7_9_LOCAL_EVIDENCE',passed:checks.every(x=>x.pass),checks,
  blockers:checks.filter(x=>!x.pass),maximumActiveFlowsValidated:60,
  productionCapacityCertified:false,hostedProductionTested:false,
  liveSupabaseSecurityAudited:false,backupRestoreVerified:false};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 try{
  if(!process.argv[2])throw Error('Usage: node scripts/release-gate.mjs report.json');
  const result=assessLocalLoad(JSON.parse(readFileSync(process.argv[2],'utf8')));
  console.log(JSON.stringify(result,null,2));
  if(!result.passed)process.exitCode=1;
 }catch(e){console.error('Invalid local report:',e.message);process.exitCode=1;}
}

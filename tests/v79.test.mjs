import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessLocalLoad} from '../scripts/release-gate.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const fixture=()=>{
 const stages=[100,250,500].map((n,i)=>({
  virtualUsers:n,completed:n,failed:0,activeSessionCap:[25,40,60][i],
  peakActiveFlows:[25,40,60][i],userFlowLatencyMs:{p95:15000},
  operationsMs:{auth_login:{count:n},cross_account_rls:{count:4},
  review_rpc_v2:{count:3*n},exam_v74_write:{count:n}}
 }));
 const expected={personalWords:850,units:850,unitItems:17000,reviews:2550,learning:2500};
 return {kind:'LOCAL_FULL_SUPABASE_AUTH_REST_RLS_RPC_TEST',isolated:true,
  hostedProductionTested:false,stages,completedAllStages:true,integrity:true,expected,actual:{...expected}};
};
test('local evidence requires successful Auth, RLS, RPC and integrity',()=>{
 const r=assessLocalLoad(fixture());assert.equal(r.passed,true);
 assert.equal(r.productionCapacityCertified,false);
 assert.equal(r.maximumActiveFlowsValidated,60);
});
test('500 virtual accounts must not be treated as 500 active flows',()=>{
 const f=fixture();f.stages[2].peakActiveFlows=500;
 const r=assessLocalLoad(f);assert.equal(r.passed,false);
 assert.ok(r.blockers.some(x=>x.id==='active-500'));
});
test('partial stages, high latency and skipped security fail the gate',()=>{
 const f=fixture();f.stages[2].completed=499;
 f.stages[0].userFlowLatencyMs.p95=90000;
 f.stages[1].operationsMs.cross_account_rls.count=0;
 const r=assessLocalLoad(f);
 for(const id of ['cohort-500','p95-100','security-250'])
  assert.ok(r.blockers.some(x=>x.id===id));
});
test('hosted claims and missing rows fail the gate',()=>{
 const f=fixture();f.hostedProductionTested=true;f.actual.learning=1;
 const r=assessLocalLoad(f);assert.equal(r.passed,false);
 assert.ok(r.blockers.some(x=>x.id==='isolated'));
 assert.ok(r.blockers.some(x=>x.id==='integrity'));
});
test('test harness pins its endpoint to local Supabase',()=>{
 const script=read('scripts/wordora-local-supabase-500.mjs');
 assert.match(script,/127\.0\.0\.1/);
 assert.match(script,/Unexpected local Supabase API port/);
 assert.match(script,/activeSessionCap:stage\.maxActive/);
 assert.doesNotMatch(read('scripts/release-gate.mjs'),/\bfetch\s*\(/);
});
test('7.9 retains previous mastery and private API caching safeguards',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'7.9.0');
 assert.match(read('src/service-worker.js'),/wordora-pwa-7\.9\.0/);
 assert.match(read('src/wordora-v4.js'),/threshold: 90/);
 assert.match(read('src/wordora-v7.js'),/version:'7\.9'/);
});

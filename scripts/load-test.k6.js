// Wordora 7.0 public static assets ONLY. Run locally and opt in deliberately.
// k6 run -e BASE_URL=https://wordora.pages.dev scripts/load-test.k6.js
import http from 'k6/http';
import {check,sleep} from 'k6';
const BASE=(__ENV.BASE_URL||'http://127.0.0.1:4173').replace(/\/+$/,'');
export const options={
 scenarios:{public_assets:{
  executor:'ramping-vus',
  startVUs:0,
  stages:[
   {duration:'15s',target:10},
   {duration:'30s',target:10},
   {duration:'15s',target:30},
   {duration:'30s',target:30},
   {duration:'15s',target:0}
  ]
 }},
 thresholds:{http_req_failed:['rate<0.01'],http_req_duration:['p(95)<1500']}
};
export default function(){
 const paths=['/','/manifest.webmanifest','/wordora-v7.js','/wordora-v7.css'];
 const responses=http.batch(paths.map(path=>['GET',BASE+path,null,{tags:{kind:'public-static'}}]));
 responses.forEach((res,i)=>check(res,{[paths[i]+' HTTP 200']:r=>r.status===200}));
 sleep(2);
}
// This is NOT an authenticated Supabase load test and proves no simultaneous-user capacity.

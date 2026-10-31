import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
const manifest=JSON.parse(source('manifest.webmanifest'));
test('PWA has a valid install manifest and real 192 and 512 PNG icons',()=>{
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.start_url,'/?source=pwa');
 assert.equal(manifest.scope,'/');
 for(const size of [192,512]){
  const p=readFileSync(new URL('../src/icons/icon-'+size+'.png',import.meta.url));
  assert.equal(p.subarray(1,4).toString(),'PNG');
  assert.equal(p.readUInt32BE(16),size);
  assert.equal(p.readUInt32BE(20),size);
  assert.ok(manifest.icons.some(i=>i.src.endsWith('/icon-'+size+'.png')&&i.sizes===size+'x'+size));
 }
});
test('offline app shell and Supabase dependency are cached without caching private APIs',()=>{
 const sw=source('service-worker.js');
 assert.match(sw,/cacheShell/);
 assert.match(sw,/cache\.addAll\(ASSETS/);
 assert.match(sw,/cdn\.jsdelivr\.net/);
 assert.match(sw,/if\(url\.origin!==self\.location\.origin\)/);
 assert.match(sw,/if\(url\.href!==CDN\)return/);
 assert.match(sw,/event\.data\?\.type!=='PRECACHE'/);
 new Function(sw);
});
test('offline cache and outgoing writes are isolated by account',()=>{
 const js=source('wordora-offline.js');
 assert.ok(js.includes("account()+':'+name"));
 assert.match(js,/x\.userId===account\(\)/);
 assert.match(js,/data\.user\.id!==account\(\)/);
 assert.match(js,/type==='exam'/);
 assert.match(js,/type==='learning-insert'/);
 assert.match(js,/type==='review'/);
 assert.match(js,/store\('pwa-ready'/);
 assert.match(js,/cdnReady/);
 new Function(js);
});
test('existing Wordora learning and tests are connected without changing 90 percent policy',()=>{
 const bridge=source('wordora-offline-bridge.js');
 const app=source('app.js');
 const v4=source('wordora-v4.js');
 assert.match(bridge,/OF\.enqueue\('learning-insert'/);
 assert.match(bridge,/OF\.enqueue\('exam'/);
 assert.match(bridge,/OF\.enqueue\('review'/);
 assert.match(bridge,/data-offline="install"/);
 assert.match(bridge,/data-offline="prepare"/);
 assert.match(app,/WordoraOffline\.restore\(\)/);
 assert.match(v4,/threshold: 90/);
 assert.match(v4,/const promote=passed&&q\.checked/);
 new Function(bridge);
 new Function(app);
});
test('main page loads the offline bridge after study modules and backend wrapping before app',()=>{
 const html=source('index.html');
 const indexOf=name=>html.indexOf('src="/'+name+'"');
 assert.ok(indexOf('supabase-api.js')<indexOf('wordora-offline.js'));
 assert.ok(indexOf('wordora-offline.js')<indexOf('app.js'));
 assert.ok(indexOf('wordora-v6.js')<indexOf('wordora-offline-bridge.js'));
 assert.match(html,/manifest\.webmanifest/);
 assert.match(html,/wordora-offline\.css/);
});

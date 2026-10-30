import { cp, mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Tiny dependency-free build: produces Netlify-ready static files in dist/.
const root = resolve(import.meta.dirname, '..');
const envPath = resolve(root,'.env');
try {
  for (const line of readFileSync(envPath,'utf8').split(/\r?\n/)) {
    const m = /^\s*(SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY|SUPABASE_ANON_KEY)\s*=\s*(.*)$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^("|')(.*)\1$/, '$2');
  }
} catch { /* .env is optional; Netlify injects build environment variables. */ }
const url = process.env.SUPABASE_URL || '';
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const preview = process.argv.includes('--preview');
if (!preview && (!/^https:\/\/[^/]+\/?$/.test(url) || !publishableKey || /YOUR_PROJECT|example/i.test(url) || /PASTE_ME|CHANGE_ME/i.test(publishableKey))) {
  console.error('Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY. See DEPLOY_UZ.md.');
  process.exit(1);
}
if (/^sb_secret_/.test(publishableKey)) {
  console.error('STOP: secret key must NEVER be in client-side Javascript. Use a publishable/anon key.');
  process.exit(1);
}
if (publishableKey.split('.').length === 3) {
  try {
    const p = JSON.parse(Buffer.from(publishableKey.split('.')[1], 'base64url').toString());
    if (p.role === 'service_role') throw new Error('service_role');
  } catch (e) {
    if (e.message === 'service_role') {console.error('STOP: service_role key must NEVER be public.');process.exit(1);}
  }
}
await mkdir(resolve(root,'dist'), { recursive:true });
await cp(resolve(root,'src'), resolve(root,'dist'), { recursive:true });
// Avoid exposing internal source metadata if new files are later added to src.
await writeFile(resolve(root,'dist','config.js'),
  '/* Public Supabase project coordinates. No secrets in this file. */\n' +
  'window.WORDORA_CONFIG = ' + JSON.stringify({
    url: url || 'https://YOUR_PROJECT.supabase.co',
    publishableKey: publishableKey || 'PASTE_ME',
  }) + ';\n');
console.log('Wordora static deploy created in dist/' + (preview ? ' (offline setup preview)' : ''));

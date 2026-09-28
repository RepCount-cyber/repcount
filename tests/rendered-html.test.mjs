import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('production response opens the public homepage with programme and member-demo navigation', async () => {
  const { default: worker } = await import('../dist/server/index.js');
  const response = await worker.fetch(new Request('https://repcount.example/', {headers:{accept:'text/html'}}), {ASSETS:{fetch:async()=>new Response('Not found',{status:404})}}, {waitUntil(){},passThroughOnException(){}});
  assert.equal(response.status,200);
  const html = await response.text();
  for (const phrase of ['RepCount','Built around you.','Stronger','Member demo','Our approach','How it works','The programme','Find your starting point','Design demo']) assert.ok(html.includes(phrase), `Missing ${phrase}`);
  assert.ok(!html.includes('codex-preview'));
  assert.ok(!html.includes('ThriveMotion'));
  assert.ok(!html.includes('Your site is taking shape'));
  assert.ok(!html.includes('@gmail.com'));
  assert.ok(!html.includes('+971'));
});

test('demo has no storage bindings or live collection endpoints', async()=>{
 const config=JSON.parse(await readFile(new URL('../.openai/hosting.json',import.meta.url),'utf8'));
 assert.equal(config.d1,null);
 assert.equal(config.r2,null);
});



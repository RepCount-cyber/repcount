import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { SignJWT } from 'jose';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Runs against `next start` on a free port, so the proxy, layouts and server actions are exercised for real.
const SESSION_SECRET = 'test-secret-'.padEnd(48, 'x');
let server;
let baseUrl;
// Each run gets a throwaway database so local data is never touched.
const dataDir = mkdtempSync(join(tmpdir(), 'repcount-test-'));
const DATABASE_PATH = join(dataDir, 'test.db');
before(async () => {
 const port = await new Promise(resolve => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => resolve(p)); }); });
 baseUrl = `http://127.0.0.1:${port}`;
 server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], {env: {...process.env, SESSION_SECRET, DATABASE_PATH}, stdio: 'ignore'});
 for (let i = 0; i < 100; i++) {
  try { await fetch(baseUrl + '/'); return; } catch { await new Promise(r => setTimeout(r, 100)); }
 }
 throw new Error('next start did not respond');
});
after(() => { server?.kill(); rmSync(dataDir, {recursive: true, force: true}); });

let rendered;
function productionHomepage() {
 rendered ??= (async () => {
  const response = await fetch(baseUrl + '/', {headers:{accept:'text/html'}});
  assert.equal(response.status,200);
  return response.text();
 })();
 return rendered;
}
const sessionCookie = async (userId, role, secret = SESSION_SECRET) => 'rc_session=' + await new SignJWT({userId, role, expiresAt: new Date(Date.now() + 864e5).toISOString()}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1d').sign(new TextEncoder().encode(secret));
const visit = (path, cookie) => fetch(baseUrl + path, {redirect:'manual', headers: cookie ? {cookie} : {}});
const markupOnly = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
const readableText = html => markupOnly(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('production opens public coaching with an optional member demo', async () => {
 const html = markupOnly(await productionHomepage());
 const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
 assert.equal(headings.length, 1, 'Public homepage needs one primary heading');
 assert.match(readableText(headings[0][1]), /stronger.*own space/i);
 assert.match(html, /<main\b[^>]*id="rc-main"/i);
 assert.match(html, /<button\b[^>]*>\s*Member demo\b/i);
 assert.match(readableText(html), /interactive (?:design )?preview/i);
 assert.doesNotMatch(html, /class="(?:sidebar|topbar)"/, 'Member workspace must not replace the public first view');
 assert.doesNotMatch(readableText(html), /ThriveMotion|Your site is taking shape/);
});

test('pilot preserves confirmed scope and distinguishes future services', async () => {
 const text = readableText(await productionHomepage());
 assert.match(text, /AED\s*299\s*\/\s*30 days/);
 assert.match(text, /10\s+adults in the\s+first India cohort/);
 assert.match(text, /Adults 18\+/);
 assert.match(text, /Initial psychologist onboarding session/);
 assert.match(text, /Weekly trainer follow-ups/);
 assert.match(text, /Manual payment, verified by the team/);
 assert.match(text, /personalised nutrition plans are not currently part of the confirmed pilot package/);
 assert.match(text, /ongoing therapy is not a confirmed programme inclusion/);
 assert.match(text, /No live enrolment,\s*payments or appointments/);
 assert.doesNotMatch(text, /guaranteed (?:weight loss|results|transformation)|cures? depression|lose \d+\s*(?:kg|pounds)/i);
});

test('public response protects project contacts and excludes rejected gym media', async () => {
 const html = await productionHomepage();
 assert.doesNotMatch(html, /@gmail\.com|\+971|mujeeb\.dba|zainulisin|saleemdbest/i);
 assert.doesNotMatch(html, /codex-preview|localhost:5678|Lkn-Auto/);
 const mediaTags = markupOnly(html).match(/<(?:img|video|source)\b[^>]*>/gi) ?? [];
 assert.ok(mediaTags.length > 0, 'Expected meaningful visual media');
 assert.doesNotMatch(mediaTags.join('\n'), /photo-1548932813-88dcf75599c6|52082|100544/, 'Rejected bodybuilding assets must not be rendered');
 assert.match(readableText(html), /People shown are not presented as RepCount staff or clients/);
});

test('navigation and quiz labels refer to existing local targets', async () => {
 const html = markupOnly(await productionHomepage());
 const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
 const fragments = [...html.matchAll(/<a\b[^>]*\bhref="#([^"]*)"/gi)].map(match => match[1]);
 assert.ok(fragments.length > 0, 'Expected local feature navigation');
 for (const fragment of fragments) {
  assert.ok(fragment.length > 0, 'Empty hash links have no named target');
  assert.ok(ids.has(decodeURIComponent(fragment)), `Missing fragment target: ${fragment}`);
 }
 const dialog = html.match(/<dialog\b[^>]*>/i)?.[0];
 assert.ok(dialog, 'Starting-point quiz must use a native dialog');
 const labelId = dialog.match(/aria-labelledby="([^"]+)"/)?.[1];
 assert.ok(labelId && ids.has(labelId), 'Quiz needs an existing accessible title');
 assert.doesNotMatch(html, /<form\b[^>]*\baction=/i, 'Preview must not submit visitor details');
});

test('videos offer silent inline playback, posters and labelled controls', async () => {
 const html = markupOnly(await productionHomepage());
 const videos = html.match(/<video\b[^>]*>/gi) ?? [];
 assert.ok(videos.length >= 2, 'Expected hero and product media');
 for (const video of videos) {
  assert.match(video, /\bmuted(?:\s|=|>)/i);
  assert.match(video, /\bplaysinline(?:\s|=|>)/i);
  assert.match(video, /\bposter="[^"]+"/i, 'Videos need a loading fallback');
  assert.match(video, /\baria-label="[^"]+"/i);
 }
 const playControls = [...html.matchAll(/<button\b[^>]*aria-label="(?:Play|Pause) [^"]+"[^>]*>/gi)];
 assert.ok(playControls.length >= videos.length, 'Each video needs a labelled play/pause control');
 const ranges = html.match(/<input\b[^>]*type="range"[^>]*>/gi) ?? [];
 assert.ok(ranges.some(input => /aria-label="Seek [^"]+"/i.test(input)), 'Product video needs an accessible timeline');
});

test('protected areas send signed-out visitors to login', async () => {
 for (const path of ['/member/overview', '/trainer', '/admin']) {
  const response = await visit(path);
  assert.equal(response.status, 307, path);
  assert.match(response.headers.get('location'), /\/login$/);
 }
 const login = await visit('/login');
 assert.equal(login.status, 200);
 const html = await login.text();
 assert.match(html, /name="email"/);
 assert.match(html, /name="password"/);
 assert.doesNotMatch(html, /Member#2026|Admin#2026/, 'Production login must not list demo passwords by default');
});

test('each role reaches only its own dashboard', async () => {
 const member = await sessionCookie('u-member-aarav', 'member');
 const trainer = await sessionCookie('u-trainer-akif', 'trainer');
 const admin = await sessionCookie('u-admin', 'admin');
 const page = await visit('/member/overview', member);
 assert.equal(page.status, 200);
 assert.match(readableText(await page.text()), /Aarav Sharma/);
 assert.equal((await visit('/admin', member)).headers.get('location')?.endsWith('/member/overview'), true);
 assert.equal((await visit('/member/plan', trainer)).headers.get('location')?.endsWith('/trainer'), true);
 assert.match(readableText(await (await visit('/trainer', trainer)).text()), /TRAINER WORKSPACE/);
 assert.match(readableText(await (await visit('/admin', admin)).text()), /SUPER ADMIN/);
 assert.equal((await visit('/login', admin)).headers.get('location')?.endsWith('/admin'), true);
 assert.equal((await visit('/member/unknown', member)).status, 404);
});

test('forged or mismatched sessions are rejected', async () => {
 const forged = await sessionCookie('u-admin', 'admin', 'not-the-real-secret'.padEnd(48, 'y'));
 assert.match((await visit('/admin', forged)).headers.get('location') ?? '', /\/login$/);
 const wrongRole = await sessionCookie('u-member-aarav', 'admin');
 const response = await visit('/admin', wrongRole);
 assert.equal(response.status, 307, 'A role claim that does not match the stored user must not open the admin area');
 assert.match(response.headers.get('location') ?? '', /\/login$/);
});

test('live data drives the public price and the trainer’s check-in queue', async () => {
 await productionHomepage(); // creates and seeds the database
 const db = new DatabaseSync(DATABASE_PATH);
 db.prepare("update settings set value = ? where key = ?").run('INR', 'currency');
 db.prepare("update settings set value = ? where key = ?").run('7999', 'price');
 db.prepare("update clients set stage = 'Check-in due', checkin_note = ? where id = 'c-aarav'").run('Energy low · i need shorter sessions');
 db.close();
 const home = readableText(await (await fetch(baseUrl + '/')).text());
 assert.match(home, /INR\s*7,999\s*\/\s*30 days/);
 const trainer = readableText(await (await visit('/trainer', await sessionCookie('u-trainer-akif', 'trainer'))).text());
 assert.match(trainer, /Energy low · i need shorter sessions/);
 assert.doesNotMatch(trainer, /Maya R\./, 'Trainers must only receive clients assigned to them');
 const reset = new DatabaseSync(DATABASE_PATH);
 reset.prepare("update settings set value = ? where key = ?").run('AED', 'currency');
 reset.prepare("update settings set value = ? where key = ?").run('299', 'price');
 reset.close();
});

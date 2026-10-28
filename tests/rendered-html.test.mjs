import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { SignJWT } from 'jose';
import postgres from 'postgres';

// Runs against `next start` on a free port, so the proxy, layouts and server actions are exercised for real.
const SESSION_SECRET = 'test-secret-'.padEnd(48, 'x');
let server;
let baseUrl;
// Each run wipes and reseeds TEST_DATABASE_URL, so it must name a throwaway database (its name has to contain "test").
const DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!DATABASE_URL || !/test/i.test(new URL(DATABASE_URL).pathname)) throw new Error('Set TEST_DATABASE_URL to a throwaway Postgres database whose name contains "test".');
const sql = postgres(DATABASE_URL, {max: 2, onnotice: () => {}});
before(async () => {
 await sql.unsafe('drop schema public cascade; create schema public;');
 const port = await new Promise(resolve => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => resolve(p)); }); });
 baseUrl = `http://127.0.0.1:${port}`;
 server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], {env: {...process.env, SESSION_SECRET, DATABASE_URL, SEED_DEMO_DATA: 'true', SHOW_DEMO_ACCOUNTS: 'false', GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'test-secret'}, stdio: 'ignore'});
 for (let i = 0; i < 100; i++) {
  try { await fetch(baseUrl + '/'); return; } catch { await new Promise(r => setTimeout(r, 100)); }
 }
 throw new Error('next start did not respond');
});
after(async () => { server?.kill(); await sql.end(); });

let rendered;
function productionHomepage() {
 rendered ??= (async () => {
  const response = await fetch(baseUrl + '/', {headers:{accept:'text/html'}});
  assert.equal(response.status,200);
  return response.text();
 })();
 return rendered;
}
const sessionCookie = async (userId, role, secret = SESSION_SECRET, v = 0) => 'rc_session=' + await new SignJWT({userId, role, v, expiresAt: new Date(Date.now() + 864e5).toISOString()}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1d').sign(new TextEncoder().encode(secret));
const visit = (path, cookie) => fetch(baseUrl + path, {redirect:'manual', headers: cookie ? {cookie} : {}});
const markupOnly = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
const readableText = html => markupOnly(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('production opens public coaching with an optional member demo', async () => {
 const html = markupOnly(await productionHomepage());
 const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
 assert.equal(headings.length, 1, 'Public homepage needs one primary heading');
 assert.match(readableText(headings[0][1]), /stronger.*own space/i);
 assert.match(html, /<main\b[^>]*id="rc-main"/i);
 assert.match(html, /<button\b[^>]*>\s*Create your account\b/i);
 assert.doesNotMatch(readableText(html), /\b(?:demo|interactive preview|sample)\b/i, 'The public site must not describe itself as a demo');
 assert.doesNotMatch(html, /rc-preview-bar/, 'The preview strip has been removed');
 assert.doesNotMatch(html, /class="(?:sidebar|topbar)"/, 'Member workspace must not replace the public first view');
 assert.doesNotMatch(readableText(html), /ThriveMotion|Your site is taking shape/);
});

test('pilot preserves confirmed scope and distinguishes future services', async () => {
 const text = readableText(await productionHomepage());
 assert.match(text, /AED\s*299\s*\/\s*30 days/);
 assert.match(text, /10\s+adults in the\s+first India cohort/);
 assert.match(text, /Adults 18\+/);
  assert.match(text, /Weekly trainer follow-ups/);
 assert.match(text, /Manual payment, verified by the team/);
 assert.match(text, /personalised nutrition plans are not currently part of the confirmed pilot package/);
 assert.doesNotMatch(text, /psycholog|counsel|therap/i, 'The psychologist service has been withdrawn');
 assert.match(text, /How do I join\?/);
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

test('navigation links refer to existing local targets', async () => {
 const html = markupOnly(await productionHomepage());
 const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
 const fragments = [...html.matchAll(/<a\b[^>]*\bhref="#([^"]*)"/gi)].map(match => match[1]);
 assert.ok(fragments.length > 0, 'Expected local feature navigation');
 for (const fragment of fragments) {
  assert.ok(fragment.length > 0, 'Empty hash links have no named target');
  assert.ok(ids.has(decodeURIComponent(fragment)), `Missing fragment target: ${fragment}`);
 }
 assert.doesNotMatch(html, /<dialog\b/i, 'Starting point is a page (/register), not a modal');
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
 await sql`update settings set value = '7999' where key = 'price'`;
 await sql`update clients set stage = 'Check-in due', checkin_note = 'Energy low · i need shorter sessions' where id = 'c-aarav'`;
 const home = readableText(await (await fetch(baseUrl + '/')).text());
 assert.match(home, /AED\s*7,999\s*\/\s*30 days/);
 const trainer = readableText(await (await visit('/trainer', await sessionCookie('u-trainer-akif', 'trainer'))).text());
 assert.match(trainer, /Energy low · i need shorter sessions/);
 assert.doesNotMatch(trainer, /Maya R\./, 'Trainers must only receive clients assigned to them');
 await sql`update settings set value = '299' where key = 'price'`;
});

// Monday of the current week in India time, matching lib/dates.ts.
function istWeekStart() {
 const now = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Kolkata'}));
 return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))).toISOString().slice(0, 10);
}

test('admin can open a client detail page; other roles cannot', async () => {
 const admin = await sessionCookie('u-admin', 'admin');
 const page = await visit('/admin/clients/c-maya', admin);
 assert.equal(page.status, 200);
 const text = readableText(await page.text());
 assert.match(text, /Maya R\./);
 assert.match(text, /maya@example\.com/);
 assert.match(text, /UPI-48213/);
 assert.equal((await visit('/admin/clients/does-not-exist', admin)).status, 404);
 assert.match((await visit('/admin/clients/c-maya', await sessionCookie('u-trainer-akif', 'trainer'))).headers.get('location') ?? '', /\/trainer$/);
 const overview = readableText(await (await visit('/admin', admin)).text());
 assert.match(overview, /Trainer performance/);
});

test('Google sign-in starts with state and PKCE and refuses a forged return', async () => {
 assert.match(await (await visit('/login')).text(), /Continue with Google/);
 const start = await visit('/api/auth/google');
 assert.equal(start.status, 307);
 const target = new URL(start.headers.get('location'));
 assert.equal(target.host, 'accounts.google.com');
 assert.equal(target.searchParams.get('client_id'), 'test-client.apps.googleusercontent.com');
 assert.equal(target.searchParams.get('code_challenge_method'), 'S256');
 assert.ok(target.searchParams.get('state') && target.searchParams.get('nonce'));
 assert.match(start.headers.get('set-cookie') ?? '', /rc_google_oauth=.*HttpOnly/i);
 const forged = await visit('/api/auth/google/callback?code=abc&state=wrong');
 assert.match(forged.headers.get('location') ?? '', /\/login\?error=google_failed$/);
});

test('a trainer’s schedule and meeting link reach the member’s plan', async () => {
 await productionHomepage();
 const week = istWeekStart();
 await sql`delete from workout_plans where client_id = 'c-aarav'`;
 for (let day = 0; day < 7; day++) {
  await sql`insert into workout_plans (client_id, week_start, day, title, exercises, start_time, duration_min, meeting_url, updated_by)
   values ('c-aarav', ${week}, ${day}, 'Lower body strength', ${'Goblet squat · 3 × 10\nGlute bridge · 3 × 12'}, '18:30', 35, 'https://meet.google.com/abc-defg-hij', 'u-trainer-akif')`;
 }
 await sql`update clients set meeting_url = 'https://zoom.us/j/123456' where id = 'c-aarav'`;
 const member = await sessionCookie('u-member-aarav', 'member');
 const plan = await (await visit('/member/plan', member)).text();
 assert.match(readableText(plan), /Lower body strength/);
 assert.match(readableText(plan), /Goblet squat · 3 × 10/);
 assert.match(plan, /href="https:\/\/meet\.google\.com\/abc-defg-hij"/);
 assert.match(await (await visit('/member/profile', member)).text(), /href="https:\/\/zoom\.us\/j\/123456"/);
 const trainer = readableText(await (await visit('/trainer/clients/c-aarav', await sessionCookie('u-trainer-akif', 'trainer'))).text());
 assert.match(trainer, /Sessions this week/);
 assert.match(trainer, /Workout plan/);
 assert.match(trainer, /nutrition plan/i);
});

test('members see their rank, score and streak on the leaderboard', async () => {
 const member = await sessionCookie('u-member-aarav', 'member');
 const text = readableText(await (await visit('/member/leaderboard', member)).text());
 assert.match(text, /YOUR RANK/);
 assert.match(text, /Aarav S\. · you/);
});

test('trainers open only their own clients’ detail pages', async () => {
 const trainer = await sessionCookie('u-trainer-akif', 'trainer');
 const page = await visit('/trainer/clients/c-kabir', trainer);
 assert.equal(page.status, 200);
 const text = readableText(await page.text());
 assert.match(text, /Kabir M\./);
 assert.doesNotMatch(text, /Deactivate/, 'Trainers must not see admin account controls');
 assert.equal((await visit('/trainer/clients/c-maya', trainer)).status, 404, 'Unassigned clients are not visible to a trainer');
 assert.equal((await visit('/trainer/clients/c-kabir', await sessionCookie('u-trainer-2', 'trainer'))).status, 404);
});

test('deactivating an account ends its existing sessions', async () => {
 await productionHomepage();
 const member = await sessionCookie('u-member-kabir', 'member');
 assert.equal((await visit('/member/overview', member)).status, 200);
 await sql`update users set active = false, session_version = session_version + 1 where id = 'u-member-kabir'`;
 assert.match((await visit('/member/overview', member)).headers.get('location') ?? '', /\/login$/);
 await sql`update users set active = true where id = 'u-member-kabir'`;
 assert.match((await visit('/member/overview', member)).headers.get('location') ?? '', /\/login$/, 'An old cookie stays revoked after reactivation');
 assert.equal((await visit('/member/overview', await sessionCookie('u-member-kabir', 'member', SESSION_SECRET, 1))).status, 200);
});

test('responses carry security headers', async () => {
 const response = await visit('/login');
 assert.equal(response.headers.get('x-frame-options'), 'DENY');
 assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
 assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
 assert.equal(response.headers.get('x-powered-by'), null);
});

// Submits a server-action form the way a browser without JavaScript would.
async function submitForm(path, fields, ip = '10.20.30.40', cookie) {
 const html = await (await fetch(baseUrl + path, {headers: cookie ? {cookie} : {}})).text();
 const form = html.match(/<form[^>]*>[\s\S]*?<\/form>/)[0];
 const body = new FormData();
 for (const m of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
  const name = m[0].match(/name="([^"]+)"/)?.[1];
  if (name) body.append(name, (m[0].match(/value="([^"]*)"/)?.[1] ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
 }
 for (const [k, v] of Object.entries(fields)) body.append(k, v);
 return fetch(baseUrl + path, {method: 'POST', body, redirect: 'manual', headers: {origin: baseUrl, 'x-forwarded-for': ip, ...(cookie ? {cookie} : {})}});
}

test('visitors register, answer the onboarding questions, and staff see their answers', async () => {
 const page = await visit('/register');
 assert.equal(page.status, 200);
 const html = await page.text();
 for (const name of ['name', 'email', 'password', 'adult']) assert.match(html, new RegExp(`name="${name}"`), name);
 const fields = {name: 'Lina Haddad', email: 'lina@example.com', phone: '+971 50 000 0000', password: 'LinaPass#2026'};
 const refused = await submitForm('/register', fields);
 assert.equal(refused.headers.get('set-cookie')?.includes('rc_session='), undefined, 'The adult confirmation is required');
 const created = await submitForm('/register', {...fields, adult: 'on'});
 const cookie = (created.headers.get('set-cookie') ?? '').match(/rc_session=[^;]+/)?.[0];
 assert.ok(cookie, 'Registration signs the member in');
 assert.match(created.headers.get('location') ?? created.headers.get('x-action-redirect') ?? '', /\/onboarding/);
 // Until the questions are answered the dashboard sends them back to onboarding.
 assert.match((await visit('/member/overview', cookie)).headers.get('location') ?? '', /\/onboarding$/);
 const onboarding = await visit('/onboarding', cookie);
 assert.equal(onboarding.status, 200);
 assert.doesNotMatch(await onboarding.text(), /<dialog\b/i, 'Onboarding is a page, not a modal');
 const answered = await submitForm('/onboarding', {goal: 'Improve mobility', place: 'At a gym', days: '2 days a week'}, undefined, cookie);
 assert.match(answered.headers.get('location') ?? answered.headers.get('x-action-redirect') ?? '', /\/member\/overview/);
 const [client] = await sql`select c.id, c.stage, c.goal, c.intake, u.role from clients c join users u on u.id = c.user_id where c.email = 'lina@example.com'`;
 assert.equal(client.role, 'member');
 assert.equal(client.stage, 'Payment review');
 assert.equal(client.goal, 'Improve mobility');
 assert.deepEqual(client.intake, {place: 'At a gym', days: '2 days a week'});
 assert.match((await visit('/onboarding', cookie)).headers.get('location') ?? '', /\/member\/overview$/, 'Onboarding is asked once');
 const detail = readableText(await (await visit(`/admin/clients/${client.id}`, await sessionCookie('u-admin', 'admin'))).text());
 assert.match(detail, /At a gym · 2 days a week/);
 const again = await submitForm('/register', {...fields, adult: 'on'}, '10.20.30.41');
 assert.match(await again.text(), /already exists/);
 assert.match((await visit('/register', await sessionCookie('u-member-aarav', 'member'))).headers.get('location') ?? '', /\/member\/overview$/);
});

test('members without a schedule see no invented workouts', async () => {
 const [{session_version: v}] = await sql`select session_version from users where id = 'u-member-kabir'`;
 const member = await sessionCookie('u-member-kabir', 'member', SESSION_SECRET, v);
 const plan = readableText(await (await visit('/member/plan', member)).text());
 assert.match(plan, /Your plan is on its way/);
 for (const path of ['/member/overview', '/member/plan', '/member/progress', '/member/leaderboard', '/member/profile', '/member/nutrition']) {
  // Email addresses are ignored: the seeded test accounts live on repcount.demo.
  const text = readableText(await (await visit(path, member)).text()).replace(/\S+@\S+/g, '');
  assert.doesNotMatch(text, /\b(?:demo|sample|preview|illustrative)\b/i, path);
 }
});

import "server-only";
import postgres from "postgres";
import {hashPassword} from "./passwords";
import {istToday} from "./dates";

/*
 * Postgres store (Neon in production, any Postgres locally). Set DATABASE_URL to the connection string.
 * The schema is created on first use, under an advisory lock so concurrent cold starts don't race.
 */
type Sql = postgres.Sql;
const globalForDb = globalThis as unknown as {repcountSql?: Sql; repcountReady?: Promise<Sql>};

function connect(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL must be set to a Postgres connection string (see .env.example).");
  // Serverless functions each hold one connection; Neon's pooler multiplexes them.
  return postgres(url, {max: process.env.VERCEL ? 1 : 10, idle_timeout: 20, prepare: false, onnotice: () => {}});
}

const schema = `
  create table if not exists users (
    id text primary key,
    email text not null unique,
    name text not null,
    initials text not null,
    role text not null check (role in ('member', 'trainer', 'admin')),
    password_hash text,
    title text,
    capacity integer not null default 8,
    active boolean not null default true,
    session_version integer not null default 0,
    created_at timestamptz not null default now()
  );
  create table if not exists clients (
    id text primary key,
    user_id text unique references users(id) on delete set null,
    name text not null,
    initials text not null,
    stage text not null check (stage in ('Active', 'Onboarding', 'Check-in due', 'Payment review')),
    trainer_id text references users(id) on delete set null,
    paid boolean not null default false,
    progress integer not null default 0 check (progress between 0 and 100),
    goal text not null,
    last_workout_on date,
    next_checkin text not null default '—',
    payment_reference text,
    checkin_note text,
    email text,
    phone text,
    joined_on date,
    meeting_url text
  );
  create index if not exists clients_trainer_idx on clients (trainer_id);
  alter table clients add column if not exists intake jsonb;
  create table if not exists member_state (
    user_id text primary key references users(id) on delete cascade,
    data jsonb not null,
    updated_at timestamptz not null default now()
  );
  create table if not exists member_history (
    user_id text not null references users(id) on delete cascade,
    period text not null check (period in ('day', 'week')),
    period_start date not null,
    data jsonb not null,
    primary key (user_id, period, period_start)
  );
  create table if not exists settings (
    key text primary key,
    value text not null
  );
  create table if not exists workout_plans (
    client_id text not null references clients(id) on delete cascade,
    week_start date not null,
    day integer not null check (day between 0 and 6),
    title text not null,
    exercises text not null default '',
    start_time text,
    duration_min integer,
    meeting_url text,
    updated_by text not null,
    updated_at timestamptz not null default now(),
    primary key (client_id, week_start, day)
  );
  create table if not exists audit_log (
    id bigserial primary key,
    actor_id text not null,
    action text not null,
    detail text not null,
    subject_id text,
    created_at timestamptz not null default now()
  );
  create index if not exists audit_subject_idx on audit_log (subject_id);
  create table if not exists messages (
    id bigserial primary key,
    client_id text not null references clients(id) on delete cascade,
    author_id text not null,
    body text not null,
    created_at timestamptz not null default now()
  );
  create index if not exists messages_client_idx on messages (client_id, id desc);
  create table if not exists login_attempts (
    key text primary key,
    count integer not null,
    since timestamptz not null
  );
`;

async function prepare(sql: Sql) {
  await sql.begin(async tx => {
    await tx`select pg_advisory_xact_lock(74283015)`;
    await tx.unsafe(schema);
    await tx`insert into settings (key, value) values ('price', '299'), ('cohortSize', '10') on conflict (key) do nothing`;
    const [{n}] = await tx<{n: number}[]>`select count(*)::int as n from users`;
    if (n === 0 && process.env.SEED_DEMO_DATA === "true") await seedDemo(tx);
    await bootstrapAdmin(tx);
  });
  return sql;
}

/** Creates the first super admin from ADMIN_EMAIL (Google sign-in) and optional ADMIN_PASSWORD. */
async function bootstrapAdmin(tx: postgres.TransactionSql) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return;
  const password = process.env.ADMIN_PASSWORD;
  await tx`insert into users (id, email, name, initials, role, password_hash) values
    ('u-admin-owner', ${email}, 'Super admin', 'SA', 'admin', ${password && password.length >= 10 ? hashPassword(password) : null})
    on conflict (email) do nothing`;
}

/* Sample cohort for demos and tests. Only seeded into an empty database when SEED_DEMO_DATA=true. */
async function seedDemo(tx: postgres.TransactionSql) {
  const {day} = istToday();
  const daysAgo = (n: number) => new Date(Date.parse(`${day}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
  await tx`insert into users (id, email, name, initials, role, password_hash, title, capacity) values
    ('u-member-aarav', 'member@repcount.demo', 'Aarav Sharma', 'AS', 'member',
      'scrypt$c5ff526594572bdfcfc0ae2ba014ab22$49b989bc456162781422a636f7053ce85452bcf626399fd08df085fa275a371cf77ce80cf693f6c06feb0188577eb49648a238285a5efccdc88f7f0ecca779ca', null, 0),
    ('u-trainer-akif', 'trainer@repcount.demo', 'Akif', 'AK', 'trainer',
      'scrypt$6ebef398eb7a1f3161834274286b35aa$6f910a5e62dc9e998b1ec751ee3b7d921b4e14391be11739279c34b7c843cdbf470c26dfb338873dc2d6c8c588a3d7e709b209d72fdc0ac6367daa97a21f9fd1', 'Lead trainer', 8),
    ('u-trainer-2', 'trainer2@repcount.demo', 'Trainer 2', 'T2', 'trainer', ${hashPassword("Trainer2#2026")}, 'Trainer', 6),
    ('u-member-kabir', 'member2@repcount.demo', 'Kabir Mehta', 'KM', 'member', ${hashPassword("Member2#2026")}, null, 0),
    ('u-admin', 'admin@repcount.demo', 'Super admin', 'SA', 'admin',
      'scrypt$3194d72b53ac3e0bee2609720b21d39e$e7fbb376a4ba1825a80dfef40b4b20e571e35c4a853a5311011206e8d71d6c0f48799c4b476ed11699374f8c5c01170946bbea52b3554b938746d4b29ad27a71', null, 0)`;
  const clients: [string, string | null, string, string, string, string | null, boolean, number, string, string | null, string, string | null, string, string, string][] = [
    ["c-aarav", "u-member-aarav", "Aarav S.", "AS", "Active", "u-trainer-akif", true, 75, "Build strength", daysAgo(1), "Fri · 6:00 PM", null, "member@repcount.demo", "+91 98200 11111", daysAgo(12)],
    ["c-maya", null, "Maya R.", "MR", "Payment review", null, false, 0, "Consistent routine", null, "After activation", "UPI-48213", "maya@example.com", "+91 98200 22222", daysAgo(7)],
    ["c-riya", null, "Riya K.", "RK", "Onboarding", null, true, 0, "Confidence exercising", null, "Onboarding call", null, "riya@example.com", "+91 98200 33333", daysAgo(9)],
    ["c-kabir", "u-member-kabir", "Kabir M.", "KM", "Check-in due", "u-trainer-akif", true, 50, "Lose body fat", daysAgo(3), "Today · 7:30 PM", null, "member2@repcount.demo", "+91 98200 44444", daysAgo(12)],
    ["c-neha", null, "Neha P.", "NP", "Active", "u-trainer-akif", true, 100, "Improve mobility", daysAgo(0), "Sat · 10:00 AM", null, "neha@example.com", "+91 98200 55555", daysAgo(12)],
  ];
  for (const [id, userId, name, initials, stage, trainerId, paid, progress, goal, lastWorkout, nextCheckin, reference, email, phone, joined] of clients) {
    await tx`insert into clients (id, user_id, name, initials, stage, trainer_id, paid, progress, goal, last_workout_on, next_checkin, payment_reference, email, phone, joined_on)
      values (${id}, ${userId}, ${name}, ${initials}, ${stage}, ${trainerId}, ${paid}, ${progress}, ${goal}, ${lastWorkout}, ${nextCheckin}, ${reference}, ${email}, ${phone}, ${joined})`;
  }
  // A few dated weigh-ins so the demo member's progress charts have a history.
  const weights = [78.4, 78.2, 78.1, 77.8, 77.7].map((value, i) => ({label: daysAgo(10 - i * 2), value}));
  const fats = [27.0, 26.9, 26.9, 26.7, 26.6].map((value, i) => ({label: daysAgo(10 - i * 2), value}));
  await tx`insert into member_state (user_id, data) values ('u-member-aarav', ${tx.json({tracker: {weights, fats}})})`;
}

/** The ready-to-use connection; the first call creates the schema. */
export function db(): Promise<Sql> {
  globalForDb.repcountSql ??= connect();
  globalForDb.repcountReady ??= prepare(globalForDb.repcountSql).catch(error => {
    globalForDb.repcountReady = undefined;
    throw error;
  });
  return globalForDb.repcountReady;
}

import "server-only";
import {mkdirSync} from "node:fs";
import {dirname, join} from "node:path";
import type {DatabaseSync as Database} from "node:sqlite";

// Loaded at runtime: bundlers do not all recognise node:sqlite as a Node built-in yet.
const {DatabaseSync} = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");
type DatabaseSync = Database;

/*
 * Local SQLite store (Node's built-in node:sqlite). One file, created and seeded on first use.
 * Suits local development and a single Node server. For serverless hosting or real clients,
 * move these tables to the Neon Postgres project described in ACCOUNT-SETUP.md.
 */
// Vercel's filesystem is read-only except /tmp, which is per-instance and cleared on cold starts.
const path = process.env.DATABASE_PATH
  || (process.env.VERCEL ? "/tmp/repcount.db" : join(/*turbopackIgnore: true*/ process.cwd(), "data", "repcount.db"));

const globalForDb = globalThis as unknown as {repcountDb?: DatabaseSync};

function open() {
  mkdirSync(dirname(path), {recursive: true});
  const db = new DatabaseSync(path);
  db.exec(`
    pragma journal_mode = wal;
    pragma foreign_keys = on;
    create table if not exists clients (
      id text primary key,
      user_id text unique,
      name text not null,
      initials text not null,
      stage text not null check (stage in ('Active', 'Onboarding', 'Check-in due', 'Payment review')),
      trainer text not null default 'Unassigned',
      paid integer not null default 0,
      progress integer not null default 0 check (progress between 0 and 100),
      goal text not null,
      last_workout text not null default '—',
      next_checkin text not null default '—',
      payment_reference text,
      checkin_note text
    );
    create table if not exists member_state (
      user_id text primary key,
      data text not null,
      updated_at text not null default (datetime('now'))
    );
    create table if not exists settings (
      key text primary key,
      value text not null
    );
    create table if not exists users (
      id text primary key,
      email text not null unique,
      name text not null unique,
      initials text not null,
      role text not null check (role in ('member', 'trainer', 'admin')),
      password_hash text,
      title text,
      capacity integer not null default 8,
      created_at text not null default (datetime('now'))
    );
    create table if not exists workout_plans (
      client_id text not null references clients(id) on delete cascade,
      week_start text not null,
      day integer not null check (day between 0 and 6),
      title text not null,
      exercises text not null default '',
      start_time text,
      duration_min integer,
      meeting_url text,
      updated_by text not null,
      updated_at text not null default (datetime('now')),
      primary key (client_id, week_start, day)
    );
    create table if not exists audit_log (
      id integer primary key autoincrement,
      actor_id text not null,
      action text not null,
      detail text not null,
      created_at text not null default (datetime('now'))
    );
  `);
  migrate(db);
  const seeded = db.prepare("select count(*) as n from clients").get() as {n: number};
  if (seeded.n === 0) seed(db);
  fillSampleContacts(db);
  const hasUsers = db.prepare("select count(*) as n from users").get() as {n: number};
  if (hasUsers.n === 0) seedUsers(db);
  return db;
}

/** Adds columns introduced after a database was first created. */
function migrate(db: DatabaseSync) {
  const columns = (table: string) => (db.prepare(`pragma table_info(${table})`).all() as {name: string}[]).map(c => c.name);
  const clientColumns = columns("clients");
  for (const [name, type] of [["email", "text"], ["phone", "text"], ["joined_on", "text"], ["meeting_url", "text"]]) {
    if (!clientColumns.includes(name)) db.exec(`alter table clients add column ${name} ${type}`);
  }
  if (!columns("audit_log").includes("subject_id")) db.exec("alter table audit_log add column subject_id text");
}

/** Contact details for the sample cohort (no-op once filled in). */
function fillSampleContacts(db: DatabaseSync) {
  const contact = db.prepare("update clients set email = coalesce(email, ?), phone = coalesce(phone, ?), joined_on = coalesce(joined_on, ?) where id = ?");
  for (const [id, email, phone, joined] of [
    ["c-aarav", "member@repcount.demo", "+91 98200 11111", "2026-10-15"],
    ["c-maya", "maya@example.com", "+91 98200 22222", "2026-10-20"],
    ["c-riya", "riya@example.com", "+91 98200 33333", "2026-10-18"],
    ["c-kabir", "kabir@example.com", "+91 98200 44444", "2026-10-15"],
    ["c-neha", "neha@example.com", "+91 98200 55555", "2026-10-15"],
  ]) contact.run(email, phone, joined, id);
}

/* Demo sign-ins. Passwords are stored only as salted scrypt hashes; Trainer 2 has none and signs in with Google. */
function seedUsers(db: DatabaseSync) {
  const insert = db.prepare("insert into users (id, email, name, initials, role, password_hash, title, capacity) values (?, ?, ?, ?, ?, ?, ?, ?)");
  insert.run("u-member-aarav", "member@repcount.demo", "Aarav Sharma", "AS", "member",
    "scrypt$c5ff526594572bdfcfc0ae2ba014ab22$49b989bc456162781422a636f7053ce85452bcf626399fd08df085fa275a371cf77ce80cf693f6c06feb0188577eb49648a238285a5efccdc88f7f0ecca779ca", null, 0);
  insert.run("u-trainer-akif", "trainer@repcount.demo", "Akif", "AK", "trainer",
    "scrypt$6ebef398eb7a1f3161834274286b35aa$6f910a5e62dc9e998b1ec751ee3b7d921b4e14391be11739279c34b7c843cdbf470c26dfb338873dc2d6c8c588a3d7e709b209d72fdc0ac6367daa97a21f9fd1", "Lead trainer", 8);
  insert.run("u-trainer-2", "trainer2@repcount.demo", "Trainer 2", "T2", "trainer", null, "Trainer", 6);
  insert.run("u-admin", "admin@repcount.demo", "Super admin", "SA", "admin",
    "scrypt$3194d72b53ac3e0bee2609720b21d39e$e7fbb376a4ba1825a80dfef40b4b20e571e35c4a853a5311011206e8d71d6c0f48799c4b476ed11699374f8c5c01170946bbea52b3554b938746d4b29ad27a71", null, 0);
}

function seed(db: DatabaseSync) {
  const insert = db.prepare(`insert into clients (id, user_id, name, initials, stage, trainer, paid, progress, goal, last_workout, next_checkin, payment_reference)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const rows: [string, string | null, string, string, string, string, number, number, string, string, string, string | null][] = [
    ["c-aarav", "u-member-aarav", "Aarav S.", "AS", "Active", "Akif", 1, 75, "Build strength", "Yesterday", "Fri · 6:00 PM", null],
    ["c-maya", null, "Maya R.", "MR", "Payment review", "Unassigned", 0, 0, "Consistent routine", "—", "After activation", "UPI-48213"],
    ["c-riya", null, "Riya K.", "RK", "Onboarding", "Unassigned", 1, 0, "Confidence exercising", "—", "Onboarding call", null],
    ["c-kabir", null, "Kabir M.", "KM", "Check-in due", "Akif", 1, 50, "Lose body fat", "3 days ago", "Today · 7:30 PM", null],
    ["c-neha", null, "Neha P.", "NP", "Active", "Akif", 1, 100, "Improve mobility", "Today", "Sat · 10:00 AM", null],
  ];
  for (const row of rows) insert.run(...row);
  const setting = db.prepare("insert or ignore into settings (key, value) values (?, ?)");
  for (const [key, value] of Object.entries({price: "299", currency: "AED", cohortSize: "10"})) setting.run(key, value);
}

export function db() {
  globalForDb.repcountDb ??= open();
  return globalForDb.repcountDb;
}

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
const path = process.env.DATABASE_PATH || join(/*turbopackIgnore: true*/ process.cwd(), "data", "repcount.db");

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
    create table if not exists audit_log (
      id integer primary key autoincrement,
      actor_id text not null,
      action text not null,
      detail text not null,
      created_at text not null default (datetime('now'))
    );
  `);
  const seeded = db.prepare("select count(*) as n from clients").get() as {n: number};
  if (seeded.n === 0) seed(db);
  return db;
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

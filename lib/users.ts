import "server-only";
import {randomBytes} from "node:crypto";
import {db} from "./db";
import {dummyHash, hashPassword, passwordMatches} from "./passwords";
import type {Role} from "./roles";

export type User = {id: string; email: string; name: string; initials: string; role: Role; sessionVersion: number};
export type Trainer = User & {title: string; capacity: number; canUsePassword: boolean; active: boolean; createdAt: string};
type Row = {id: string; email: string; name: string; initials: string; role: Role; password_hash: string | null; title: string | null; capacity: number; active: boolean; session_version: number; created_at: Date};

const publicUser = ({id, email, name, initials, role, session_version}: Row): User => ({id, email, name, initials, role, sessionVersion: session_version});

async function byEmail(email: string) {
  const sql = await db();
  const [row] = await sql<Row[]>`select * from users where email = ${email.trim().toLowerCase()}`;
  return row;
}

export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const found = await byEmail(email);
  const ok = passwordMatches(password, found?.password_hash ?? dummyHash);
  return found?.password_hash && found.active && ok ? publicUser(found) : null;
}

/** Active users only: a deactivated account can no longer open any area. */
export async function findUser(id: string): Promise<User | null> {
  const sql = await db();
  const [row] = await sql<Row[]>`select * from users where id = ${id} and active`;
  return row ? publicUser(row) : null;
}

/** Google sign-in only admits active people the team has already added. */
export async function findUserByEmail(email: string): Promise<User | null> {
  const found = await byEmail(email);
  return found?.active ? publicUser(found) : null;
}

export async function listTrainers(): Promise<Trainer[]> {
  const sql = await db();
  const rows = await sql<Row[]>`select * from users where role = 'trainer' order by created_at, name`;
  return rows.map(r => ({...publicUser(r), title: r.title ?? "Trainer", capacity: r.capacity, canUsePassword: r.password_hash !== null, active: r.active, createdAt: r.created_at.toISOString()}));
}

export const initialsOf = (name: string, fallback: string) => name.split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || fallback;

export async function createUser(input: {role: Role; name: string; email: string; password: string | null; title?: string; capacity?: number}) {
  const sql = await db();
  const id = `u-${input.role}-${randomBytes(6).toString("hex")}`;
  await sql`insert into users (id, email, name, initials, role, password_hash, title, capacity)
    values (${id}, ${input.email.trim().toLowerCase()}, ${input.name.trim()}, ${initialsOf(input.name, input.role === "trainer" ? "TR" : "RC")}, ${input.role},
      ${input.password ? hashPassword(input.password) : null}, ${input.title ?? null}, ${input.capacity ?? 0})`;
  return id;
}

export async function emailTaken(email: string) {
  return !!(await byEmail(email));
}

/** Deactivating also bumps the session version, which signs the person out everywhere. */
export async function setUserActive(id: string, active: boolean) {
  const sql = await db();
  const [row] = await sql<{name: string}[]>`update users set active = ${active}, session_version = session_version + 1 where id = ${id} and role <> 'admin' returning name`;
  return row?.name ?? null;
}

/*
 * Shared sign-in limiter, stored in Postgres so it holds across server instances.
 * Each key allows a number of failures per 15 minutes; the per-email key cannot be dodged by changing IP.
 */
export async function loginLimited(limits: [key: string, max: number][]) {
  const sql = await db();
  const rows = await sql<{key: string; count: number}[]>`select key, count from login_attempts where key in ${sql(limits.map(([key]) => key))} and since > now() - interval '15 minutes'`;
  return limits.some(([key, max]) => (rows.find(r => r.key === key)?.count ?? 0) >= max);
}

export async function recordLoginFailure(keys: string[]) {
  const sql = await db();
  for (const key of keys) {
    await sql`insert into login_attempts (key, count, since) values (${key}, 1, now())
      on conflict (key) do update set
        count = case when login_attempts.since < now() - interval '15 minutes' then 1 else login_attempts.count + 1 end,
        since = case when login_attempts.since < now() - interval '15 minutes' then now() else login_attempts.since end`;
  }
}

export async function clearLoginFailures(keys: string[]) {
  const sql = await db();
  await sql`delete from login_attempts where key in ${sql(keys)}`;
}

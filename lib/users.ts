import "server-only";
import {randomBytes, scryptSync, timingSafeEqual} from "node:crypto";
import {db} from "./db";
import type {Role} from "./roles";

export type User = {id: string; email: string; name: string; initials: string; role: Role};
export type Trainer = User & {title: string; capacity: number; canUsePassword: boolean; createdAt: string};
type Row = {id: string; email: string; name: string; initials: string; role: Role; password_hash: string | null; title: string | null; capacity: number; created_at: string};

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const dummyHash = "scrypt$00000000000000000000000000000000$" + "0".repeat(128);

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

function passwordMatches(password: string, stored: string) {
  const [, salt, hex] = stored.split("$");
  const expected = Buffer.from(hex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

// node:sqlite rows have a null prototype; always copy into plain objects.
const publicUser = ({id, email, name, initials, role}: Row): User => ({id, email, name, initials, role});
const byEmail = (email: string) => db().prepare("select * from users where email = ?").get(email.trim().toLowerCase()) as Row | undefined;

export function verifyCredentials(email: string, password: string): User | null {
  const found = byEmail(email);
  const ok = passwordMatches(password, found?.password_hash ?? dummyHash);
  return found?.password_hash && ok ? publicUser(found) : null;
}

export function findUser(id: string): User | null {
  const found = db().prepare("select * from users where id = ?").get(id) as Row | undefined;
  return found ? publicUser(found) : null;
}

/** Google sign-in only admits people the team has already added. */
export function findUserByEmail(email: string): User | null {
  const found = byEmail(email);
  return found ? publicUser(found) : null;
}

export function listTrainers(): Trainer[] {
  const rows = db().prepare("select * from users where role = 'trainer' order by created_at, name").all() as Row[];
  return rows.map(r => ({...publicUser(r), title: r.title ?? "Trainer", capacity: r.capacity, canUsePassword: r.password_hash !== null, createdAt: r.created_at}));
}

export function createTrainer(input: {name: string; email: string; capacity: number; title: string; password: string | null}) {
  const initials = input.name.split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "TR";
  const id = `u-trainer-${randomBytes(6).toString("hex")}`;
  db().prepare("insert into users (id, email, name, initials, role, password_hash, title, capacity) values (?, ?, ?, ?, 'trainer', ?, ?, ?)")
    .run(id, input.email.trim().toLowerCase(), input.name.trim(), initials, input.password ? hashPassword(input.password) : null, input.title, input.capacity);
  return id;
}

export function emailOrNameTaken(email: string, name: string) {
  return !!db().prepare("select 1 from users where email = ? or lower(name) = lower(?)").get(email.trim().toLowerCase(), name.trim());
}

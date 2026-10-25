import "server-only";
import {scryptSync, timingSafeEqual} from "node:crypto";
import type {Role} from "./roles";

export type User = {id: string; email: string; name: string; initials: string; role: Role};
type StoredUser = User & {passwordHash: string};

/*
 * Demo account store. Passwords are stored only as salted scrypt hashes.
 * Replace this module with the Neon-backed user lookup (see ACCOUNT-SETUP.md)
 * before real clients are invited; the rest of the auth flow stays the same.
 */
const users: StoredUser[] = [
  {id: "u-member-aarav", email: "member@repcount.demo", name: "Aarav Sharma", initials: "AS", role: "member",
    passwordHash: "scrypt$c5ff526594572bdfcfc0ae2ba014ab22$49b989bc456162781422a636f7053ce85452bcf626399fd08df085fa275a371cf77ce80cf693f6c06feb0188577eb49648a238285a5efccdc88f7f0ecca779ca"},
  {id: "u-trainer-akif", email: "trainer@repcount.demo", name: "Akif", initials: "AK", role: "trainer",
    passwordHash: "scrypt$6ebef398eb7a1f3161834274286b35aa$6f910a5e62dc9e998b1ec751ee3b7d921b4e14391be11739279c34b7c843cdbf470c26dfb338873dc2d6c8c588a3d7e709b209d72fdc0ac6367daa97a21f9fd1"},
  {id: "u-admin", email: "admin@repcount.demo", name: "Super admin", initials: "SA", role: "admin",
    passwordHash: "scrypt$3194d72b53ac3e0bee2609720b21d39e$e7fbb376a4ba1825a80dfef40b4b20e571e35c4a853a5311011206e8d71d6c0f48799c4b476ed11699374f8c5c01170946bbea52b3554b938746d4b29ad27a71"},
];

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const dummyHash = "scrypt$00000000000000000000000000000000$" + "0".repeat(128);

function passwordMatches(password: string, stored: string) {
  const [, salt, hex] = stored.split("$");
  const expected = Buffer.from(hex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

function publicUser({id, email, name, initials, role}: StoredUser): User {
  return {id, email, name, initials, role};
}

export function verifyCredentials(email: string, password: string): User | null {
  const found = users.find(u => u.email === email.trim().toLowerCase());
  const ok = passwordMatches(password, found?.passwordHash ?? dummyHash);
  return found && ok ? publicUser(found) : null;
}

export function findUser(id: string): User | null {
  const found = users.find(u => u.id === id);
  return found ? publicUser(found) : null;
}

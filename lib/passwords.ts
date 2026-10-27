import "server-only";
import {randomBytes, scryptSync, timingSafeEqual} from "node:crypto";

// Compared against when the email is unknown, so response time does not reveal which emails exist.
export const dummyHash = "scrypt$00000000000000000000000000000000$" + "0".repeat(128);

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

export function passwordMatches(password: string, stored: string) {
  const [, salt, hex] = stored.split("$");
  const expected = Buffer.from(hex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

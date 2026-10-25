"use server";

import {cookies, headers} from "next/headers";
import {redirect} from "next/navigation";
import {SESSION_COOKIE} from "@/lib/session";
import {startSession} from "@/lib/dal";
import {verifyCredentials} from "@/lib/users";
import {roleHome} from "@/lib/roles";

export type LoginState = {error?: string; email?: string} | undefined;

/*
 * In-memory attempt limiter: 5 failures per email+IP in 15 minutes.
 * Per server instance only; move to a shared store when running several instances.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const failures = new Map<string, {count: number; since: number}>();

function limited(key: string) {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.since > WINDOW_MS) return false;
  return entry.count >= MAX_FAILURES;
}
function recordFailure(key: string) {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.since > WINDOW_MS) failures.set(key, {count: 1, since: Date.now()});
  else entry.count++;
}

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return {error: "Enter a valid email address.", email};
  if (!password || password.length > 200) return {error: "Enter your password.", email};

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${email}|${ip}`;
  if (limited(key)) return {error: "Too many attempts. Please wait 15 minutes and try again.", email};

  const user = verifyCredentials(email, password);
  if (!user) {
    recordFailure(key);
    return {error: "That email and password don’t match an account.", email};
  }
  failures.delete(key);

  await startSession(user);
  redirect(roleHome[user.role]);
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

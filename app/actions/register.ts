"use server";

import {randomBytes} from "node:crypto";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {startSession} from "@/lib/dal";
import {goals, places, rhythms} from "@/lib/programme";
import * as store from "@/lib/store";
import {createUser, emailTaken, findUser, initialsOf, loginLimited, recordLoginFailure} from "@/lib/users";

export type RegisterState = {error?: string; values?: Record<string, string>} | undefined;

/*
 * Self-registration: creates the member's sign-in and client record, then signs them in.
 * They start in payment review; the team verifies payment and assigns a trainer.
 * Limited to 5 new accounts per IP address in 15 minutes.
 */
export async function register(_state: RegisterState, formData: FormData): Promise<RegisterState> {
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  const values = {name: field("name"), email: field("email").toLowerCase(), phone: field("phone"), goal: field("goal"), place: field("place"), days: field("days")};
  const password = String(formData.get("password") ?? "");
  const fail = (error: string): RegisterState => ({error, values});

  if (values.name.length < 2 || values.name.length > 60) return fail("Enter your full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 254) return fail("Enter a valid email address.");
  if (values.phone && !/^\+?[\d\s()-]{7,20}$/.test(values.phone)) return fail("Enter a phone number with digits only, or leave it blank.");
  if (password.length < 10 || password.length > 200) return fail("Choose a password of at least 10 characters.");
  if (!(goals as readonly string[]).includes(values.goal)) return fail("Choose your main goal.");
  if (!(places as readonly string[]).includes(values.place)) return fail("Choose where you’ll train.");
  if (!(rhythms as readonly string[]).includes(values.days)) return fail("Choose how often you’d like to train.");
  if (formData.get("adult") !== "on") return fail("RepCount is for adults. Please confirm you’re 18 or over.");

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `register:${ip}`;
  if (await loginLimited([[key, 5]])) return fail("Too many new accounts from this connection. Please try again in 15 minutes.");
  if (await emailTaken(values.email)) return fail("An account with this email already exists. Sign in instead.");
  await recordLoginFailure([key]);

  const userId = await createUser({role: "member", name: values.name, email: values.email, password});
  const clientId = `c-${randomBytes(6).toString("hex")}`;
  await store.createClient({
    id: clientId, userId, name: values.name, initials: initialsOf(values.name, "RC"), email: values.email,
    phone: values.phone || null, goal: values.goal, trainerId: null, intake: {place: values.place, days: values.days},
  });
  await store.audit(userId, "self_register", `${values.name} · ${values.email}`, clientId);
  const user = await findUser(userId);
  if (user) await startSession(user);
  redirect("/member/profile");
}

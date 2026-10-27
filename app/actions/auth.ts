"use server";

import {cookies, headers} from "next/headers";
import {redirect} from "next/navigation";
import {SESSION_COOKIE} from "@/lib/session";
import {startSession} from "@/lib/dal";
import {clearLoginFailures, loginLimited, recordLoginFailure, verifyCredentials} from "@/lib/users";
import {roleHome} from "@/lib/roles";

export type LoginState = {error?: string; email?: string} | undefined;

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return {error: "Enter a valid email address.", email};
  if (!password || password.length > 200) return {error: "Enter your password.", email};

  // 5 failures per email+IP and 20 per email in 15 minutes. The IP header can be spoofed off-platform; the email limit cannot.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const keys = [`ip:${email}|${ip}`, `email:${email}`];
  if (await loginLimited([[keys[0], 5], [keys[1], 20]])) return {error: "Too many attempts. Please wait 15 minutes and try again.", email};

  const user = await verifyCredentials(email, password);
  if (!user) {
    await recordLoginFailure(keys);
    return {error: "That email and password don’t match an account.", email};
  }
  await clearLoginFailures([keys[0]]);

  await startSession(user);
  redirect(roleHome[user.role]);
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

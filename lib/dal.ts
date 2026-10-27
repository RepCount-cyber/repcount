import "server-only";
import {cache} from "react";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {SESSION_COOKIE, decrypt, encrypt, sessionExpiry} from "./session";
import {findUser, type User} from "./users";
import {roleHome, type Role} from "./roles";

/** Authoritative check used by every protected layout. Proxy only does an early redirect. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await decrypt((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await findUser(session.userId);
  return user && user.role === session.role && user.sessionVersion === session.v ? user : null;
});

export async function requireRole(role: Role): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(roleHome[user.role]);
  return user;
}

/** Sets the signed session cookie. Used by password sign-in and Google sign-in. */
export async function startSession(user: User) {
  const expires = sessionExpiry();
  const token = await encrypt({userId: user.id, role: user.role, v: user.sessionVersion, expiresAt: expires.toISOString()});
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

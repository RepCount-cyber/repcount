import "server-only";
import {cache} from "react";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {SESSION_COOKIE, decrypt} from "./session";
import {findUser, type User} from "./users";
import {roleHome, type Role} from "./roles";

/** Authoritative check used by every protected layout. Proxy only does an early redirect. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await decrypt((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = findUser(session.userId);
  return user && user.role === session.role ? user : null;
});

export async function requireRole(role: Role): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(roleHome[user.role]);
  return user;
}

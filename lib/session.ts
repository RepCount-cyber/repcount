import {SignJWT, jwtVerify} from "jose";
import {isRole, type Role} from "./roles";

/* Signed, httpOnly session cookie. Shared by proxy.ts (optimistic check) and the server data-access layer. */
export const SESSION_COOKIE = "rc_session";
const SESSION_DAYS = 7;

/** v is the user's session version; bumping it in the database revokes every cookie issued before. */
export type SessionPayload = {userId: string; role: Role; v: number; expiresAt: string};

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters (see .env.example).");
  return new TextEncoder().encode(secret);
}

export function sessionExpiry() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({alg: "HS256"})
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const {payload} = await jwtVerify(token, secretKey(), {algorithms: ["HS256"]});
    if (typeof payload.userId !== "string" || !isRole(payload.role)) return null;
    return {userId: payload.userId, role: payload.role, v: typeof payload.v === "number" ? payload.v : 0, expiresAt: String(payload.expiresAt)};
  } catch {
    return null;
  }
}

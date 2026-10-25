import "server-only";
import {createRemoteJWKSet, jwtVerify} from "jose";

/*
 * Google sign-in (OpenID Connect, authorisation code + PKCE). Enabled when GOOGLE_CLIENT_ID and
 * GOOGLE_CLIENT_SECRET are set. Only verified emails that already belong to a RepCount user are admitted.
 */
export const OAUTH_COOKIE = "rc_google_oauth";
const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? {clientId, clientSecret} : null;
}

export function redirectUri(requestOrigin: string) {
  return `${process.env.SITE_URL?.replace(/\/$/, "") || requestOrigin}/api/auth/google/callback`;
}

export async function verifyGoogleIdToken(idToken: string, clientId: string, nonce: string) {
  const {payload} = await jwtVerify(idToken, jwks, {issuer: ["https://accounts.google.com", "accounts.google.com"], audience: clientId});
  if (payload.nonce !== nonce) throw new Error("nonce mismatch");
  if (payload.email_verified !== true || typeof payload.email !== "string") throw new Error("email not verified");
  return payload.email.toLowerCase();
}

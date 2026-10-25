import {createHash, randomBytes} from "node:crypto";
import {NextResponse, type NextRequest} from "next/server";
import {OAUTH_COOKIE, googleConfig, redirectUri} from "@/lib/google";

const b64url = (buffer: Buffer) => buffer.toString("base64url");

/** Starts Google sign-in: stores state, nonce and PKCE verifier in a short-lived cookie, then redirects to Google. */
export async function GET(request: NextRequest) {
  const config = googleConfig();
  if (!config) return NextResponse.redirect(new URL("/login?error=google_unavailable", request.url));
  const state = b64url(randomBytes(24));
  const nonce = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri(request.nextUrl.origin),
    response_type: "code",
    scope: "openid email profile",
    state, nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_COOKIE, JSON.stringify({state, nonce, verifier}), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/google", maxAge: 600,
  });
  return response;
}

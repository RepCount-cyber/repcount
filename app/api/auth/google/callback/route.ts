import {NextResponse, type NextRequest} from "next/server";
import {OAUTH_COOKIE, googleConfig, redirectUri, verifyGoogleIdToken} from "@/lib/google";
import {findUserByEmail} from "@/lib/users";
import {startSession} from "@/lib/dal";
import {roleHome} from "@/lib/roles";

/** Finishes Google sign-in. Unknown emails are refused: accounts are created by the RepCount team, not by signing in. */
export async function GET(request: NextRequest) {
  const fail = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));
    response.cookies.delete({name: OAUTH_COOKIE, path: "/api/auth/google"});
    return response;
  };
  const config = googleConfig();
  if (!config) return fail("google_unavailable");

  let saved: {state?: string; nonce?: string; verifier?: string} = {};
  try { saved = JSON.parse(request.cookies.get(OAUTH_COOKIE)?.value ?? "{}"); } catch { saved = {}; }
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  if (params.get("error")) return fail("google_cancelled");
  if (!code || !saved.state || !saved.nonce || !saved.verifier || params.get("state") !== saved.state) return fail("google_failed");

  let email: string;
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {"content-type": "application/x-www-form-urlencoded"},
      body: new URLSearchParams({
        code, client_id: config.clientId, client_secret: config.clientSecret,
        redirect_uri: redirectUri(request.nextUrl.origin), grant_type: "authorization_code", code_verifier: saved.verifier,
      }),
    });
    const tokens = await tokenResponse.json() as {id_token?: string};
    if (!tokenResponse.ok || !tokens.id_token) return fail("google_failed");
    email = await verifyGoogleIdToken(tokens.id_token, config.clientId, saved.nonce);
  } catch {
    return fail("google_failed");
  }

  const user = await findUserByEmail(email);
  if (!user) return fail("google_no_account");
  await startSession(user);
  const response = NextResponse.redirect(new URL(roleHome[user.role], request.url));
  response.cookies.delete({name: OAUTH_COOKIE, path: "/api/auth/google"});
  return response;
}

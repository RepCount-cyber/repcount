import {NextResponse, type NextRequest} from "next/server";
import {SESSION_COOKIE, decrypt} from "@/lib/session";
import {roleArea, roleHome} from "@/lib/roles";

/* Early redirects only. Protected layouts re-check the session on the server (lib/dal.ts). */
export async function proxy(request: NextRequest) {
  const {pathname} = request.nextUrl;
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login" || pathname === "/register") {
    return session ? NextResponse.redirect(new URL(roleHome[session.role], request.url)) : NextResponse.next();
  }
  if (!session) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  // Members answer the onboarding questions at /onboarding, outside their area.
  if (pathname === "/onboarding" && session.role === "member") return NextResponse.next();
  if (!pathname.startsWith(roleArea[session.role])) {
    return NextResponse.redirect(new URL(roleHome[session.role], request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/onboarding", "/member/:path*", "/trainer/:path*", "/admin/:path*"],
};

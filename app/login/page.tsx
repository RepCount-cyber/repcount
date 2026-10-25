import type {Metadata} from "next";
import Login from "../Login";
import {googleConfig} from "@/lib/google";

export const metadata: Metadata = {title: "Log in — RepCount"};

const googleErrors: Record<string, string> = {
  google_no_account: "That Google account isn’t linked to RepCount yet. Ask the team to add your email first.",
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "Google sign-in didn’t complete. Please try again.",
  google_unavailable: "Google sign-in isn’t set up yet. Use your email and password.",
};

export default async function LoginPage({searchParams}: {searchParams: Promise<{error?: string}>}) {
  const {error} = await searchParams;
  // Demo credentials are listed only outside production builds, or when explicitly enabled.
  const showDemoAccounts = process.env.NODE_ENV !== "production" || process.env.SHOW_DEMO_ACCOUNTS === "true";
  return <Login showDemoAccounts={showDemoAccounts} googleEnabled={googleConfig() !== null} notice={error ? googleErrors[error] : undefined}/>;
}

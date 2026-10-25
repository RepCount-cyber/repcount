import type {Metadata} from "next";
import Login from "../Login";

export const metadata: Metadata = {title: "Log in — RepCount"};

export default function LoginPage() {
  // Demo credentials are listed only outside production builds, or when explicitly enabled.
  const showDemoAccounts = process.env.NODE_ENV !== "production" || process.env.SHOW_DEMO_ACCOUNTS === "true";
  return <Login showDemoAccounts={showDemoAccounts}/>;
}

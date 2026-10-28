import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {requireRole} from "@/lib/dal";
import {goals} from "@/lib/programme";
import {clientByUser} from "@/lib/store";
import Onboarding from "../Onboarding";

export const metadata: Metadata = {title: "Your starting point — RepCount"};

/* Asked once, right after sign-up. Members who have answered go straight to their dashboard. */
export default async function OnboardingPage() {
  const user = await requireRole("member");
  const client = await clientByUser(user.id);
  if (!client || client.intake) redirect("/member/overview");
  const goal = (goals as readonly string[]).includes(client.goal) ? client.goal : undefined;
  return <Onboarding firstName={user.name.split(" ")[0]} goal={goal}/>;
}

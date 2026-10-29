import type {Metadata} from "next";
import {memberPage} from "./memberPage";

export const metadata: Metadata = {title: "Member — RepCount"};

/** A member's overview for their trainer: this week's sessions, plan status, contact details and questions. */
export default async function TrainerMemberOverview({params}: {params: Promise<{id: string}>}) {
  return memberPage((await params).id, "overview");
}

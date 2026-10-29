import type {Metadata} from "next";
import {memberPage} from "../memberPage";

export const metadata: Metadata = {title: "Progress — RepCount"};

/** A member's tracker entries, weight trend, past weeks and history. */
export default async function TrainerMemberProgress({params}: {params: Promise<{id: string}>}) {
  return memberPage((await params).id, "progress");
}

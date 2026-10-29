import type {Metadata} from "next";
import {memberPage} from "../../../memberPage";

export const metadata: Metadata = {title: "Plan a day — RepCount"};

/** One day of a member's week, e.g. /trainer/clients/<id>/workouts/2026-11-02/monday. */
export default async function TrainerMemberDay({params}: {params: Promise<{id: string; week: string; day: string}>}) {
  const {id, week, day} = await params;
  return memberPage(id, "workouts", {week, day});
}

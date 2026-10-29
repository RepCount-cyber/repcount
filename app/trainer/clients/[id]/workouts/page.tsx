import type {Metadata} from "next";
import {memberPage} from "../memberPage";

export const metadata: Metadata = {title: "Workout plan — RepCount"};

/** A member's week as seven day cards, with week shortcuts and their check-in call link. `?week=` picks the week. */
export default async function TrainerMemberWorkouts({params, searchParams}: {params: Promise<{id: string}>; searchParams: Promise<{week?: string}>}) {
  const [{id}, {week}] = await Promise.all([params, searchParams]);
  return memberPage(id, "workouts", {week});
}

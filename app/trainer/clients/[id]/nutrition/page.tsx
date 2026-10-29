import type {Metadata} from "next";
import {memberPage} from "../memberPage";

export const metadata: Metadata = {title: "Nutrition — RepCount"};

/** Write a member's nutrition plan; they see it on their Nutrition page. */
export default async function TrainerMemberNutrition({params}: {params: Promise<{id: string}>}) {
  return memberPage((await params).id, "nutrition");
}

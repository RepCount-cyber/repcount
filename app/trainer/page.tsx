import type {Metadata} from "next";
import {requireRole} from "@/lib/dal";
import {getSettings, listClients} from "@/lib/store";
import StaffApp from "../StaffApp";

export const metadata: Metadata = {title: "Trainer workspace — RepCount"};

export default async function TrainerPage() {
  const user = await requireRole("trainer");
  // Trainers only ever receive their own assigned clients.
  return <StaffApp area="trainer" user={{name: user.name, initials: user.initials, email: user.email}} clients={listClients(user.name)} settings={getSettings()} activity={[]}/>;
}

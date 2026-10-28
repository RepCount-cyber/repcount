import type {Metadata} from "next";
import {requireRole} from "@/lib/dal";
import {getSettings, listClients} from "@/lib/store";
import StaffApp from "../StaffApp";

export const metadata: Metadata = {title: "Trainer workspace — RepCount"};

export default async function TrainerPage({searchParams}: {searchParams: Promise<{tab?: string}>}) {
  const user = await requireRole("trainer");
  const {tab} = await searchParams;
  // Trainers only ever receive their own assigned clients.
  const [clients, settings] = await Promise.all([listClients(user.id), getSettings()]);
  return <StaffApp area="trainer" user={{name: user.name, initials: user.initials, email: user.email}} clients={clients} settings={settings} activity={[]} initialTab={tab}/>;
}

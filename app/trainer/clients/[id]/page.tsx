import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/dal";
import {clientDetail, getSettings, listClients} from "@/lib/store";
import StaffApp from "../../../StaffApp";
import ClientDetail from "../../../ClientDetail";

export const metadata: Metadata = {title: "Client details — RepCount"};

/** A trainer's view of one of their own clients; anyone else's client is a 404. */
export default async function TrainerClientPage({params}: {params: Promise<{id: string}>}) {
  const user = await requireRole("trainer");
  const {id} = await params;
  const detail = await clientDetail(id);
  if (!detail || detail.client.trainerId !== user.id) notFound();
  const [clients, settings] = await Promise.all([listClients(user.id), getSettings()]);
  return <StaffApp area="trainer" user={{name: user.name, initials: user.initials, email: user.email}} clients={clients} settings={settings} activity={[]}
    detail={<ClientDetail viewer="trainer" detail={detail} trainers={[]}/>}/>;
}

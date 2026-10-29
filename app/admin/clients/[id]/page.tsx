import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/dal";
import {clientDetail, getSettings, listClients, trainerAnalytics} from "@/lib/store";
import StaffApp from "../../../StaffApp";
import ClientDetail from "../../../ClientDetail";

export const metadata: Metadata = {title: "Client details — RepCount"};

export default async function ClientDetailPage({params}: {params: Promise<{id: string}>}) {
  const user = await requireRole("admin");
  const {id} = await params;
  const [detail, clients, settings, trainers] = await Promise.all([clientDetail(id), listClients(), getSettings(), trainerAnalytics()]);
  if (!detail) notFound();
  return <StaffApp area="admin" user={{name: user.name, initials: user.initials, email: user.email}} clients={clients} settings={settings} activity={[]} trainers={trainers}
    detail={<ClientDetail viewer="admin" detail={detail} trainers={trainers.filter(t => t.active).map(t => ({id: t.id, name: t.name}))}/>}/>;
}

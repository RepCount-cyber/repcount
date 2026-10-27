import type {Metadata} from "next";
import {requireRole} from "@/lib/dal";
import {getSettings, listClients, recentAudit, trainerAnalytics} from "@/lib/store";
import StaffApp from "../StaffApp";

export const metadata: Metadata = {title: "Super admin — RepCount"};

export default async function AdminPage({searchParams}: {searchParams: Promise<{tab?: string}>}) {
  const user = await requireRole("admin");
  const {tab} = await searchParams;
  const [clients, settings, activity, trainers] = await Promise.all([listClients(), getSettings(), recentAudit(), trainerAnalytics()]);
  return <StaffApp area="admin" user={{name: user.name, initials: user.initials, email: user.email}} clients={clients} settings={settings} activity={activity} trainers={trainers} initialTab={tab}/>;
}

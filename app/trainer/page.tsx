import type {Metadata} from "next";
import {requireRole} from "@/lib/dal";
import {istToday} from "@/lib/dates";
import {getSettings, getWeekPlans, listClients} from "@/lib/store";
import StaffApp from "../StaffApp";

export const metadata: Metadata = {title: "Trainer workspace — RepCount"};

export default async function TrainerPage({searchParams}: {searchParams: Promise<{tab?: string}>}) {
  const user = await requireRole("trainer");
  const {tab} = await searchParams;
  // Trainers only ever receive their own assigned clients.
  const clients = await listClients(user.id);
  const monday = Date.parse(`${istToday().weekStart}T00:00:00Z`);
  const weeks = [0, 1, 2, 3].map(i => {
    const start = new Date(monday + i * 7 * 86400000);
    const label = new Date(start).toLocaleDateString("en-GB", {day: "numeric", month: "short", timeZone: "UTC"});
    return {start: start.toISOString().slice(0, 10), label: i === 0 ? `This week · from ${label}` : i === 1 ? `Next week · from ${label}` : `Week of ${label}`};
  });
  const [plans, settings] = await Promise.all([getWeekPlans(clients.map(c => c.id), weeks.map(w => w.start)), getSettings()]);
  return <StaffApp area="trainer" user={{name: user.name, initials: user.initials, email: user.email}} clients={clients} settings={settings} activity={[]} initialTab={tab} weeks={weeks} plans={plans}/>;
}

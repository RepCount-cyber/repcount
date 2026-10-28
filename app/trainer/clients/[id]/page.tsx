import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/dal";
import {istToday} from "@/lib/dates";
import {planningWeeks} from "@/lib/schedule";
import {clientDetail, confirmedDays, getNutritionPlan, getSettings, getWeekPlans, listClients} from "@/lib/store";
import StaffApp from "../../../StaffApp";
import ClientDetail from "../../../ClientDetail";

export const metadata: Metadata = {title: "Member — RepCount"};

/** A trainer's view of one of their own members, where they plan workouts and nutrition and confirm sessions; anyone else's client is a 404. */
export default async function TrainerClientPage({params}: {params: Promise<{id: string}>}) {
  const user = await requireRole("trainer");
  const {id} = await params;
  const detail = await clientDetail(id);
  if (!detail || detail.client.trainerId !== user.id) notFound();
  const {day: today, weekStart} = istToday();
  const weeks = planningWeeks(weekStart);
  const [clients, settings, plans, nutrition, confirmed] = await Promise.all([
    listClients(user.id), getSettings(), getWeekPlans([id], weeks.map(w => w.start)), getNutritionPlan(id), confirmedDays(id, weekStart, today),
  ]);
  return <StaffApp area="trainer" user={{name: user.name, initials: user.initials, email: user.email}} clients={clients} settings={settings} activity={[]}
    detail={<ClientDetail viewer="trainer" detail={detail} trainers={[]} coaching={{weeks, plans, nutrition, confirmed, today}}/>}/>;
}

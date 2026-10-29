import {notFound} from "next/navigation";
import {requireRole} from "@/lib/dal";
import {istToday} from "@/lib/dates";
import {daySlugs, planningWeeks} from "@/lib/schedule";
import {clientDetail, confirmedDays, getNutritionPlan, getSettings, getWeekPlans, listClients} from "@/lib/store";
import StaffApp from "../../../StaffApp";
import ClientDetail, {type MemberSection} from "../../../ClientDetail";

/**
 * One section of a trainer's member page (overview, workouts, nutrition or progress). Each section is its own URL and
 * loads only what it shows; anyone else's client is a 404. Workouts take an optional `week` (one of the four planning
 * weeks) and `day` slug, which opens that single day's editor.
 */
export async function memberPage(id: string, section: MemberSection, at: {week?: string; day?: string} = {}) {
  const user = await requireRole("trainer");
  const {day: today, weekStart} = istToday();
  const weeks = planningWeeks(weekStart);
  const week = weeks.find(w => w.start === at.week)?.start;
  const day = at.day === undefined ? undefined : daySlugs.indexOf(at.day);
  if (at.day !== undefined && (!week || day === -1)) notFound();
  // Everything loads in one go (the database is a long round trip away); nothing is shown until the assignment is checked.
  const [detail, clients, settings, plans, nutrition, confirmed] = await Promise.all([
    clientDetail(id), listClients(user.id), getSettings(),
    section === "workouts" ? getWeekPlans([id], weeks.map(w => w.start)) : {},
    section === "overview" || section === "nutrition" ? getNutritionPlan(id) : null,
    section === "overview" ? confirmedDays(id, weekStart, today) : [],
  ]);
  if (!detail || detail.client.trainerId !== user.id) notFound();
  return <StaffApp area="trainer" user={{name: user.name, initials: user.initials, email: user.email}} clients={clients} settings={settings} activity={[]}
    detail={<ClientDetail viewer="trainer" section={section} detail={detail} trainers={[]} coaching={{weeks, plans, nutrition, confirmed, today, week: week ?? weeks[0].start, day}}/>}/>;
}

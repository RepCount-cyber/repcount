import type {Metadata} from "next";
import {requireRole} from "@/lib/dal";
import {istToday} from "@/lib/dates";
import {clientByUser, getMemberState, getSettings, getWeekPlan} from "@/lib/store";
import {listTrainers} from "@/lib/users";
import MemberApp from "../MemberApp";

export const metadata: Metadata = {title: "Your plan — RepCount"};

export default async function MemberLayout({children}: {children: React.ReactNode}) {
  const user = await requireRole("member");
  const {day, weekStart} = istToday();
  const settings = getSettings();
  const client = clientByUser(user.id);
  const trainer = listTrainers().find(t => t.name === client?.trainer);
  return <>
    <MemberApp
      user={{name: user.name, initials: user.initials, email: user.email}}
      initial={getMemberState(user.id, day, weekStart)}
      price={{amount: settings.price, currency: settings.currency}}
      schedule={client ? getWeekPlan(client.id, weekStart) : null}
      coach={trainer ? {name: trainer.name, initials: trainer.initials} : {name: "Your trainer", initials: "RC"}}
      checkinLink={client?.meetingUrl ?? null}
    />
    {children}
  </>;
}

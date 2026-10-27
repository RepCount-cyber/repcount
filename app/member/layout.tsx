import type {Metadata} from "next";
import {requireRole} from "@/lib/dal";
import {istToday} from "@/lib/dates";
import {clientByUser, getMemberState, getSettings, getWeekPlan} from "@/lib/store";
import {findUser} from "@/lib/users";
import MemberApp from "../MemberApp";

export const metadata: Metadata = {title: "Your plan — RepCount"};

/** 30-day programme dates from the day the client joined, e.g. "15 October 2026". */
const formatDay = (iso: string, plus: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + plus * 86400000).toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});

export default async function MemberLayout({children}: {children: React.ReactNode}) {
  const user = await requireRole("member");
  const {weekStart} = istToday();
  const [settings, client, initial] = await Promise.all([getSettings(), clientByUser(user.id), getMemberState(user.id)]);
  const [trainer, schedule] = await Promise.all([client?.trainerId ? findUser(client.trainerId) : null, client ? getWeekPlan(client.id, weekStart) : null]);
  return <>
    <MemberApp
      user={{name: user.name, initials: user.initials, email: user.email}}
      initial={initial}
      price={{amount: settings.price, currency: settings.currency}}
      schedule={schedule}
      coach={trainer ? {name: trainer.name, initials: trainer.initials} : {name: "Your trainer", initials: "RC"}}
      checkinLink={client?.meetingUrl ?? null}
      membership={client?.joinedOn ? {start: formatDay(client.joinedOn, 0), end: formatDay(client.joinedOn, 29)} : null}
    />
    {children}
  </>;
}

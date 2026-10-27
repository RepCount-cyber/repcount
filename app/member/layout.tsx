import type {Metadata} from "next";
import {requireRole} from "@/lib/dal";
import {istToday} from "@/lib/dates";
import {clientByUser, getMemberDays, getMemberState, getSettings, getWeekPlan} from "@/lib/store";
import {findUser} from "@/lib/users";
import MemberApp from "../MemberApp";

export const metadata: Metadata = {title: "Your plan — RepCount"};

/** 30-day programme dates from the day the client joined, e.g. "15 October 2026". */
const formatDay = (iso: string, plus: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + plus * 86400000).toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});

export default async function MemberLayout({children}: {children: React.ReactNode}) {
  const user = await requireRole("member");
  const {day, weekStart} = istToday();
  const [settings, client, initial] = await Promise.all([getSettings(), clientByUser(user.id), getMemberState(user.id)]);
  // The 30-day calendar starts on the day they joined, or 29 days ago, whichever is later.
  const monthAgo = new Date(Date.parse(`${day}T00:00:00Z`) - 29 * 86400000).toISOString().slice(0, 10);
  const since = client?.joinedOn && client.joinedOn > monthAgo ? client.joinedOn : monthAgo;
  const [trainer, schedule, history] = await Promise.all([client?.trainerId ? findUser(client.trainerId) : null, client ? getWeekPlan(client.id, weekStart) : null, getMemberDays(user.id, since)]);
  return <>
    <MemberApp
      user={{name: user.name, initials: user.initials, email: user.email}}
      initial={initial}
      price={{amount: settings.price, currency: settings.currency}}
      schedule={schedule}
      coach={trainer ? {name: trainer.name, initials: trainer.initials} : {name: "Your trainer", initials: "RC"}}
      checkinLink={client?.meetingUrl ?? null}
      membership={client?.joinedOn ? {start: formatDay(client.joinedOn, 0), end: formatDay(client.joinedOn, 29), iso: client.joinedOn} : null}
      details={{phone: client?.phone ?? null, goal: client?.goal ?? null, place: client?.intake?.place ?? null, days: client?.intake?.days ?? null, stage: client?.stage ?? null, paid: client?.paid ?? false}}
      history={history}
      since={since}
    />
    {children}
  </>;
}

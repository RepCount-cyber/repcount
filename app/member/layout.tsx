import type {Metadata} from "next";
import {requireRole} from "@/lib/dal";
import {istToday} from "@/lib/dates";
import {getMemberState, getSettings} from "@/lib/store";
import MemberApp from "../MemberApp";

export const metadata: Metadata = {title: "Your plan — RepCount"};

export default async function MemberLayout({children}: {children: React.ReactNode}) {
  const user = await requireRole("member");
  const {day, weekStart} = istToday();
  const settings = getSettings();
  return <>
    <MemberApp
      user={{name: user.name, initials: user.initials, email: user.email}}
      initial={getMemberState(user.id, day, weekStart)}
      price={{amount: settings.price, currency: settings.currency}}
    />
    {children}
  </>;
}

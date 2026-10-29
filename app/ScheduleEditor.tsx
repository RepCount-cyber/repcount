"use client";

import {useState} from "react";
import Link from "next/link";
import {Icon} from "./Media";
import {saveMeetingLink, saveSchedule} from "./actions/data";
import {dayNames, daySlugs, formatTime, templates, type PlannedWorkout, type WeekPlan} from "@/lib/schedule";
import type {ClientRow} from "@/lib/store";

type Result = {ok?: string; error?: string};
type Run = (action: () => Promise<Result>) => void;
type Week = {start: string; label: string};
type DraftDay = {kind: string; title: string; exercises: string; time: string; duration: string; meetingUrl: string};

const rest: DraftDay = {kind: "Rest day", title: "", exercises: "", time: "", duration: "", meetingUrl: ""};
const toDraft = (w: PlannedWorkout | null): DraftDay => w
  ? {kind: w.title in templates ? w.title : "Custom", title: w.title, exercises: w.exercises.join("\n"), time: w.time ?? "", duration: w.durationMin ? String(w.durationMin) : "", meetingUrl: w.meetingUrl ?? ""}
  : rest;
const toWorkout = (d: DraftDay): PlannedWorkout | null => d.kind === "Rest day" ? null : {
  title: d.title.trim(), exercises: d.exercises.split("\n").map(e => e.trim()).filter(Boolean), time: d.time || null,
  durationMin: d.duration ? Number(d.duration) : null, meetingUrl: d.meetingUrl.trim() || null,
};
const emptyWeek: WeekPlan = Array(7).fill(null);
const dateOf = (week: string, i: number, opts: Intl.DateTimeFormatOptions = {day: "numeric", month: "short"}) => new Date(Date.parse(`${week}T00:00:00Z`) + i * 86400000).toLocaleDateString("en-GB", {...opts, timeZone: "UTC"});
const isoOf = (week: string, i: number) => new Date(Date.parse(`${week}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10);
const plansKey = (client: ClientRow, week: string) => `${client.id}|${week}`;
export const workoutsPath = (clientId: string) => `/trainer/clients/${clientId}/workouts`;

/**
 * The Workout plan page for one member: pick a week, set their check-in call link, and see the seven days as cards.
 * Each card opens that day's own page to edit it; whole-week shortcuts save straight away.
 */
export function WeekOverview({client, weeks, week, plans, today, pending, run}: {
  client: ClientRow; weeks: Week[]; week: string; plans: Record<string, WeekPlan | null>; today: string; pending: boolean; run: Run;
}) {
  const saved = plans[plansKey(client, week)] ?? null;
  const days = saved ?? emptyWeek;
  const weekIndex = weeks.findIndex(w => w.start === week);
  const previous = weekIndex > 0 ? plans[plansKey(client, weeks[weekIndex - 1].start)] : null;
  const workouts = days.filter(Boolean).length;
  const [allLink, setAllLink] = useState("");
  const firstName = client.name.split(" ")[0];
  const base = workoutsPath(client.id);
  // Shortcuts replace the saved week, so ask before overwriting workouts that are already there.
  const replace = (plan: WeekPlan, what: string) => {
    if (workouts > 0 && !window.confirm(`${what} replaces the ${workouts} workout${workouts === 1 ? "" : "s"} already planned for this week. Continue?`)) return;
    run(() => saveSchedule(client.id, week, plan));
  };
  const quickFill = days.map((d, i) => [0, 2, 4].includes(i) ? {title: "Full-body foundations", exercises: templates["Full-body foundations"].exercises, time: d?.time ?? "18:00", durationMin: 25, meetingUrl: d?.meetingUrl ?? null} : null);

  return <>
    <nav className="rc-week-tabs" aria-label="Choose a week">
      {weeks.map(w => <Link key={w.start} href={`${base}?week=${w.start}`} aria-current={w.start === week ? "page" : undefined}>
        <b>{w.label.split(" · ")[0]}</b><small>{w.label.includes(" · ") ? w.label.split(" · ")[1] : "from " + dateOf(w.start, 0)}{plans[plansKey(client, w.start)] ? " · planned" : ""}</small>
      </Link>)}
    </nav>

    <section className="card rc-schedule">
      <div className="section-top"><h2>{firstName}’s week</h2><span className="pill">{workouts} WORKOUT{workouts === 1 ? "" : "S"}{saved ? "" : " · NOT SCHEDULED"}</span></div>
      <p className="small-note">Open a day to plan it. {firstName} sees saved days on their plan straight away.</p>
      <ol className="rc-week-days">{days.map((w, i) => {
        const iso = isoOf(week, i);
        return <li key={i}><Link href={`${base}/${week}/${daySlugs[i]}`} className={w ? undefined : "rest"} aria-label={`${dayNames[i]} ${dateOf(week, i)}: ${w ? w.title : "rest day"}. Edit`}>
          <span className="rc-week-day-top"><b>{dayNames[i]}</b><small>{dateOf(week, i)}{iso === today ? " · today" : ""}</small></span>
          {w ? <>
            <strong>{w.title}</strong>
            <small>{[w.time && `${formatTime(w.time)} IST`, w.durationMin && `${w.durationMin} min`, `${w.exercises.length} exercise${w.exercises.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</small>
            {w.meetingUrl && <span className="rc-week-live"><Icon name="video" size={14}/> Live session</span>}
          </> : <><strong>Rest day</strong><small>Tap to plan a workout</small></>}
          <span className="rc-week-edit">{w ? "Edit" : "Plan"} <Icon name="arrow" size={14}/></span>
        </Link></li>;
      })}</ol>
    </section>

    <div className="two-grid equal rc-detail-grid">
      <section className="card rc-schedule">
        <h2>Week shortcuts</h2>
        <p className="small-note">These save the whole week at once.</p>
        <div className="rc-schedule-tools">
          {previous && <button type="button" className="small-button" disabled={pending} onClick={() => replace(previous, "Copying last week")}>Copy last week</button>}
          <button type="button" className="small-button" disabled={pending} onClick={() => replace(quickFill, "Quick fill")}>Quick fill: Mon · Wed · Fri</button>
          {workouts > 0 && <button type="button" className="small-button" disabled={pending} onClick={() => replace(emptyWeek, "Clearing the week")}>Clear week</button>}
        </div>
        {workouts > 0 && <form className="rc-schedule-link" onSubmit={e => {e.preventDefault(); run(() => saveSchedule(client.id, week, days.map(d => d && {...d, meetingUrl: allLink.trim()})));}}>
          <label><span>Same Meet link for every session</span><input type="url" inputMode="url" required placeholder="https://meet.google.com/…" value={allLink} onChange={e => setAllLink(e.target.value)}/></label>
          <button type="submit" className="button outline" disabled={pending || !allLink.trim()}><Icon name="video" size={16}/> Apply</button>
        </form>}
      </section>
      <section className="card rc-schedule"><h2>Weekly check-in call</h2><p className="small-note">Shown on {firstName}’s profile as “Join check-in call”.</p><MeetingLink client={client} pending={pending} run={run}/></section>
    </div>
  </>;
}

function MeetingLink({client, pending, run}: {client: ClientRow; pending: boolean; run: Run}) {
  const [url, setUrl] = useState(client.meetingUrl ?? "");
  return <form className="rc-schedule-link" onSubmit={e => {e.preventDefault(); run(() => saveMeetingLink(client.id, url));}}>
    <label><span>Weekly check-in call link</span><input type="url" inputMode="url" placeholder="https://meet.google.com/…" value={url} onChange={e => setUrl(e.target.value)}/></label>
    <button className="button outline" type="submit" disabled={pending}><Icon name="video" size={16}/> Save link</button>
  </form>;
}

/** One day of a member's week on its own page. Saving keeps the rest of the week as it is. */
export function DayEditor({client, weeks, week, day, plans, pending, run}: {
  client: ClientRow; weeks: Week[]; week: string; day: number; plans: Record<string, WeekPlan | null>; pending: boolean; run: Run;
}) {
  const saved = plans[plansKey(client, week)] ?? emptyWeek;
  const [d, setD] = useState<DraftDay>(() => toDraft(saved[day]));
  const update = (change: Partial<DraftDay>) => setD({...d, ...change});
  const choose = (kind: string) => {
    if (kind === "Rest day") setD(rest);
    else if (kind === "Custom") update({kind, title: d.title || "Custom session"});
    else update({kind, title: kind, exercises: templates[kind].exercises.join("\n"), duration: String(templates[kind].durationMin)});
  };
  const base = workoutsPath(client.id);
  const weekLabel = weeks.find(w => w.start === week)?.label ?? `Week of ${dateOf(week, 0)}`;
  const sibling = (i: number) => i >= 0 && i < 7 && <Link className="small-button" href={`${base}/${week}/${daySlugs[i]}`}>{i < day ? "← " : ""}{dayNames[i]}{i > day ? " →" : ""}</Link>;

  return <section className="card rc-schedule rc-day-editor">
    <Link className="rc-back-link" href={`${base}?week=${week}`}>← {weekLabel}</Link>
    <div className="section-top"><h2>{dayNames[day]}, {dateOf(week, day, {weekday: undefined, day: "numeric", month: "long"})}</h2><span className="pill">{saved[day] ? "PLANNED" : "REST DAY"}</span></div>
    <form onSubmit={e => {e.preventDefault(); run(() => saveSchedule(client.id, week, saved.map((w, i) => i === day ? toWorkout(d) : w)));}}>
      <label><span>Session</span><select value={d.kind} onChange={e => choose(e.target.value)}><option>Rest day</option>{Object.keys(templates).map(t => <option key={t}>{t}</option>)}<option>Custom</option></select></label>
      {d.kind !== "Rest day" && <>
        <label><span>Title</span><input value={d.title} onChange={e => update({title: e.target.value})} maxLength={60} required/></label>
        <div className="rc-day-pair">
          <label><span>Start time (IST)</span><input type="time" value={d.time} onChange={e => update({time: e.target.value})}/></label>
          <label><span>Minutes</span><input type="number" min={5} max={240} step={5} value={d.duration} onChange={e => update({duration: e.target.value})}/></label>
        </div>
        <label><span>Google Meet link (optional)</span><input type="url" inputMode="url" placeholder="https://meet.google.com/…" value={d.meetingUrl} onChange={e => update({meetingUrl: e.target.value})}/></label>
        <label><span>Exercises · one per line</span><textarea rows={8} value={d.exercises} onChange={e => update({exercises: e.target.value})}/></label>
      </>}
      <div className="rc-day-actions">
        <button className="button dark" type="submit" disabled={pending}>{pending ? "Saving…" : `Save ${dayNames[day]}`}</button>
        <span>{sibling(day - 1)}{sibling(day + 1)}</span>
      </div>
    </form>
  </section>;
}

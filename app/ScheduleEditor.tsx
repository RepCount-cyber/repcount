"use client";

import {useState} from "react";
import {Icon} from "./Media";
import {saveMeetingLink, saveSchedule} from "./actions/data";
import {dayNames, templates, type PlannedWorkout, type WeekPlan} from "@/lib/schedule";
import type {ClientRow} from "@/lib/store";

type Result = {ok?: string; error?: string};
type DraftDay = {kind: string; title: string; exercises: string; time: string; duration: string; meetingUrl: string};

const rest: DraftDay = {kind: "Rest day", title: "", exercises: "", time: "", duration: "", meetingUrl: ""};
const toDraft = (w: PlannedWorkout | null): DraftDay => w
  ? {kind: w.title in templates ? w.title : "Custom", title: w.title, exercises: w.exercises.join("\n"), time: w.time ?? "", duration: w.durationMin ? String(w.durationMin) : "", meetingUrl: w.meetingUrl ?? ""}
  : rest;
const toPlan = (days: DraftDay[]): WeekPlan => days.map(d => d.kind === "Rest day" ? null : {
  title: d.title.trim(), exercises: d.exercises.split("\n").map(e => e.trim()).filter(Boolean), time: d.time || null,
  durationMin: d.duration ? Number(d.duration) : null, meetingUrl: d.meetingUrl.trim() || null,
});

/** Trainer tool on a member's page: their weekly check-in call link and a week of workouts (with optional live-session links). */
export default function ScheduleEditor({client, weeks, plans, pending, run}: {
  client: ClientRow; weeks: {start: string; label: string}[]; plans: Record<string, WeekPlan | null>;
  pending: boolean; run: (action: () => Promise<Result>) => void;
}) {
  const [week, setWeek] = useState(weeks[0].start);
  return <>
    <section className="card rc-schedule-pick">
      <label><span>Week</span><select value={week} onChange={e => setWeek(e.target.value)}>{weeks.map(w => <option key={w.start} value={w.start}>{w.label}{plans[`${client.id}|${w.start}`] ? " · scheduled" : ""}</option>)}</select></label>
      <MeetingLink client={client} pending={pending} run={run}/>
    </section>
    <WeekEditor key={week} client={client} week={week} weeks={weeks} plans={plans} pending={pending} run={run}/>
  </>;
}

function MeetingLink({client, pending, run}: {client: ClientRow; pending: boolean; run: (action: () => Promise<Result>) => void}) {
  const [url, setUrl] = useState(client.meetingUrl ?? "");
  return <form className="rc-schedule-link" onSubmit={e => {e.preventDefault(); run(() => saveMeetingLink(client.id, url));}}>
    <label><span>Weekly check-in call link</span><input type="url" inputMode="url" placeholder="https://meet.google.com/…" value={url} onChange={e => setUrl(e.target.value)}/></label>
    <button className="button outline" type="submit" disabled={pending}><Icon name="video" size={16}/> Save link</button>
  </form>;
}

function WeekEditor({client, week, weeks, plans, pending, run}: {
  client: ClientRow; week: string; weeks: {start: string; label: string}[]; plans: Record<string, WeekPlan | null>;
  pending: boolean; run: (action: () => Promise<Result>) => void;
}) {
  const saved = plans[`${client.id}|${week}`];
  const [days, setDays] = useState<DraftDay[]>(() => (saved ?? Array(7).fill(null)).map(toDraft));
  const [allLink, setAllLink] = useState("");
  const weekIndex = weeks.findIndex(w => w.start === week);
  const previous = weekIndex > 0 ? plans[`${client.id}|${weeks[weekIndex - 1].start}`] : null;
  const update = (i: number, change: Partial<DraftDay>) => setDays(days.map((d, j) => j === i ? {...d, ...change} : d));
  const choose = (i: number, kind: string) => {
    if (kind === "Rest day") update(i, rest);
    else if (kind === "Custom") update(i, {kind, title: days[i].title || "Custom session"});
    else update(i, {kind, title: kind, exercises: templates[kind].exercises.join("\n"), duration: String(templates[kind].durationMin)});
  };
  const workouts = days.filter(d => d.kind !== "Rest day").length;
  const dates = Array.from({length: 7}, (_, i) => new Date(Date.parse(`${week}T00:00:00Z`) + i * 86400000).toLocaleDateString("en-GB", {day: "numeric", month: "short", timeZone: "UTC"}));

  return <section className="card rc-schedule">
    <div className="section-top"><h2>{client.name}’s week</h2><span className="pill">{workouts} WORKOUT{workouts === 1 ? "" : "S"}{saved ? " · SAVED" : " · NOT SCHEDULED"}</span></div>
    <div className="rc-schedule-tools">
      {previous && <button type="button" className="small-button" onClick={() => setDays(previous.map(toDraft))}>Copy last week</button>}
      <button type="button" className="small-button" onClick={() => setDays(days.map((d, i) => [0, 2, 4].includes(i) ? toDraft({title: "Full-body foundations", exercises: templates["Full-body foundations"].exercises, time: d.time || "18:00", durationMin: 25, meetingUrl: d.meetingUrl || null}) : rest))}>Quick fill: Mon · Wed · Fri</button>
      <button type="button" className="small-button" onClick={() => setDays(Array(7).fill(rest))}>Clear week</button>
    </div>
    <div className="rc-schedule-link rc-schedule-all">
      <label><span>Same Google Meet link for every session</span><input type="url" inputMode="url" placeholder="https://meet.google.com/…" value={allLink} onChange={e => setAllLink(e.target.value)}/></label>
      <button type="button" className="button outline" disabled={!allLink.trim()} onClick={() => setDays(days.map(d => d.kind === "Rest day" ? d : {...d, meetingUrl: allLink.trim()}))}><Icon name="video" size={16}/> Apply to all sessions</button>
    </div>
    <form onSubmit={e => {e.preventDefault(); run(() => saveSchedule(client.id, week, toPlan(days)));}}>
      <ol className="rc-schedule-days">{days.map((d, i) => <li key={i} className={d.kind === "Rest day" ? "rest" : ""}>
        <div className="rc-schedule-day"><b>{dayNames[i]}</b><small>{dates[i]}</small></div>
        <label><span>Session</span><select value={d.kind} onChange={e => choose(i, e.target.value)}><option>Rest day</option>{Object.keys(templates).map(t => <option key={t}>{t}</option>)}<option>Custom</option></select></label>
        {d.kind !== "Rest day" && <>
          <label><span>Title</span><input value={d.title} onChange={e => update(i, {title: e.target.value})} maxLength={60} required/></label>
          <label><span>Start time (IST)</span><input type="time" value={d.time} onChange={e => update(i, {time: e.target.value})}/></label>
          <label><span>Minutes</span><input type="number" min={5} max={240} step={5} value={d.duration} onChange={e => update(i, {duration: e.target.value})}/></label>
          <label className="rc-schedule-wide"><span>Google Meet link (optional)</span><input type="url" inputMode="url" placeholder="https://meet.google.com/…" value={d.meetingUrl} onChange={e => update(i, {meetingUrl: e.target.value})}/></label>
          <label className="rc-schedule-wide"><span>Exercises · one per line</span><textarea rows={4} value={d.exercises} onChange={e => update(i, {exercises: e.target.value})}/></label>
        </>}
      </li>)}</ol>
      <button className="button dark" type="submit" disabled={pending}>{pending ? "Saving…" : `Save ${client.name.split(" ")[0]}’s week`}</button>
    </form>
  </section>;
}

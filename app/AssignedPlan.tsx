"use client";

import {Icon} from "./Media";
import {formatTime, type WeekPlan} from "@/lib/schedule";

/** The member's week as scheduled by their trainer: pick a day, follow the exercises, join the live session, mark it done. */
export default function AssignedPlan({schedule, labels, day, setDay, doneDays, toggleDone, todayIndex, coachName}: {
  schedule: WeekPlan; labels: string[]; day: number; setDay: (day: number) => void;
  doneDays: number[]; toggleDone: (day: number) => void; todayIndex: number; coachName: string;
}) {
  const workout = schedule[day];
  const done = doneDays.includes(day);
  const time = formatTime(workout?.time ?? null);
  return <>
    <div className="day-strip" role="group" aria-label="Choose a day">{labels.map((label, i) => <button key={label} className={day === i ? "selected" : ""} aria-pressed={day === i} onClick={() => setDay(i)}>
      {label}<small>{schedule[i] ? doneDays.includes(i) ? "Done ✓" : "Workout" : "Rest"}</small>
    </button>)}</div>
    <div className="two-grid">
      <section className="card plan-main rc-assigned">
        <span className="eyebrow">{workout ? `FROM ${coachName.toUpperCase()} · ${day === todayIndex ? "TODAY" : "YOUR PLAN"}` : "RECOVERY DAY"}</span>
        <h2>{workout ? workout.title : "Make room for recovery."}</h2>
        <p>{workout ? [time && `${time} IST`, workout.durationMin && `${workout.durationMin} minutes`].filter(Boolean).join(" · ") || "Any time today" : "No workout scheduled. Walk, stretch and rest well."}</p>
        {workout && <>
          {workout.meetingUrl && <a className="button dark rc-join" href={workout.meetingUrl} target="_blank" rel="noopener noreferrer"><Icon name="video" size={18}/> Join live session{time ? ` · ${time}` : ""}</a>}
          {workout.exercises.length > 0 && <ol className="rc-assigned-list">{workout.exercises.map((e, i) => <li key={i}><span>{i + 1}</span>{e}</li>)}</ol>}
          <button className={done ? "button outline" : "button dark"} onClick={() => toggleDone(day)} aria-pressed={done}>{done ? "Done ✓ · tap to undo" : "Mark workout done"}</button>
        </>}
      </section>
      <aside className="card rc-assigned-week">
        <span className="tile-icon sage"><Icon name="calendar" size={22}/></span>
        <h3>This week</h3>
        <ul>{schedule.map((w, i) => <li key={i} className={i === day ? "current" : ""}>
          <button onClick={() => setDay(i)}><b>{labels[i]}</b><span>{w ? w.title : "Rest"}</span>{w && <small>{doneDays.includes(i) ? "Done ✓" : formatTime(w.time) ?? ""}{w.meetingUrl ? " · live" : ""}</small>}</button>
        </li>)}</ul>
      </aside>
    </div>
  </>;
}

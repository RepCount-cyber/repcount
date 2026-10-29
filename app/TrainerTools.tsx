"use client";

import {useState} from "react";
import {Icon} from "./Media";
import {confirmSession, saveNutritionPlan} from "./actions/data";
import {dayNames, formatTime, type WeekPlan} from "@/lib/schedule";
import {defaultMeals, type NutritionPlan, type PlannedMeal} from "@/lib/nutritionPlan";
import {shiftDay} from "@/lib/streak";

type Result = {ok?: string; error?: string};
type Run = (action: () => Promise<Result>) => void;

/** This week's planned sessions for one member: join today's call, see what the member marked done, and confirm sessions that happened. */
export function SessionChecklist({clientId, firstName, plan, weekStart, today, memberDone, confirmed, pending, run}: {
  clientId: string; firstName: string; plan: WeekPlan | null; weekStart: string; today: string;
  memberDone: number[]; confirmed: string[]; pending: boolean; run: Run;
}) {
  const days = Array.from({length: 7}, (_, i) => ({i, iso: shiftDay(weekStart, i), workout: plan?.[i] ?? null})).filter(d => d.workout);
  return <section className="card rc-sessions">
    <div className="section-top"><h2>Sessions this week</h2><span className="pill">{confirmed.length} CONFIRMED</span></div>
    {days.length === 0 ? <p className="rc-staff-empty">No workouts scheduled this week. Plan {firstName}’s week in Workout plan.</p>
      : <ul className="rc-staff-list">{days.map(({i, iso, workout}) => {
        const isConfirmed = confirmed.includes(iso);
        const future = iso > today;
        return <li key={iso} className={iso === today ? "rc-session-today" : undefined}>
          <span className="avatar">{dayNames[i].slice(0, 2)}</span>
          <div><b>{iso === today ? "Today · " : ""}{workout!.title}</b><small>{dayNames[i]}{workout!.time ? ` · ${formatTime(workout!.time)} IST` : ""} · {memberDone.includes(i) ? `${firstName} marked it done` : `not marked by ${firstName}`}</small></div>
          {workout!.meetingUrl && iso === today && <a className="button outline rc-join" href={workout!.meetingUrl} target="_blank" rel="noopener noreferrer"><Icon name="video" size={16}/> Join</a>}
          {future ? <span className="pill">UPCOMING</span>
            : <button className={isConfirmed ? "button outline" : "button dark"} disabled={pending} aria-pressed={isConfirmed} onClick={() => run(() => confirmSession(clientId, iso, !isConfirmed))}>{isConfirmed ? "Completed ✓ · undo" : "Mark session completed"}</button>}
        </li>;
      })}</ul>}
  </section>;
}

/** The trainer writes daily targets, meals and notes; the member sees them on their Nutrition page. */
export function NutritionPlanEditor({clientId, firstName, plan, pending, run}: {clientId: string; firstName: string; plan: NutritionPlan | null; pending: boolean; run: Run}) {
  const [calories, setCalories] = useState(plan?.calories ? String(plan.calories) : "");
  const [protein, setProtein] = useState(plan?.protein ? String(plan.protein) : "");
  const [meals, setMeals] = useState<PlannedMeal[]>(plan?.meals.length ? plan.meals : defaultMeals);
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const update = (i: number, change: Partial<PlannedMeal>) => setMeals(meals.map((m, j) => j === i ? {...m, ...change} : m));
  const toPlan = () => ({calories: calories ? Number(calories) : null, protein: protein ? Number(protein) : null, meals, notes});
  return <section className="card rc-nutrition-editor">
    <div className="section-top"><h2>{firstName}’s nutrition plan</h2><span className="pill">{plan ? "SHARED WITH MEMBER" : "NOT SET"}</span></div>
    <form onSubmit={e => {e.preventDefault(); run(() => saveNutritionPlan(clientId, toPlan()));}}>
      <div className="rc-staff-settings">
        <label><span>Daily calories (kcal)</span><input type="number" min={500} max={6000} step={50} value={calories} onChange={e => setCalories(e.target.value)} placeholder="e.g. 1800"/></label>
        <label><span>Daily protein (g)</span><input type="number" min={10} max={400} step={5} value={protein} onChange={e => setProtein(e.target.value)} placeholder="e.g. 110"/></label>
      </div>
      <ol className="rc-meal-rows">{meals.map((m, i) => <li key={i}>
        <label><span>Meal</span><input value={m.name} onChange={e => update(i, {name: e.target.value})} maxLength={30}/></label>
        <label className="rc-schedule-wide"><span>What to eat</span><textarea rows={2} value={m.detail} onChange={e => update(i, {detail: e.target.value})} maxLength={300} placeholder="e.g. 2 eggs, 2 slices wholegrain toast, a banana"/></label>
        <button type="button" className="small-button" onClick={() => setMeals(meals.filter((_, j) => j !== i))} aria-label={`Remove ${m.name || "meal"}`}>Remove</button>
      </li>)}</ol>
      {meals.length < 8 && <button type="button" className="small-button" onClick={() => setMeals([...meals, {name: "Snack", detail: ""}])}>+ Add meal</button>}
      <label className="rc-nutrition-notes"><span>Notes for {firstName}</span><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} placeholder="Hydration, foods to limit, timing around workouts…"/></label>
      <p className="small-note">Meals left blank aren’t shown. Clearing everything removes the plan.</p>
      <button className="button dark" type="submit" disabled={pending}>{pending ? "Saving…" : "Save nutrition plan"}</button>
    </form>
  </section>;
}

"use client";

import {useId, useState} from "react";
import type {CSSProperties, ReactNode} from "react";
import {Icon} from "./Media";
import type {MemberState} from "@/lib/memberState";
import type {DayLog} from "@/lib/store";
import "./tracker.css";

/* ------------------------------------------------------------------ */
/* Daily tracker. Today's entries save per member; past days come from */
/* the member's archived history (lib/store.ts getMemberDays).          */
/* ------------------------------------------------------------------ */

export const palette = {red: "#e51937", ink: "#292d26", sage: "#7d8f6b", clay: "#d9a47f", lilac: "#9b8fb8", mist: "#c9cdbf"};
const stepGoal = 6000;
const moods = ["Low", "Okay", "Good", "Great"] as const;
type Mood = (typeof moods)[number];
type Point = {label: string; value: number};

const dayMs = 86400000;
const shiftDay = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * dayMs).toISOString().slice(0, 10);
const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {weekday: "short", timeZone: "UTC"});
/** 0 = nothing logged, 1-3 = how much of the daily tracker was filled in. */
const level = (checks: boolean[]) => Math.min(3, Math.round((checks.filter(Boolean).length / 5) * 3));

/** Points are labelled with the day they were logged (YYYY-MM-DD); logging again the same day replaces that day's entry. */
function upsertDay(points: Point[], day: string, value: number): Point[] {
  const rounded = Math.round(value * 10) / 10;
  return [...points.filter(p => p.label !== day), {label: day, value: rounded}].slice(-60);
}
const chartLabel = (label: string) => /^\d{4}-\d{2}-\d{2}$/.test(label)
  ? new Date(`${label}T00:00:00Z`).toLocaleDateString("en-GB", {day: "numeric", month: "short", timeZone: "UTC"})
  : label;
const forChart = (points: Point[]) => points.map(p => ({label: chartLabel(p.label), value: p.value}));

/**
 * Today's tracker plus the member's past days. `since` is the first day of their 30-day calendar
 * (the day they joined, or 29 days ago, whichever is later).
 */
export function useTracker(initial: MemberState["tracker"] | undefined, day: string, history: DayLog[] = [], since: string = day, past: {streak: number; confirmedToday: boolean} = {streak: 0, confirmedToday: false}) {
  const [water, setWater] = useState(initial?.water ?? 0);
  const [steps, setSteps] = useState(initial?.steps ?? 0);
  const [sleep, setSleep] = useState<number | null>(initial?.sleep ?? null);
  const [mood, setMood] = useState<Mood | null>((initial?.mood as Mood | null) ?? null);
  const [trained, setTrained] = useState(initial?.trained ?? false);
  const [weights, setWeights] = useState<Point[]>(initial?.weights ?? []);
  const [fats, setFats] = useState<Point[]>(initial?.fats ?? []);
  const checks = [water > 0, steps > 0, sleep !== null, mood !== null, trained];
  const done = checks.filter(Boolean).length;
  const byDay = new Map(history.map(h => [h.day, h]));
  const pastLevels: number[] = [];
  for (let d = since; d < day && pastLevels.length < 29; d = shiftDay(d, 1)) {
    const h = byDay.get(d);
    pastLevels.push(h ? level([h.water > 0, h.steps > 0, h.sleep !== null, h.mood !== null, h.trained]) : 0);
  }
  const journey = [...pastLevels, level(checks)];
  // The last six days before today, for the habit charts (zero when nothing was logged).
  const recent = Array.from({length: 6}, (_, i) => {
    const d = shiftDay(day, i - 6);
    const h = byDay.get(d);
    return {label: weekday(d), steps: h?.steps ?? 0, sleep: h?.sleep ?? 0, water: h?.water ?? 0};
  });
  // Consecutive completed days (counted on the server up to yesterday), plus today once it's marked complete or the trainer confirmed it.
  const streak = past.streak + (trained || past.confirmedToday ? 1 : 0);
  return {
    water, setWater, steps, setSteps, sleep, setSleep, mood, setMood, trained, setTrained,
    weights, fats, done, checks, journey, streak, recent,
    logWeight: (value: number) => setWeights(previous => upsertDay(previous, day, value)),
    logFat: (value: number) => setFats(previous => upsertDay(previous, day, value)),
  };
}
export type Tracker = ReturnType<typeof useTracker>;

/* ------------------------------ charts ------------------------------ */

function DataTable({caption, head, rows}: {caption: string; head: string[]; rows: (string | number)[][]}) {
  return <details className="tk-data"><summary>View chart data</summary><table><caption>{caption}</caption><thead><tr>{head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>)}</tr>)}</tbody></table></details>;
}

export function LineChart({points, target, targetLabel, unit, color = palette.red, label, decimals = 1}: {points: Point[]; target?: number; targetLabel?: string; unit: string; color?: string; label: string; decimals?: number}) {
  const W = 360, H = 200, L = 40, R = 16, T = 18, B = 30;
  const gradient = useId().replace(/:/g, "");
  const values = points.map(p => p.value);
  const all = target === undefined ? values : [...values, target];
  const lo = Math.floor(Math.min(...all) - 1), hi = Math.ceil(Math.max(...all) + 1);
  const x = (i: number) => L + (points.length < 2 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [0, 1, 2, 3].map(i => lo + ((hi - lo) * i) / 3);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join("");
  const area = `${path}L${x(points.length - 1).toFixed(1)} ${H - B}L${x(0).toFixed(1)} ${H - B}Z`;
  const last = points[points.length - 1];
  const first = points[0];
  const summary = `${label}: from ${first.value.toFixed(decimals)} ${unit} to ${last.value.toFixed(decimals)} ${unit}${target !== undefined ? `, target ${target} ${unit}` : ""}.`;
  const step = points.length > 8 ? 2 : 1;
  return <figure className="tk-chart">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
      <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".22"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      {ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="tk-grid"/><text x={L - 6} y={y(t) + 3} textAnchor="end" className="tk-axis">{t.toFixed(0)}</text></g>)}
      {target !== undefined && <g><line x1={L} x2={W - R} y1={y(target)} y2={y(target)} className="tk-target"/><text x={W - R} y={y(target) - 5} textAnchor="end" className="tk-target-label">{targetLabel ?? `Target ${target} ${unit}`}</text></g>}
      <path d={area} fill={`url(#${gradient})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/>
      {points.map((p, i) => <circle key={p.label + i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4.6 : 3} fill={i === points.length - 1 ? color : "#fffdf8"} stroke={color} strokeWidth="2"/>)}
      <text x={x(points.length - 1)} y={y(last.value) - 10} textAnchor={points.length > 1 ? "end" : "middle"} className="tk-value">{last.value.toFixed(decimals)}</text>
      {points.map((p, i) => i % step === 0 || i === points.length - 1 ? <text key={p.label + i} x={x(i)} y={H - 10} textAnchor="middle" className="tk-axis">{p.label}</text> : null)}
    </svg>
    <DataTable caption={label} head={["Entry", unit]} rows={points.map(p => [p.label, p.value.toFixed(decimals)])}/>
  </figure>;
}

type Bar = {label: string; value: number; planned?: number; highlight?: boolean};
export function BarChart({bars, unit, label, color = palette.sage, format = (n: number) => String(n), emptyLabel = "Planned", rowLabel = "Day"}: {bars: Bar[]; unit: string; label: string; color?: string; format?: (n: number) => string; emptyLabel?: string; rowLabel?: string}) {
  const W = 360, H = 200, L = 14, R = 14, T = 24, B = 30;
  const max = Math.max(1, ...bars.map(b => Math.max(b.value, b.planned ?? 0))) * 1.15;
  const slot = (W - L - R) / bars.length;
  const bw = Math.min(30, slot * 0.58);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const summary = `${label}: ${bars.map(b => `${b.label} ${format(b.value)} ${unit}`).join(", ")}.`;
  return <figure className="tk-chart">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} className="tk-grid"/>
      {bars.map((b, i) => {
        const cx = L + slot * i + slot / 2;
        return <g key={b.label + i}>
          {b.planned ? <rect x={cx - bw / 2} y={y(b.planned)} width={bw} height={H - B - y(b.planned)} rx="5" className="tk-ghost"/> : null}
          {b.value > 0 && <rect x={cx - bw / 2} y={y(b.value)} width={bw} height={H - B - y(b.value)} rx="5" fill={b.highlight ? palette.red : color}/>}
          <text x={cx} y={(b.value > 0 ? y(b.value) : b.planned ? y(b.planned) : H - B) - 6} textAnchor="middle" className="tk-value tk-small">{b.value > 0 ? format(b.value) : b.planned ? emptyLabel : ""}</text>
          <text x={cx} y={H - 10} textAnchor="middle" className="tk-axis">{b.label}</text>
        </g>;
      })}
    </svg>
    <DataTable caption={label} head={[rowLabel, unit, "Planned"]} rows={bars.map(b => [b.label, format(b.value), b.planned ? format(b.planned) : "-"])}/>
  </figure>;
}

type Slice = {label: string; value: number; color: string; note?: string};
export function Donut({slices, centerBig, centerSmall, label, unit = ""}: {slices: Slice[]; centerBig: string; centerSmall: string; label: string; unit?: string}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 48, c = 2 * Math.PI * r;
  let offset = 0;
  const summary = `${label}: ${slices.map(s => `${s.label} ${total ? Math.round((s.value / total) * 100) : 0} percent`).join(", ")}.`;
  return <figure className="tk-donut">
    <svg viewBox="0 0 140 140" role="img" aria-label={summary}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#ece8de" strokeWidth="17"/>
      {total > 0 && slices.map(s => {
        const len = (s.value / total) * c;
        const el = <circle key={s.label} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="17" strokeDasharray={`${Math.max(0, len - 2)} ${c - Math.max(0, len - 2)}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)"/>;
        offset += len;
        return el;
      })}
      <text x="70" y="68" textAnchor="middle" className="tk-donut-big">{centerBig}</text>
      <text x="70" y="85" textAnchor="middle" className="tk-donut-small">{centerSmall}</text>
    </svg>
    <ul className="tk-legend">{slices.map(s => <li key={s.label}><i style={{background: s.color}}/><span>{s.label}{s.note ? <small>{s.note}</small> : null}</span><b>{total ? Math.round((s.value / total) * 100) : 0}%{unit ? <small>{s.value}{unit}</small> : null}</b></li>)}</ul>
  </figure>;
}

function Panel({eyebrow, title, children, className = ""}: {eyebrow: string; title: string; children: ReactNode; className?: string}) {
  return <section className={`card tk-panel ${className}`}><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{children}</section>;
}

function Meter({value, max, label}: {value: number; max: number; label: string}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return <div className="tk-meter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{width: `${pct}%`}}/></div>;
}

/* ------------------------- daily tracker card ------------------------ */

export function DailyTracker({t, onProgress}: {t: Tracker; onProgress?: () => void}) {
  const ring = {"--progress": `${(t.done / 5) * 100}%`} as CSSProperties;
  return <section className="card tk-daily" aria-labelledby="tk-daily-title">
    <div className="tk-daily-head">
      <div><span className="eyebrow">YOUR DAILY TRACKER</span><h2 id="tk-daily-title">Today, in a few taps.</h2><p>Log how your day is going. Your trainer sees only what you choose to share.</p></div>
      <div className="tk-ring" style={ring} role="img" aria-label={`${t.done} of 5 daily check-ins complete`}><div><strong>{t.done}<small>/5</small></strong><span>check-ins</span></div></div>
    </div>
    <div className="tk-daily-grid">
      <div className="tk-tile">
        <span className="tk-tile-label"><Icon name="leaf" size={16}/> Water</span>
        <div className="tk-stepper"><button aria-label="Remove one glass" disabled={!t.water} onClick={() => t.setWater(Math.max(0, t.water - 1))}>−</button><strong aria-live="polite">{t.water}<small>{t.water === 1 ? "glass" : "glasses"}</small></strong><button aria-label="Add one glass" onClick={() => t.setWater(t.water + 1)}>+</button></div>
      </div>
      <div className="tk-tile">
        <span className="tk-tile-label"><Icon name="move" size={16}/> Steps</span>
        <strong className="tk-big" aria-live="polite">{t.steps.toLocaleString("en-IN")}</strong>
        <input type="range" min={0} max={15000} step={250} value={t.steps} aria-label="Steps today" onChange={e => t.setSteps(Number(e.target.value))}/>
        <Meter value={t.steps} max={stepGoal} label="Progress to daily step goal"/>
        <small>{t.steps >= stepGoal ? "Daily goal reached" : `Daily goal ${stepGoal.toLocaleString("en-IN")}`}</small>
      </div>
      <div className="tk-tile">
        <span className="tk-tile-label"><Icon name="sun" size={16}/> Sleep last night</span>
        <div className="tk-chips" role="group" aria-label="Hours slept">{[5, 6, 7, 8, 9].map(h => <button key={h} aria-pressed={t.sleep === h} onClick={() => t.setSleep(t.sleep === h ? null : h)}>{h}h</button>)}</div>
        <small>{t.sleep === null ? "Tap to log" : `${t.sleep} hours logged`}</small>
      </div>
      <div className="tk-tile">
        <span className="tk-tile-label"><Icon name="heart" size={16}/> How do you feel?</span>
        <div className="tk-chips" role="group" aria-label="Mood">{moods.map(m => <button key={m} aria-pressed={t.mood === m} onClick={() => t.setMood(t.mood === m ? null : m)}>{m}</button>)}</div>
        <small>{t.mood === null ? "Tap to log" : `Feeling ${t.mood.toLowerCase()}`}</small>
      </div>
      <div className="tk-tile">
        <span className="tk-tile-label"><Icon name="check" size={16}/> Today complete?</span>
        <button className={t.trained ? "tk-toggle on" : "tk-toggle"} aria-pressed={t.trained} onClick={() => t.setTrained(!t.trained)}>{t.trained ? "Today complete ✓" : "Mark today complete"}</button>
        <small>Completed days build your streak and leaderboard score.</small>
      </div>
    </div>
    {onProgress && <button className="text-button" onClick={onProgress}>See all progress charts <span><Icon name="arrow" size={16}/></span></button>}
    <p className="tk-note">Entries save to your account automatically and start fresh each day.</p>
  </section>;
}

/* --------------------------- progress screen -------------------------- */

/** week: workouts completed and planned this week (from the trainer schedule) and the minutes they add up to. */
export function ProgressDashboard({t, week, checkinNode}: {t: Tracker; week: {done: number; planned: number; minutes: number}; checkinNode: ReactNode}) {
  const [metric, setMetric] = useState<"Steps" | "Sleep" | "Water">("Steps");
  const [weightInput, setWeightInput] = useState("");
  const [fatInput, setFatInput] = useState("");
  const [message, setMessage] = useState("");
  // Progress is measured from the member's first weigh-in; with no entries yet the cards invite one.
  const current = t.weights.at(-1)?.value ?? null;
  const startWeight = t.weights[0]?.value ?? null;
  const fat = t.fats.at(-1)?.value ?? null;
  const lost = current !== null && startWeight !== null ? startWeight - current : 0;
  const lastWeighIn = t.weights.at(-1)?.label;
  const habit = metric === "Steps"
    ? {bars: [...t.recent.map(r => ({label: r.label, value: r.steps})), {label: "Today", value: t.steps, highlight: true}], unit: "steps", format: (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))}
    : metric === "Sleep"
      ? {bars: [...t.recent.map(r => ({label: r.label, value: r.sleep})), {label: "Today", value: t.sleep ?? 0, highlight: true}], unit: "hours", format: (n: number) => `${n}h`}
      : {bars: [...t.recent.map(r => ({label: r.label, value: r.water})), {label: "Today", value: t.water, highlight: true}], unit: "glasses", format: (n: number) => String(n)};
  const habitColor = metric === "Steps" ? palette.sage : metric === "Sleep" ? palette.lilac : palette.clay;
  function submit(kind: "weight" | "fat") {
    const raw = kind === "weight" ? weightInput : fatInput;
    const value = Number(raw);
    const [min, max] = kind === "weight" ? [30, 250] : [3, 60];
    if (!raw || !Number.isFinite(value) || value < min || value > max) { setMessage(`Enter a ${kind === "weight" ? "weight in kg" : "body-fat %"} between ${min} and ${max}.`); return; }
    if (kind === "weight") { t.logWeight(value); setWeightInput(""); } else { t.logFat(value); setFatInput(""); }
    setMessage(`${kind === "weight" ? "Weigh-in" : "Body-fat estimate"} saved and added to your chart.`);
  }
  return <div className="tk-progress">
    <div className="tk-kpis">
      <section className="card tk-kpi"><span className="eyebrow">CURRENT WEIGHT</span><strong>{current !== null ? current.toFixed(1) : "—"}<small>kg</small></strong><p>{current === null ? "Log your first weigh-in below." : t.weights.length < 2 ? "Your starting point." : lost > 0 ? `${lost.toFixed(1)} kg since your first weigh-in` : lost < 0 ? `${Math.abs(lost).toFixed(1)} kg above your first weigh-in` : "Same as your first weigh-in"}</p></section>
      <section className="card tk-kpi"><span className="eyebrow">WEIGH-INS</span><strong>{t.weights.length}<small>logged</small></strong><p>{lastWeighIn ? `Last on ${chartLabel(lastWeighIn)}` : "Weigh in once a week, same time of day."}</p></section>
      <section className="card tk-kpi"><span className="eyebrow">BODY FAT (ESTIMATE)</span><strong>{fat !== null ? fat.toFixed(1) : "—"}<small>%</small></strong><p>{fat === null ? "Log an estimate below." : "Your latest estimate."}</p></section>
      <section className="card tk-kpi"><span className="eyebrow">CONSISTENCY STREAK</span><strong>{t.streak}<small>{t.streak === 1 ? "day" : "days"}</small></strong><p>{t.done} of 5 check-ins today</p></section>
    </div>

    <div className="tk-grid-2">
      <Panel eyebrow="WEIGHT TREND" title="Steady beats fast.">
        {t.weights.length > 0 ? <LineChart points={forChart(t.weights)} unit="kg" label="Weight trend"/> : <p className="tk-caption">No weigh-ins yet. Your trend appears here once you log one.</p>}
        <form className="tk-log" onSubmit={e => { e.preventDefault(); submit("weight"); }}><label>Log today&rsquo;s weight (kg)<input inputMode="decimal" value={weightInput} onChange={e => setWeightInput(e.target.value)} placeholder="e.g. 77.4" maxLength={5}/></label><button className="button dark" type="submit">Save weigh-in</button></form>
      </Panel>
      <Panel eyebrow="BODY COMPOSITION" title="Body fat, in context.">
        {t.fats.length > 0 ? <LineChart points={forChart(t.fats)} unit="%" label="Body-fat estimate" color={palette.lilac}/> : <p className="tk-caption">No estimates yet. Your trend appears here once you log one.</p>}
        <form className="tk-log" onSubmit={e => { e.preventDefault(); submit("fat"); }}><label>Log body-fat estimate (%)<input inputMode="decimal" value={fatInput} onChange={e => setFatInput(e.target.value)} placeholder="e.g. 26.4" maxLength={5}/></label><button className="button dark" type="submit">Save estimate</button></form>
      </Panel>
    </div>
    {message && <p className="tk-message" role="status">{message}</p>}

    <div className="tk-grid-2">
      <Panel eyebrow="THIS WEEK" title="Workouts done.">
        {week.planned > 0 ? <>
          <Meter value={week.done} max={week.planned} label="Planned workouts completed this week"/>
          <p className="tk-caption"><b>{week.done} of {week.planned}</b> planned workouts · <b>{week.minutes}</b> minutes</p>
        </> : <p className="tk-caption">Your trainer hasn’t scheduled this week yet. Your workouts appear here once they do.</p>}
      </Panel>
      <Panel eyebrow="DAILY HABITS" title="Small things, tracked.">
        <div className="tk-seg" role="group" aria-label="Habit to chart">{(["Steps", "Sleep", "Water"] as const).map(m => <button key={m} aria-pressed={metric === m} onClick={() => setMetric(m)}>{m}</button>)}</div>
        <BarChart bars={habit.bars} unit={habit.unit} label={`${metric} over the last week`} color={habitColor} format={habit.format}/>
      </Panel>
    </div>

    <Panel eyebrow="30-DAY JOURNEY" title="Show-up calendar." className="tk-wide">
      <div className="tk-cal" role="img" aria-label={`Day-by-day check-ins for the 30-day journey. Current streak ${t.streak} days.`}>
        {Array.from({length: 30}, (_, i) => {
          const level = t.journey[i];
          return <span key={i} className={`tk-cell l${level ?? "x"}${i === t.journey.length - 1 ? " today" : ""}`} title={level === undefined ? `Day ${i + 1}` : `Day ${i + 1}: ${level === 0 ? "no check-ins" : `${level} of 3 intensity`}`}><small>{i + 1}</small></span>;
        })}
      </div>
      <ul className="tk-key"><li><i className="l0"/>Missed</li><li><i className="l1"/>A little</li><li><i className="l2"/>Good</li><li><i className="l3"/>Full day</li><li><i className="lx"/>Still ahead</li></ul>
    </Panel>

    {checkinNode}
    <p className="tk-disclaimer">Today’s entries save automatically; earlier days come from your own log. Body-fat figures from scales and calipers are estimates that vary by method. This is not a health score, diagnosis or medical advice.</p>
  </div>;
}

/* --------------------------- nutrition charts ------------------------- */

export type Macros = {kcal: number; protein: number; carbs: number; fat: number};
export function NutritionBalance({totals, meals, waterByDay}: {totals: Macros; meals: {name: string; kcal: number; logged: boolean}[]; waterByDay: {label: string; value: number}[]}) {
  const any = totals.kcal > 0;
  return <section className="card tk-panel tk-nutrition" aria-labelledby="tk-nut-title">
    <span className="eyebrow">TODAY&rsquo;S BALANCE · ESTIMATES</span><h2 id="tk-nut-title">What your logged meals add up to.</h2>
    <div className="tk-grid-3 tk-inner">
      <div><h3>Macro split</h3>
        <Donut label="Macro split of logged meals" centerBig={any ? String(totals.kcal) : "–"} centerSmall={any ? "kcal logged" : "log a meal"} unit="g" slices={any ? [
          {label: "Protein", value: totals.protein, color: palette.red}, {label: "Carbs", value: totals.carbs, color: palette.sage}, {label: "Fat", value: totals.fat, color: palette.clay},
        ] : []}/></div>
      <div><h3>Energy by meal</h3>
        <BarChart label="Estimated energy per meal" unit="kcal" color={palette.sage} bars={meals.map(m => ({label: m.name, value: m.logged ? m.kcal : 0, planned: m.kcal, highlight: m.logged}))} format={n => String(n)}/></div>
      <div><h3>Water this week</h3>
        <BarChart label="Glasses of water logged per day" unit="glasses" color={palette.lilac} bars={waterByDay} format={n => String(n)}/></div>
    </div>
    <p className="tk-note">Estimated values for the suggested meals. No calorie or intake target is set and this is not an individual diet plan.</p>
  </section>;
}

/* ----------------------------- membership ----------------------------- */

/** The 30-day programme, counted from the day the member joined. Null start = not activated yet. */
export function JourneyTimeline({start, today, weekly, target}: {start: {iso: string; label: string; end: string} | null; today: string; weekly: number; target: number}) {
  const day = start ? Math.min(30, Math.max(1, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${start.iso}T00:00:00Z`)) / dayMs) + 1)) : 0;
  const stops = [[1, "Onboarding conversation"], [3, "First personal plan"], [8, "Trainer check-in 1"], [15, "Trainer check-in 2"], [22, "Trainer check-in 3"], [30, "30-day reflection"]] as const;
  return <section className="card tk-panel tk-wide">
    <span className="eyebrow">{start ? `YOUR 30 DAYS · ${start.label.toUpperCase()} – ${start.end.toUpperCase()}` : "YOUR 30 DAYS"}</span><h2>{start ? `Day ${day} of 30.` : "Starts when you’re activated."}</h2>
    <Meter value={day} max={30} label="Days of the 30-day programme elapsed"/>
    <ol className="tk-timeline">{stops.map(([d, t]) => <li key={d} className={day >= d ? "done" : ""}><i/><b>Day {d}</b><span>{t}</span></li>)}</ol>
    <div className="tk-use">
      <div><strong>{weekly}/{target}</strong><span>workouts this week</span></div><div><strong>{Math.min(3, Math.floor(Math.max(0, day - 1) / 7))}/3</strong><span>trainer check-ins due so far</span></div><div><strong>{Math.max(0, 30 - day)}</strong><span>days to go</span></div>
    </div>
  </section>;
}

/* ------------------------------ staff view ---------------------------- */

export type StaffClient = {name: string; stage: string; paid: boolean; progress: number; trainer: string};
export function StaffInsights({clients}: {clients: StaffClient[]}) {
  const stages = ["Active", "Onboarding", "Check-in due", "Payment review"];
  const colors = [palette.sage, palette.lilac, palette.clay, palette.red];
  const stageSlices = stages.map((s, i) => ({label: s, value: clients.filter(c => c.stage === s).length, color: colors[i]})).filter(s => s.value > 0);
  const paid = clients.filter(c => c.paid).length;
  const avg = clients.length ? Math.round(clients.reduce((s, c) => s + c.progress, 0) / clients.length) : 0;
  const trainers = ["Akif", "Unassigned"].map(n => ({label: n, value: clients.filter(c => (n === "Akif" ? c.trainer !== "Unassigned" : c.trainer === "Unassigned")).length}));
  return <section className="card tk-panel tk-wide" aria-labelledby="tk-staff-title">
    <span className="eyebrow">COHORT SNAPSHOT</span><h2 id="tk-staff-title">How the cohort is doing.</h2>
    <div className="tk-grid-3 tk-inner">
      <div><h3>Where clients are</h3><Donut label="Clients by stage" centerBig={String(clients.length)} centerSmall="clients" slices={stageSlices}/></div>
      <div><h3>Weekly workout completion</h3><BarChart label="Weekly completion per client" unit="percent" color={palette.sage} bars={clients.map(c => ({label: c.name.split(" ")[0], value: c.progress, planned: 100}))} format={n => `${n}%`}/><p className="tk-caption">Cohort average <b>{avg}%</b></p></div>
      <div><h3>Payments &amp; coverage</h3><Donut label="Payments verified" centerBig={`${paid}/${clients.length}`} centerSmall="verified" slices={[{label: "Verified", value: paid, color: palette.sage}, {label: "Awaiting review", value: clients.length - paid, color: palette.red}]}/>
        <Donut label="Trainer assignment" centerBig={`${trainers[0].value}/${clients.length}`} centerSmall="assigned" slices={[{label: "Assigned", value: trainers[0].value, color: palette.lilac}, {label: "Unassigned", value: trainers[1].value, color: palette.mist}]}/></div>
    </div>
    <p className="tk-note">Updates as clients log progress and staff verify payments.</p>
  </section>;
}

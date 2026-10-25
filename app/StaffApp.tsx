"use client";

import Photo from "./Photo";
import {useState, useTransition, type ReactNode} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import Brand from "./Brand";
import {Icon} from "./Media";
import {BarChart, StaffInsights, palette} from "./Tracker";
import {logout} from "./actions/auth";
import {addTrainer, assignTrainer, reviewCheckin, saveSettings, verifyPayment} from "./actions/data";
import type {AuditEntry, ClientRow, Settings, TrainerStats} from "@/lib/store";
import type {WeekPlan} from "@/lib/schedule";
import ScheduleEditor from "./ScheduleEditor";
import "./member-polish.css";
import "./accessibility-polish.css";
import "./staff.css";

export type StaffRole = "trainer" | "admin";
export type StaffUser = {name: string; initials: string; email: string};

const tabs: Record<StaffRole, [string, string, string][]> = {
  trainer: [["today", "home", "Today"], ["schedule", "calendar", "Workout schedule"], ["clients", "move", "My clients"], ["checkins", "chat", "Check-ins"]],
  admin: [["overview", "chart", "Overview"], ["clients", "move", "Clients & payments"], ["trainers", "heart", "Trainers"], ["settings", "lock", "Programme settings"]],
};
const headings: Record<string, [string, string]> = {
  today: ["Today’s floor.", "Who’s training, who needs a nudge, and what’s next."],
  clients: ["Your people.", "Progress, payments and trainer assignment in one view."],
  checkins: ["Weekly check-ins.", "Review how each client’s week went and adjust their plan."],
  schedule: ["Plan the week.", "Assign workouts day by day and add live-session links your clients can join."],
  overview: ["The whole gym, at a glance.", "Cohort health, payments and trainer coverage."],
  trainers: ["Your coaching team.", "Workload, results and capacity for every trainer."],
  settings: ["Programme settings.", "Pricing and cohort rules for the pilot."],
};

export const activityLabels: Record<string, string> = {assign_trainer: "Trainer assigned", verify_payment: "Payment verified", review_checkin: "Check-in reviewed", update_settings: "Settings updated", add_trainer: "Trainer added", schedule_week: "Week scheduled", set_meeting_link: "Call link updated"};
const stageOrder = ["Payment review", "Onboarding", "Check-in due", "Active"];
const sorters: Record<string, (a: ClientRow, b: ClientRow) => number> = {
  Name: (a, b) => a.name.localeCompare(b.name),
  Trainer: (a, b) => (a.trainer === "Unassigned" ? 1 : 0) - (b.trainer === "Unassigned" ? 1 : 0) || a.trainer.localeCompare(b.trainer) || a.name.localeCompare(b.name),
  "Progress (high to low)": (a, b) => b.progress - a.progress || a.name.localeCompare(b.name),
  Stage: (a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage) || a.name.localeCompare(b.name),
};
const emptyTrainer = {name: "", email: "", title: "Trainer", capacity: "8", password: ""};

type Props = {
  area: StaffRole; user: StaffUser; clients: ClientRow[]; settings: Settings; activity: AuditEntry[];
  trainers?: TrainerStats[]; initialTab?: string; detail?: ReactNode;
  weeks?: {start: string; label: string}[]; plans?: Record<string, WeekPlan | null>;
};

export default function StaffApp({area: role, user, clients, settings, activity, trainers = [], initialTab, detail, weeks = [], plans = {}}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab && tabs[role].some(([key]) => key === initialTab) ? initialTab : tabs[role][0][0]);
  const [filter, setFilter] = useState("All clients");
  const [trainerFilter, setTrainerFilter] = useState("All trainers");
  const [sort, setSort] = useState("Trainer");
  const [newTrainer, setNewTrainer] = useState(emptyTrainer);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(settings);
  // Server actions re-check the role; the refreshed clients arrive as new props.
  const run = (action: () => Promise<{ok?: string; error?: string}>) => startTransition(async () => {
    const result = await action();
    setNoticeError(!result.ok);
    setNotice(result.ok ?? result.error ?? "");
  });
  const mine = clients;
  const dueCheckIns = mine.filter(c => c.stage === "Check-in due");
  const visible = mine
    .filter(c => c.name.toLowerCase().includes(query.toLowerCase()) && (filter === "All clients" || c.stage === filter) && (trainerFilter === "All trainers" || c.trainer === trainerFilter))
    .sort(sorters[sort]);
  const openTab = (key: string) => {
    setNotice("");
    if (detail) router.push(`/${role}?tab=${key}`);
    else setTab(key);
  };
  const [title, subtitle] = headings[tab];

  const metrics: [string, string][] = role === "trainer"
    ? [[String(mine.length), "Clients assigned to you"], [String(mine.filter(c => c.lastWorkout === "Today").length), "Trained today"], [String(dueCheckIns.length), "Check-ins waiting"]]
    : [[String(clients.length), "Clients in cohort"], [String(clients.filter(c => !c.paid).length), "Payments awaiting review"], [String(clients.filter(c => c.trainer === "Unassigned").length), "Clients without a trainer"]];

  const roster = <section className="card">
    <div className="section-top"><h2>{role === "trainer" ? "Assigned clients" : "Client roster"}</h2><span className="pill">{visible.length} SHOWN</span></div>
    <div className="filters"><input aria-label="Search clients" placeholder="Search client name…" value={query} onChange={e => setQuery(e.target.value)}/><select aria-label="Filter clients by stage" value={filter} onChange={e => setFilter(e.target.value)}><option>All clients</option><option>Active</option><option>Onboarding</option><option>Check-in due</option>{role === "admin" && <option>Payment review</option>}</select>{role === "admin" && <><select aria-label="Filter clients by trainer" value={trainerFilter} onChange={e => setTrainerFilter(e.target.value)}><option>All trainers</option>{trainers.map(t => <option key={t.id}>{t.name}</option>)}<option>Unassigned</option></select><select aria-label="Sort clients" value={sort} onChange={e => setSort(e.target.value)}>{Object.keys(sorters).map(k => <option key={k} value={k}>Sort: {k}</option>)}</select></>}</div>
    <div className="table-scroll"><table><thead><tr><th>Client</th><th>Stage</th>{role === "admin" ? <th>Trainer</th> : <th>Goal</th>}<th>Weekly progress</th>{role === "admin" ? <th>Payment</th> : <th>Last workout</th>}</tr></thead><tbody>
      {visible.map(c => <tr key={c.id}>
        <td><span className="client-name"><span className="avatar">{c.initials}</span>{role === "admin" ? <Link className="rc-client-link" href={`/admin/clients/${c.id}`}><b>{c.name}</b><small>View details →</small></Link> : <b>{c.name}</b>}</span></td>
        <td><span className="pill">{c.stage}</span></td>
        {role === "admin"
          ? <td><select aria-label={`Trainer for ${c.name}`} value={c.trainer} disabled={pending} onChange={e => {const trainer = e.target.value; run(() => assignTrainer(c.id, trainer));}}><option>Unassigned</option>{trainers.map(t => <option key={t.id}>{t.name}</option>)}</select></td>
          : <td>{c.goal}</td>}
        <td><progress max="100" value={c.progress} aria-label={`${c.name} workout completion`}/><small>{c.progress}%</small></td>
        {role === "admin"
          ? <td>{c.paid ? <span className="paid">Verified ✓</span> : <button className="small-button" disabled={pending} onClick={() => run(() => verifyPayment(c.id))}>Verify {c.reference ?? "payment"}</button>}</td>
          : <td>{c.lastWorkout}</td>}
      </tr>)}
      {visible.length === 0 && <tr className="member-empty-row"><td colSpan={5}>No clients match this view. Try another filter or search.</td></tr>}
    </tbody></table></div>
  </section>;

  const trainerPerformance = role === "admin" && trainers.length > 0 && <section className="card rc-trainer-performance" aria-labelledby="rc-trainer-performance">
    <div className="section-top"><h2 id="rc-trainer-performance">Trainer performance</h2><span className="pill">{trainers.length} TRAINERS</span></div>
    <div className="rc-trainer-perf-grid">
      <div><h3>Average client progress</h3><BarChart label="Average weekly progress of each trainer’s clients" unit="percent" color={palette.sage} bars={trainers.map(t => ({label: t.name, value: t.avgProgress, planned: 100}))} format={n => `${n}%`} emptyLabel="0%" rowLabel="Trainer"/></div>
      <div><h3>Capacity used</h3><BarChart label="Share of each trainer’s client capacity in use" unit="percent" color={palette.lilac} bars={trainers.map(t => ({label: t.name, value: t.utilisation, planned: 100}))} format={n => `${n}%`} emptyLabel="0%" rowLabel="Trainer"/></div>
    </div>
    <div className="table-scroll"><table><thead><tr><th>Trainer</th><th>Clients</th><th>Avg progress</th><th>Trained today</th><th>Check-ins waiting</th><th>Reviewed</th><th>Unpaid</th></tr></thead><tbody>
      {trainers.map(t => <tr key={t.id}><td><span className="client-name"><span className="avatar">{t.initials}</span><b>{t.name}</b></span></td><td>{t.clients}/{t.capacity}</td><td>{t.avgProgress}%</td><td>{t.activeToday}</td><td>{t.checkinsWaiting}</td><td>{t.checkinsReviewed}</td><td>{t.paymentsPending}</td></tr>)}
    </tbody></table></div>
  </section>;

  const checkIns = <section className="card">
    <div className="section-top"><h2>Check-ins to review</h2><span className="pill">{dueCheckIns.length} WAITING</span></div>
    {dueCheckIns.length === 0
      ? <p className="rc-staff-empty">All caught up. Nice work.</p>
      : <ul className="rc-staff-list">{dueCheckIns.map(c => <li key={c.id}>
        <span className="avatar">{c.initials}</span>
        <div><b>{c.name}</b><small>{c.goal} · last workout {c.lastWorkout.toLowerCase()} · {c.nextCheckIn}</small>{c.checkinNote && <small className="rc-staff-note">“{c.checkinNote}”</small>}</div>
        <button className="button dark" disabled={pending} onClick={() => run(() => reviewCheckin(c.id))}>Mark reviewed</button>
      </li>)}</ul>}
  </section>;

  return <div className="app rc-member rc-staff">
    <aside className="sidebar">
      <span className="brand"><Brand/></span>
      <div className="workspace-label">{role === "admin" ? "SUPER ADMIN" : "TRAINER WORKSPACE"}</div>
      <nav aria-label={role === "admin" ? "Admin navigation" : "Trainer navigation"}>{tabs[role].map(([key, icon, label]) => <button key={key} title={label} className={tab === key ? "nav active" : "nav"} aria-current={tab === key && !detail ? "page" : undefined} onClick={() => openTab(key)}><span aria-hidden="true"><Icon name={icon} size={20}/></span><span className="nav-label">{label}</span>{key === "checkins" && dueCheckIns.length > 0 && <small>{dueCheckIns.length}</small>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="profile"><span className="avatar">{user.initials}</span><div><b>{user.name}</b><small>{user.email}</small></div></div><form action={logout}><button type="submit">Log out <span><Icon name="arrow" size={16}/></span></button></form></div>
    </aside>
    <div className="content">
      <header className="topbar"><span><span className="status-dot"/> INDIA PILOT <span className="divider">/</span> {role === "admin" ? "ADMINISTRATION" : "COACHING"}</span><div><span className="demo-badge">{pending ? "Saving…" : "Live cohort data"}</span><span className="top-avatar" aria-hidden="true">{user.initials}</span><form action={logout}><button type="submit" className="top-logout">Log out</button></form></div></header>
      <main id="main">
        {detail ?? <>
        <div className="page-heading"><div><p className="eyebrow">{role === "admin" ? "SUPER ADMIN" : `TRAINER · ${user.name.toUpperCase()}`}</p><h1 tabIndex={-1}>{title}</h1><p>{subtitle}</p></div></div>
        {notice && <div className={noticeError ? "notice notice-error" : "notice"} role={noticeError ? "alert" : "status"}>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification"><Icon name="close" size={18}/></button></div>}
        {(tab === "today" || tab === "overview") && <>
          <div className="three-grid metrics">{metrics.map(([v, l]) => <section className="card" key={l}><span className="eyebrow">{l}</span><strong>{v}</strong></section>)}</div>
          {role === "trainer"
            ? <><section className="rc-staff-hero"><Photo src="https://images.pexels.com/photos/6455927/pexels-photo-6455927.jpeg?auto=compress&cs=tinysrgb&w=1400" alt="Trainer encouraging a client between gym exercises" sizes="(max-width: 700px) 100vw, 75vw"/><div><span>COACH’S NOTE</span><h2>Great coaching is noticing<br/>the rep they almost skipped.</h2></div></section>{checkIns}</>
            : <><StaffInsights clients={clients}/>{trainerPerformance}<section className="card"><div className="section-top"><h2>Recent activity</h2><span className="pill">AUDIT LOG</span></div>{activity.length === 0 ? <p className="rc-staff-empty">No admin or trainer actions yet.</p> : <ul className="rc-staff-activity">{activity.map((a, i) => <li key={i}><b>{activityLabels[a.action] ?? a.action}</b><span>{a.detail} · by {a.actor}</span><time dateTime={a.at.replace(" ", "T") + "Z"}>{a.at.slice(0, 16)} UTC</time></li>)}</ul>}</section></>}
        </>}
        {tab === "clients" && roster}
        {tab === "checkins" && checkIns}
        {tab === "schedule" && role === "trainer" && <ScheduleEditor clients={clients} weeks={weeks} plans={plans} pending={pending} run={run}/>}
        {tab === "trainers" && <>
          {trainerPerformance}
          <div className="two-grid equal">{trainers.map(t => <section className="card team-card rc-trainer-card" key={t.id}>
            <span className="large-avatar">{t.initials}</span><span className="eyebrow">{t.title}</span><h2>{t.name}</h2>
            <p className="rc-trainer-email">{t.email} · {t.canUsePassword ? "password or Google" : "Google sign-in"}</p>
            <progress max={t.capacity} value={t.clients} aria-label={`${t.name} capacity`}/>
            <dl className="rc-trainer-stats">
              <div><dt>Clients</dt><dd>{t.clients}/{t.capacity}</dd></div>
              <div><dt>Avg progress</dt><dd>{t.avgProgress}%</dd></div>
              <div><dt>Trained today</dt><dd>{t.activeToday}</dd></div>
              <div><dt>Check-ins waiting</dt><dd>{t.checkinsWaiting}</dd></div>
              <div><dt>Check-ins reviewed</dt><dd>{t.checkinsReviewed}</dd></div>
              <div><dt>Unpaid clients</dt><dd>{t.paymentsPending}</dd></div>
            </dl>
            <button className="button outline" onClick={() => {setTrainerFilter(t.name); setSort("Name"); setTab("clients");}}>View {t.name}’s clients →</button>
          </section>)}</div>
          <section className="card" id="add-trainer"><span className="tile-icon sage"><Icon name="heart" size={22}/></span><h2>Add a trainer</h2>
            <p>The trainer signs in with Google using this email. Add a password too if they don’t use Google.</p>
            <form className="rc-staff-settings" onSubmit={e => {e.preventDefault(); run(async () => {const result = await addTrainer(newTrainer); if (result.ok) setNewTrainer(emptyTrainer); return result;});}}>
              <label><span>Full name</span><input value={newTrainer.name} onChange={e => setNewTrainer({...newTrainer, name: e.target.value})} required maxLength={40} autoComplete="off"/></label>
              <label><span>Email (Google account)</span><input type="email" value={newTrainer.email} onChange={e => setNewTrainer({...newTrainer, email: e.target.value})} required autoComplete="off"/></label>
              <label><span>Role title</span><input value={newTrainer.title} onChange={e => setNewTrainer({...newTrainer, title: e.target.value})} maxLength={40}/></label>
              <label><span>Client capacity</span><input inputMode="numeric" value={newTrainer.capacity} onChange={e => setNewTrainer({...newTrainer, capacity: e.target.value})} required/></label>
              <label><span>Password (optional)</span><input type="password" value={newTrainer.password} onChange={e => setNewTrainer({...newTrainer, password: e.target.value})} minLength={10} autoComplete="new-password" placeholder="10+ characters"/></label>
              <button className="button dark" type="submit" disabled={pending}>{pending ? "Adding…" : "Add trainer"}</button>
            </form>
          </section>
        </>}
        {tab === "settings" && <section className="card"><h2>Founding cohort</h2>
          <form className="rc-staff-settings" onSubmit={e => {e.preventDefault(); run(() => saveSettings(draft));}}>
            <label><span>Price per 30 days</span><input inputMode="numeric" value={draft.price} onChange={e => setDraft({...draft, price: e.target.value})} required/></label>
            <label><span>Currency</span><select value={draft.currency} onChange={e => setDraft({...draft, currency: e.target.value})}><option>AED</option><option>INR</option></select></label>
            <label><span>Cohort size</span><input inputMode="numeric" value={draft.cohortSize} onChange={e => setDraft({...draft, cohortSize: e.target.value})} required/></label>
            <div><span>Payment</span><b>Manual transfer, verified by admin</b></div>
            <button className="button dark" type="submit" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
          </form>
          <p className="small-note">Members see the new price on their membership page straight away.</p></section>}
        </>}
        <footer><span><Brand variant="phone"/></span><span>{role === "admin" ? "Super admin" : "Trainer"} · signed in as {user.email}</span></footer>
      </main>
    </div>
  </div>;
}

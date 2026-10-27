"use client";

import Photo from "./Photo";
import {useState, useTransition, type ReactNode} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import Brand from "./Brand";
import {Icon} from "./Media";
import {BarChart, StaffInsights, palette} from "./Tracker";
import {logout} from "./actions/auth";
import {addClient, addTrainer, assignTrainer, reviewCheckin, saveSettings, setAccountActive, verifyPayment} from "./actions/data";
import type {AuditEntry, ClientRow, Settings, TrainerStats} from "@/lib/store";
import type {WeekPlan} from "@/lib/schedule";
import ScheduleEditor from "./ScheduleEditor";
import "./member-polish.css";
import "./accessibility-polish.css";
import "./staff.css";

export type StaffRole = "trainer" | "admin";
export type StaffUser = {name: string; initials: string; email: string};

const tabs: Record<StaffRole, [string, string, string, string][]> = {
  trainer: [["today", "home", "Today", "Today"], ["schedule", "calendar", "Workout schedule", "Schedule"], ["clients", "move", "My clients", "Clients"], ["checkins", "chat", "Check-ins", "Check-ins"]],
  admin: [["overview", "chart", "Overview", "Overview"], ["clients", "move", "Clients & payments", "Clients"], ["trainers", "heart", "Trainers", "Trainers"], ["settings", "lock", "Programme settings", "Settings"]],
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

export const activityLabels: Record<string, string> = {assign_trainer: "Trainer assigned", verify_payment: "Payment verified", review_checkin: "Check-in reviewed", update_settings: "Settings updated", add_trainer: "Trainer added", schedule_week: "Week scheduled", set_meeting_link: "Call link updated", add_client: "Client added", set_stage: "Stage changed", deactivate_user: "Account deactivated", reactivate_user: "Account reactivated"};
const stageOrder = ["Payment review", "Onboarding", "Check-in due", "Active"];
const sorters: Record<string, (a: ClientRow, b: ClientRow) => number> = {
  Name: (a, b) => a.name.localeCompare(b.name),
  Trainer: (a, b) => (a.trainer === "Unassigned" ? 1 : 0) - (b.trainer === "Unassigned" ? 1 : 0) || a.trainer.localeCompare(b.trainer) || a.name.localeCompare(b.name),
  "Progress (high to low)": (a, b) => b.progress - a.progress || a.name.localeCompare(b.name),
  Stage: (a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage) || a.name.localeCompare(b.name),
};
const emptyTrainer = {name: "", email: "", title: "Trainer", capacity: "8", password: ""};
const emptyClient = {name: "", email: "", phone: "", goal: "", trainerId: "", password: ""};

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
  const [newClient, setNewClient] = useState(emptyClient);
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
    .filter(c => c.name.toLowerCase().includes(query.toLowerCase()) && (filter === "All clients" || c.stage === filter) && (trainerFilter === "All trainers" || (trainerFilter === "Unassigned" ? !c.trainerId : c.trainerId === trainerFilter)))
    .sort(sorters[sort]);
  const openTab = (key: string) => {
    setNotice("");
    if (detail) { router.push(`/${role}?tab=${key}`); return; }
    setTab(key);
    // A new tab starts at its top, not wherever the previous tab was scrolled to.
    window.scrollTo({top: 0, behavior: "instant"});
    requestAnimationFrame(() => document.querySelector<HTMLElement>("main h1")?.focus({preventScroll: true}));
  };
  const [title, subtitle] = headings[tab];

  const metrics: [string, string][] = role === "trainer"
    ? [[String(mine.length), "Clients assigned to you"], [String(mine.filter(c => c.lastWorkout === "Today").length), "Trained today"], [String(dueCheckIns.length), "Check-ins waiting"]]
    : [[String(clients.length), "Clients in cohort"], [String(clients.filter(c => !c.paid).length), "Payments awaiting review"], [String(clients.filter(c => c.trainer === "Unassigned").length), "Clients without a trainer"]];

  const roster = <section className="card">
    <div className="section-top"><h2>{role === "trainer" ? "Assigned clients" : "Client roster"}</h2><span className="pill">{visible.length} SHOWN</span></div>
    <div className="filters"><input aria-label="Search clients" placeholder="Search client name…" value={query} onChange={e => setQuery(e.target.value)}/><select aria-label="Filter clients by stage" value={filter} onChange={e => setFilter(e.target.value)}><option>All clients</option><option>Active</option><option>Onboarding</option><option>Check-in due</option>{role === "admin" && <option>Payment review</option>}</select>{role === "admin" && <><select aria-label="Filter clients by trainer" value={trainerFilter} onChange={e => setTrainerFilter(e.target.value)}><option>All trainers</option>{trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}<option>Unassigned</option></select><select aria-label="Sort clients" value={sort} onChange={e => setSort(e.target.value)}>{Object.keys(sorters).map(k => <option key={k} value={k}>Sort: {k}</option>)}</select></>}</div>
    <div className="table-scroll"><table className="rc-cards"><thead><tr><th>Client</th><th>Stage</th>{role === "admin" ? <th>Trainer</th> : <th>Goal</th>}<th>Weekly progress</th>{role === "admin" ? <th>Payment</th> : <th>Last workout</th>}</tr></thead><tbody>
      {visible.map(c => <tr key={c.id}>
        <td data-label="Client"><span className="client-name"><span className="avatar">{c.initials}</span><Link className="rc-client-link" href={`/${role}/clients/${c.id}`}><b>{c.name}</b><small>View details →</small></Link></span></td>
        <td data-label="Stage"><span className="pill">{c.stage}</span></td>
        {role === "admin"
          ? <td data-label="Trainer"><select aria-label={`Trainer for ${c.name}`} value={c.trainerId ?? ""} disabled={pending} onChange={e => {const trainerId = e.target.value; run(() => assignTrainer(c.id, trainerId));}}><option value="">Unassigned</option>{trainers.filter(t => t.active || t.id === c.trainerId).map(t => <option key={t.id} value={t.id}>{t.name}{t.active ? "" : " (inactive)"}</option>)}</select></td>
          : <td data-label="Goal">{c.goal}</td>}
        <td data-label="Weekly progress"><progress max="100" value={c.progress} aria-label={`${c.name} workout completion`}/><small>{c.progress}%</small></td>
        {role === "admin"
          ? <td data-label="Payment">{c.paid ? <span className="paid">Verified ✓</span> : <button className="small-button" disabled={pending} onClick={() => run(() => verifyPayment(c.id))}>Verify {c.reference ?? "payment"}</button>}</td>
          : <td data-label="Last workout">{c.lastWorkout}</td>}
      </tr>)}
      {visible.length === 0 && <tr className="member-empty-row"><td colSpan={5} data-label="">No clients match this view. Try another filter or search.</td></tr>}
    </tbody></table></div>
  </section>;

  const trainerPerformance = role === "admin" && trainers.length > 0 && <section className="card rc-trainer-performance" aria-labelledby="rc-trainer-performance">
    <div className="section-top"><h2 id="rc-trainer-performance">Trainer performance</h2><span className="pill">{trainers.length} TRAINERS</span></div>
    <div className="rc-trainer-perf-grid">
      <div><h3>Average client progress</h3><BarChart label="Average weekly progress of each trainer’s clients" unit="percent" color={palette.sage} bars={trainers.map(t => ({label: t.name, value: t.avgProgress, planned: 100}))} format={n => `${n}%`} emptyLabel="0%" rowLabel="Trainer"/></div>
      <div><h3>Capacity used</h3><BarChart label="Share of each trainer’s client capacity in use" unit="percent" color={palette.lilac} bars={trainers.map(t => ({label: t.name, value: t.utilisation, planned: 100}))} format={n => `${n}%`} emptyLabel="0%" rowLabel="Trainer"/></div>
    </div>
    <div className="table-scroll"><table className="rc-cards"><thead><tr><th>Trainer</th><th>Clients</th><th>Avg progress</th><th>Trained today</th><th>Check-ins waiting</th><th>Reviewed</th><th>Unpaid</th></tr></thead><tbody>
      {trainers.map(t => <tr key={t.id}><td data-label="Trainer"><span className="client-name"><span className="avatar">{t.initials}</span><b>{t.name}</b></span></td><td data-label="Clients">{t.clients}/{t.capacity}</td><td data-label="Avg progress">{t.avgProgress}%</td><td data-label="Trained today">{t.activeToday}</td><td data-label="Check-ins waiting">{t.checkinsWaiting}</td><td data-label="Reviewed">{t.checkinsReviewed}</td><td data-label="Unpaid">{t.paymentsPending}</td></tr>)}
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
      <nav aria-label={role === "admin" ? "Admin navigation" : "Trainer navigation"}>{tabs[role].map(([key, icon, label, short]) => <button key={key} title={label} className={tab === key ? "nav active" : "nav"} aria-current={tab === key && !detail ? "page" : undefined} onClick={() => openTab(key)}><span aria-hidden="true"><Icon name={icon} size={20}/></span><span className="nav-label">{label}</span><span className="nav-short" aria-hidden="true">{short}</span>{key === "checkins" && dueCheckIns.length > 0 && <small>{dueCheckIns.length}</small>}</button>)}</nav>
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
        {tab === "clients" && role === "admin" && <section className="card" id="add-client"><span className="tile-icon peach"><Icon name="move" size={22}/></span><h2>Add a client</h2>
          <p>Creates their member sign-in. They start in payment review and sign in with Google using this email, or with the password you set.</p>
          <form className="rc-staff-settings" onSubmit={e => {e.preventDefault(); run(async () => {const result = await addClient(newClient); if (result.ok) setNewClient(emptyClient); return result;});}}>
            <label><span>Full name</span><input value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} required maxLength={60} autoComplete="off"/></label>
            <label><span>Email (Google account)</span><input type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} required autoComplete="off"/></label>
            <label><span>Phone (optional)</span><input type="tel" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} maxLength={20} autoComplete="off"/></label>
            <label><span>Goal</span><input value={newClient.goal} onChange={e => setNewClient({...newClient, goal: e.target.value})} maxLength={60} placeholder="e.g. Build strength"/></label>
            <label><span>Trainer</span><select value={newClient.trainerId} onChange={e => setNewClient({...newClient, trainerId: e.target.value})}><option value="">Unassigned</option>{trainers.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label><span>Password (optional)</span><input type="password" value={newClient.password} onChange={e => setNewClient({...newClient, password: e.target.value})} minLength={10} autoComplete="new-password" placeholder="10+ characters"/></label>
            <button className="button dark" type="submit" disabled={pending}>{pending ? "Adding…" : "Add client"}</button>
          </form>
        </section>}
        {tab === "checkins" && checkIns}
        {tab === "schedule" && role === "trainer" && <ScheduleEditor clients={clients} weeks={weeks} plans={plans} pending={pending} run={run}/>}
        {tab === "trainers" && <>
          {trainerPerformance}
          <div className="two-grid equal">{trainers.map(t => <section className="card team-card rc-trainer-card" key={t.id}>
            <span className="large-avatar">{t.initials}</span><span className="eyebrow">{t.title}</span><h2>{t.name}</h2>
            <p className="rc-trainer-email">{t.email} · {t.active ? (t.canUsePassword ? "password or Google" : "Google sign-in") : "deactivated"}</p>
            <progress max={t.capacity} value={t.clients} aria-label={`${t.name} capacity`}/>
            <dl className="rc-trainer-stats">
              <div><dt>Clients</dt><dd>{t.clients}/{t.capacity}</dd></div>
              <div><dt>Avg progress</dt><dd>{t.avgProgress}%</dd></div>
              <div><dt>Trained today</dt><dd>{t.activeToday}</dd></div>
              <div><dt>Check-ins waiting</dt><dd>{t.checkinsWaiting}</dd></div>
              <div><dt>Check-ins reviewed</dt><dd>{t.checkinsReviewed}</dd></div>
              <div><dt>Unpaid clients</dt><dd>{t.paymentsPending}</dd></div>
            </dl>
            <button className="button outline" onClick={() => {setTrainerFilter(t.id); setSort("Name"); openTab("clients");}}>View {t.name}’s clients →</button>
            <button className="text-button" disabled={pending} onClick={() => run(() => setAccountActive(t.id, !t.active))}>{t.active ? "Deactivate sign-in" : "Reactivate sign-in"}</button>
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
            <div><span>Currency</span><b>AED (UAE dirham)</b></div>
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

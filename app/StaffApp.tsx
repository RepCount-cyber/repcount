"use client";

import Photo from "./Photo";
import {useState, useTransition} from "react";
import Brand from "./Brand";
import {Icon} from "./Media";
import {StaffInsights} from "./Tracker";
import {logout} from "./actions/auth";
import {assignTrainer, reviewCheckin, saveSettings, verifyPayment} from "./actions/data";
import type {ClientRow, Settings} from "@/lib/store";
import "./member-polish.css";
import "./accessibility-polish.css";
import "./staff.css";

export type StaffRole = "trainer" | "admin";
export type StaffUser = {name: string; initials: string; email: string};
const trainers = [
  {name: "Akif", initials: "AK", role: "Lead trainer", capacity: 8},
  {name: "Trainer 2", initials: "T2", role: "Trainer · invitation pending", capacity: 6},
];

const tabs: Record<StaffRole, [string, string, string][]> = {
  trainer: [["today", "home", "Today"], ["clients", "move", "My clients"], ["checkins", "chat", "Check-ins"]],
  admin: [["overview", "chart", "Overview"], ["clients", "move", "Clients & payments"], ["trainers", "heart", "Trainers"], ["settings", "lock", "Programme settings"]],
};
const headings: Record<string, [string, string]> = {
  today: ["Today’s floor.", "Who’s training, who needs a nudge, and what’s next."],
  clients: ["Your people.", "Progress, payments and trainer assignment in one view."],
  checkins: ["Weekly check-ins.", "Review how each client’s week went and adjust their plan."],
  overview: ["The whole gym, at a glance.", "Cohort health, payments and trainer coverage."],
  trainers: ["Your coaching team.", "Capacity and assignments for every trainer."],
  settings: ["Programme settings.", "Pricing and cohort rules for the pilot."],
};

type Activity = {action: string; detail: string; at: string};
const activityLabels: Record<string, string> = {assign_trainer: "Trainer assigned", verify_payment: "Payment verified", review_checkin: "Check-in reviewed", update_settings: "Settings updated"};

export default function StaffApp({area: role, user, clients, settings, activity}: {area: StaffRole; user: StaffUser; clients: ClientRow[]; settings: Settings; activity: Activity[]}) {
  const [tab, setTab] = useState(tabs[role][0][0]);
  const [filter, setFilter] = useState("All clients");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(settings);
  // Server actions re-check the role; the refreshed clients arrive as new props.
  const run = (action: () => Promise<{ok?: string; error?: string}>) => startTransition(async () => {
    const result = await action();
    setNotice(result.ok ?? result.error ?? "");
  });
  const mine = clients;
  const dueCheckIns = mine.filter(c => c.stage === "Check-in due");
  const visible = mine.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) && (filter === "All clients" || c.stage === filter));
  const [title, subtitle] = headings[tab];

  const metrics: [string, string][] = role === "trainer"
    ? [[String(mine.length), "Clients assigned to you"], [String(mine.filter(c => c.lastWorkout === "Today").length), "Trained today"], [String(dueCheckIns.length), "Check-ins waiting"]]
    : [[String(clients.length), "Clients in cohort"], [String(clients.filter(c => !c.paid).length), "Payments awaiting review"], [String(clients.filter(c => c.trainer === "Unassigned").length), "Clients without a trainer"]];

  const roster = <section className="card">
    <div className="section-top"><h2>{role === "trainer" ? "Assigned clients" : "Client roster"}</h2><span className="pill">{visible.length} SHOWN</span></div>
    <div className="filters"><input aria-label="Search clients" placeholder="Search client name…" value={query} onChange={e => setQuery(e.target.value)}/><select aria-label="Filter clients by stage" value={filter} onChange={e => setFilter(e.target.value)}><option>All clients</option><option>Active</option><option>Onboarding</option><option>Check-in due</option>{role === "admin" && <option>Payment review</option>}</select></div>
    <div className="table-scroll"><table><thead><tr><th>Client</th><th>Stage</th>{role === "admin" ? <th>Trainer</th> : <th>Goal</th>}<th>Weekly progress</th>{role === "admin" ? <th>Payment</th> : <th>Last workout</th>}</tr></thead><tbody>
      {visible.map(c => <tr key={c.id}>
        <td><span className="client-name"><span className="avatar">{c.initials}</span><b>{c.name}</b></span></td>
        <td><span className="pill">{c.stage}</span></td>
        {role === "admin"
          ? <td><select aria-label={`Trainer for ${c.name}`} value={c.trainer} disabled={pending} onChange={e => {const trainer = e.target.value; run(() => assignTrainer(c.id, trainer));}}><option>Unassigned</option>{trainers.map(t => <option key={t.name}>{t.name}</option>)}</select></td>
          : <td>{c.goal}</td>}
        <td><progress max="100" value={c.progress} aria-label={`${c.name} workout completion`}/><small>{c.progress}%</small></td>
        {role === "admin"
          ? <td>{c.paid ? <span className="paid">Verified ✓</span> : <button className="small-button" disabled={pending} onClick={() => run(() => verifyPayment(c.id))}>Verify {c.reference ?? "payment"}</button>}</td>
          : <td>{c.lastWorkout}</td>}
      </tr>)}
      {visible.length === 0 && <tr className="member-empty-row"><td colSpan={5}>No clients match this view. Try another filter or search.</td></tr>}
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
      <nav aria-label={role === "admin" ? "Admin navigation" : "Trainer navigation"}>{tabs[role].map(([key, icon, label]) => <button key={key} title={label} className={tab === key ? "nav active" : "nav"} aria-current={tab === key ? "page" : undefined} onClick={() => {setTab(key); setNotice("");}}><span aria-hidden="true"><Icon name={icon} size={20}/></span><span className="nav-label">{label}</span>{key === "checkins" && dueCheckIns.length > 0 && <small>{dueCheckIns.length}</small>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="profile"><span className="avatar">{user.initials}</span><div><b>{user.name}</b><small>{user.email}</small></div></div><form action={logout}><button type="submit">Log out <span><Icon name="arrow" size={16}/></span></button></form></div>
    </aside>
    <div className="content">
      <header className="topbar"><span><span className="status-dot"/> INDIA PILOT <span className="divider">/</span> {role === "admin" ? "ADMINISTRATION" : "COACHING"}</span><div><span className="demo-badge">{pending ? "Saving…" : "Live cohort data"}</span><span className="top-avatar" aria-hidden="true">{user.initials}</span><form action={logout}><button type="submit" className="top-logout">Log out</button></form></div></header>
      <main id="main">
        <div className="page-heading"><div><p className="eyebrow">{role === "admin" ? "SUPER ADMIN" : `TRAINER · ${user.name.toUpperCase()}`}</p><h1 tabIndex={-1}>{title}</h1><p>{subtitle}</p></div></div>
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification"><Icon name="close" size={18}/></button></div>}
        {(tab === "today" || tab === "overview") && <>
          <div className="three-grid metrics">{metrics.map(([v, l]) => <section className="card" key={l}><span className="eyebrow">{l}</span><strong>{v}</strong></section>)}</div>
          {role === "trainer"
            ? <><section className="rc-staff-hero"><Photo src="https://images.pexels.com/photos/6455927/pexels-photo-6455927.jpeg?auto=compress&cs=tinysrgb&w=1400" alt="Trainer encouraging a client between gym exercises" sizes="(max-width: 700px) 100vw, 75vw"/><div><span>COACH’S NOTE</span><h2>Great coaching is noticing<br/>the rep they almost skipped.</h2></div></section>{checkIns}</>
            : <><StaffInsights clients={clients}/><section className="card"><div className="section-top"><h2>Recent activity</h2><span className="pill">AUDIT LOG</span></div>{activity.length === 0 ? <p className="rc-staff-empty">No admin or trainer actions yet.</p> : <ul className="rc-staff-activity">{activity.map((a, i) => <li key={i}><b>{activityLabels[a.action] ?? a.action}</b><span>{a.detail}</span><time dateTime={a.at.replace(" ", "T") + "Z"}>{a.at.slice(0, 16)} UTC</time></li>)}</ul>}</section></>}
        </>}
        {tab === "clients" && roster}
        {tab === "checkins" && checkIns}
        {tab === "trainers" && <div className="two-grid equal">{trainers.map(t => {
          const count = clients.filter(c => c.trainer === t.name).length;
          return <section className="card team-card" key={t.name}><span className="large-avatar">{t.initials}</span><span className="eyebrow">{t.role}</span><h2>{t.name}</h2><p>{count} of {t.capacity} client places used.</p><progress max={t.capacity} value={count} aria-label={`${t.name} capacity`}/></section>;
        })}<section className="card"><span className="tile-icon sage"><Icon name="heart" size={22}/></span><h2>Add a trainer</h2><p>Trainers join by invitation and set their own password. Invitations open once email delivery is configured.</p><button className="button outline" disabled>Invite trainer</button></section></div>}
        {tab === "settings" && <section className="card"><h2>Founding cohort</h2>
          <form className="rc-staff-settings" onSubmit={e => {e.preventDefault(); run(() => saveSettings(draft));}}>
            <label><span>Price per 30 days</span><input inputMode="numeric" value={draft.price} onChange={e => setDraft({...draft, price: e.target.value})} required/></label>
            <label><span>Currency</span><select value={draft.currency} onChange={e => setDraft({...draft, currency: e.target.value})}><option>AED</option><option>INR</option></select></label>
            <label><span>Cohort size</span><input inputMode="numeric" value={draft.cohortSize} onChange={e => setDraft({...draft, cohortSize: e.target.value})} required/></label>
            <div><span>Payment</span><b>Manual transfer, verified by admin</b></div>
            <button className="button dark" type="submit" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
          </form>
          <p className="small-note">Members see the new price on their membership page straight away.</p></section>}
        <footer><span><Brand variant="phone"/></span><span>{role === "admin" ? "Super admin" : "Trainer"} · signed in as {user.email}</span></footer>
      </main>
    </div>
  </div>;
}

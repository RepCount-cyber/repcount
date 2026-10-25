import "server-only";
import {db} from "./db";
import {rollOver, sanitizeMemberState, type MemberState} from "./memberState";
import {istToday} from "./dates";
import {listTrainers, type Trainer} from "./users";
import type {PlannedWorkout, WeekPlan} from "./schedule";

export type ClientRow = {
  id: string; name: string; initials: string; stage: string; trainer: string; paid: boolean; progress: number;
  goal: string; lastWorkout: string; nextCheckIn: string; reference: string | null; checkinNote: string | null;
  email: string | null; phone: string | null; joinedOn: string | null; userId: string | null; meetingUrl: string | null;
};
export type Settings = {price: string; currency: string; cohortSize: string};
export const trainerNames = () => listTrainers().map(t => t.name);
export const currencies = ["AED", "INR"];

type RawClient = {id: string; user_id: string | null; name: string; initials: string; stage: string; trainer: string; paid: number; progress: number; goal: string; last_workout: string; next_checkin: string; payment_reference: string | null; checkin_note: string | null; email: string | null; phone: string | null; joined_on: string | null; meeting_url: string | null};
const toClient = (r: RawClient): ClientRow => ({
  id: r.id, name: r.name, initials: r.initials, stage: r.stage, trainer: r.trainer, paid: r.paid === 1, progress: r.progress,
  goal: r.goal, lastWorkout: r.last_workout, nextCheckIn: r.next_checkin, reference: r.payment_reference, checkinNote: r.checkin_note,
  email: r.email, phone: r.phone, joinedOn: r.joined_on, userId: r.user_id, meetingUrl: r.meeting_url,
});

export function listClients(trainer?: string): ClientRow[] {
  const rows = trainer
    ? db().prepare("select * from clients where trainer = ? order by name").all(trainer)
    : db().prepare("select * from clients order by name").all();
  return (rows as RawClient[]).map(toClient);
}

export function getClient(id: string): ClientRow | null {
  const row = db().prepare("select * from clients where id = ?").get(id) as RawClient | undefined;
  return row ? toClient(row) : null;
}

export function assignTrainer(id: string, trainer: string) {
  db().prepare("update clients set trainer = ? where id = ?").run(trainer, id);
}

export function verifyPayment(id: string) {
  db().prepare("update clients set paid = 1, stage = case when stage = 'Payment review' then 'Onboarding' else stage end where id = ?").run(id);
}

export function markCheckinReviewed(id: string) {
  db().prepare("update clients set stage = 'Active' where id = ? and stage = 'Check-in due'").run(id);
}

export function getSettings(): Settings {
  const rows = db().prepare("select key, value from settings").all() as {key: string; value: string}[];
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {price: map.price ?? "299", currency: map.currency ?? "AED", cohortSize: map.cohortSize ?? "10"};
}

export function updateSettings(next: Settings) {
  const statement = db().prepare("insert into settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value");
  for (const [key, value] of Object.entries(next)) statement.run(key, value);
}

export function audit(actorId: string, action: string, detail: string, subjectId: string | null = null) {
  db().prepare("insert into audit_log (actor_id, action, detail, subject_id) values (?, ?, ?, ?)").run(actorId, action, detail, subjectId);
}

export type AuditEntry = {action: string; detail: string; at: string; actor: string};
const auditSelect = "select a.action, a.detail, a.created_at as at, coalesce(u.name, a.actor_id) as actor from audit_log a left join users u on u.id = a.actor_id";
// node:sqlite rows have a null prototype; React can only pass plain objects to client components.
const plainAudit = (rows: unknown[]) => (rows as AuditEntry[]).map(({action, detail, at, actor}) => ({action, detail, at, actor}));

export function recentAudit(limit = 8): AuditEntry[] {
  return plainAudit(db().prepare(`${auditSelect} order by a.id desc limit ?`).all(limit));
}

export type TrainerStats = Trainer & {
  clients: number; utilisation: number; avgProgress: number; activeToday: number;
  checkinsWaiting: number; checkinsReviewed: number; paymentsPending: number;
};

/** Per-trainer workload and outcomes, computed from client records and the audit log. */
export function trainerAnalytics(): TrainerStats[] {
  const clients = listClients();
  const reviewed = db().prepare("select actor_id as id, count(*) as n from audit_log where action = 'review_checkin' group by actor_id").all() as {id: string; n: number}[];
  return listTrainers().map(t => {
    const mine = clients.filter(c => c.trainer === t.name);
    return {
      ...t,
      clients: mine.length,
      utilisation: t.capacity ? Math.round((mine.length / t.capacity) * 100) : 0,
      avgProgress: mine.length ? Math.round(mine.reduce((sum, c) => sum + c.progress, 0) / mine.length) : 0,
      activeToday: mine.filter(c => c.lastWorkout === "Today").length,
      checkinsWaiting: mine.filter(c => c.stage === "Check-in due").length,
      checkinsReviewed: reviewed.find(r => r.id === t.id)?.n ?? 0,
      paymentsPending: mine.filter(c => !c.paid).length,
    };
  });
}

export type ClientDetail = {client: ClientRow; state: MemberState | null; history: AuditEntry[]; lastSaved: string | null; plan: WeekPlan | null};

/** Everything the admin can see about one client: record, saved member progress and action history. */
export function clientDetail(id: string): ClientDetail | null {
  const client = getClient(id);
  if (!client) return null;
  let state: MemberState | null = null;
  let lastSaved: string | null = null;
  if (client.userId) {
    const {day, weekStart} = istToday();
    state = getMemberState(client.userId, day, weekStart);
    lastSaved = (db().prepare("select updated_at from member_state where user_id = ?").get(client.userId) as {updated_at: string} | undefined)?.updated_at ?? null;
  }
  const history = plainAudit(db().prepare(`${auditSelect} where a.subject_id = ? order by a.id desc limit 50`).all(id));
  return {client, state, history, lastSaved, plan: getWeekPlan(id, istToday().weekStart)};
}

export function getMemberState(userId: string, day: string, weekStart: string): MemberState {
  const row = db().prepare("select data from member_state where user_id = ?").get(userId) as {data: string} | undefined;
  let parsed: unknown = null;
  try { parsed = row ? JSON.parse(row.data) : null; } catch { parsed = null; }
  return rollOver(sanitizeMemberState(parsed, day, weekStart), day, weekStart);
}

/** Saves a member's progress and mirrors what staff need (progress, check-in, payment reference) onto their client record. */
export function saveMemberState(userId: string, state: MemberState) {
  const database = db();
  const previous = database.prepare("select data from member_state where user_id = ?").get(userId) as {data: string} | undefined;
  const before = previous ? sanitizeMemberState(JSON.parse(previous.data), state.day, state.weekStart) : null;
  database.prepare("insert into member_state (user_id, data, updated_at) values (?, ?, datetime('now')) on conflict(user_id) do update set data = excluded.data, updated_at = excluded.updated_at")
    .run(userId, JSON.stringify(state));

  const client = database.prepare("select id from clients where user_id = ?").get(userId) as {id: string} | undefined;
  if (!client) return;
  // With a trainer schedule, progress is completed ÷ planned workouts; otherwise the sample week (3 of 4 done).
  const plan = getWeekPlan(client.id, state.weekStart);
  const planned = plan ? plan.flatMap((w, i) => w ? [i] : []) : [];
  const completed = state.workout.completedDays.filter(d => planned.includes(d));
  const progress = plan ? (planned.length ? Math.round((completed.length / planned.length) * 100) : 0) : state.workout.finished ? 100 : 75;
  const todayIndex = (new Date(`${state.day}T00:00:00Z`).getUTCDay() + 6) % 7;
  const trainedToday = plan ? completed.includes(todayIndex) : state.workout.finished;
  database.prepare("update clients set progress = ?, last_workout = case when ? then 'Today' else last_workout end, next_checkin = ? where id = ?")
    .run(progress, trainedToday ? 1 : 0, state.booking ?? "Not booked", client.id);
  const checkinChanged = state.checkin.submitted && (!before?.checkin.submitted || before.checkin.energy !== state.checkin.energy || before.checkin.planFit !== state.checkin.planFit);
  if (checkinChanged) {
    database.prepare("update clients set stage = 'Check-in due', checkin_note = ? where id = ?")
      .run(`Energy ${state.checkin.energy.toLowerCase()} · ${state.checkin.planFit.toLowerCase()}`, client.id);
  }
  if (state.payment.submitted && (!before?.payment.submitted || before.payment.reference !== state.payment.reference)) {
    database.prepare("update clients set payment_reference = ? where id = ?").run(state.payment.reference, client.id);
  }
}

type RawPlan = {day: number; title: string; exercises: string; start_time: string | null; duration_min: number | null; meeting_url: string | null};

/** The client's plan for one week, or null when the trainer hasn't scheduled anything. */
export function getWeekPlan(clientId: string, weekStart: string): WeekPlan | null {
  const rows = db().prepare("select day, title, exercises, start_time, duration_min, meeting_url from workout_plans where client_id = ? and week_start = ?").all(clientId, weekStart) as RawPlan[];
  if (rows.length === 0) return null;
  const plan: WeekPlan = Array(7).fill(null);
  for (const r of rows) {
    const workout: PlannedWorkout = {title: r.title, exercises: r.exercises ? r.exercises.split("\n") : [], time: r.start_time, durationMin: r.duration_min, meetingUrl: r.meeting_url};
    plan[r.day] = workout;
  }
  // A saved week with only rest days is stored as a single marker row so it is not mistaken for "not scheduled".
  return plan.map(p => p && p.title === "__rest_week__" ? null : p);
}

export function saveWeekPlan(clientId: string, weekStart: string, plan: WeekPlan, trainerId: string) {
  const database = db();
  database.exec("begin");
  try {
    database.prepare("delete from workout_plans where client_id = ? and week_start = ?").run(clientId, weekStart);
    const insert = database.prepare("insert into workout_plans (client_id, week_start, day, title, exercises, start_time, duration_min, meeting_url, updated_by) values (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    plan.forEach((w, day) => { if (w) insert.run(clientId, weekStart, day, w.title, w.exercises.join("\n"), w.time, w.durationMin, w.meetingUrl, trainerId); });
    if (plan.every(w => w === null)) insert.run(clientId, weekStart, 6, "__rest_week__", "", null, null, null, trainerId);
    database.exec("commit");
  } catch (error) {
    database.exec("rollback");
    throw error;
  }
}

export function setMeetingUrl(clientId: string, url: string | null) {
  db().prepare("update clients set meeting_url = ? where id = ?").run(url, clientId);
}

export function clientByUser(userId: string): ClientRow | null {
  const row = db().prepare("select * from clients where user_id = ?").get(userId) as RawClient | undefined;
  return row ? toClient(row) : null;
}

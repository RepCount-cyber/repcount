import "server-only";
import type postgres from "postgres";
import {db} from "./db";
import {rollOver, sanitizeMemberState, type MemberState} from "./memberState";
import {istToday} from "./dates";
import {listTrainers, type Trainer} from "./users";
import type {PlannedWorkout, WeekPlan} from "./schedule";
import {currency} from "./programme";

export type ClientRow = {
  id: string; name: string; initials: string; stage: string; trainerId: string | null; trainer: string; paid: boolean; progress: number;
  goal: string; lastWorkout: string; lastWorkoutOn: string | null; nextCheckIn: string; reference: string | null; checkinNote: string | null;
  email: string | null; phone: string | null; joinedOn: string | null; userId: string | null; accountActive: boolean | null; meetingUrl: string | null;
};
export {currency, stages} from "./programme";
export type Settings = {price: string; currency: typeof currency; cohortSize: string};

type RawClient = {
  id: string; user_id: string | null; name: string; initials: string; stage: string; trainer_id: string | null; trainer_name: string | null; paid: boolean; progress: number;
  goal: string; last_workout_on: string | null; next_checkin: string; payment_reference: string | null; checkin_note: string | null;
  email: string | null; phone: string | null; joined_on: string | null; account_active: boolean | null; meeting_url: string | null;
};

/** "Today", "Yesterday", "3 days ago" relative to today in India time. */
function relativeDay(iso: string | null, today: string) {
  if (!iso) return "—";
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) / 86400000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}

const toClient = (r: RawClient, today: string): ClientRow => ({
  id: r.id, name: r.name, initials: r.initials, stage: r.stage, trainerId: r.trainer_id, trainer: r.trainer_name ?? "Unassigned", paid: r.paid, progress: r.progress,
  goal: r.goal, lastWorkout: relativeDay(r.last_workout_on, today), lastWorkoutOn: r.last_workout_on, nextCheckIn: r.next_checkin, reference: r.payment_reference,
  checkinNote: r.checkin_note, email: r.email, phone: r.phone, joinedOn: r.joined_on, userId: r.user_id, accountActive: r.account_active, meetingUrl: r.meeting_url,
});

const clientSelect = (sql: postgres.Sql) => sql`
  select c.id, c.user_id, c.name, c.initials, c.stage, c.trainer_id, t.name as trainer_name, c.paid, c.progress, c.goal,
    c.last_workout_on::text as last_workout_on, c.next_checkin, c.payment_reference, c.checkin_note, c.email, c.phone,
    c.joined_on::text as joined_on, u.active as account_active, c.meeting_url
  from clients c left join users t on t.id = c.trainer_id left join users u on u.id = c.user_id`;

export async function listClients(trainerId?: string): Promise<ClientRow[]> {
  const sql = await db();
  const rows = await sql<RawClient[]>`${clientSelect(sql)} ${trainerId ? sql`where c.trainer_id = ${trainerId}` : sql``} order by c.name`;
  const {day} = istToday();
  return rows.map(r => toClient(r, day));
}

export async function getClient(id: string): Promise<ClientRow | null> {
  const sql = await db();
  const [row] = await sql<RawClient[]>`${clientSelect(sql)} where c.id = ${id}`;
  return row ? toClient(row, istToday().day) : null;
}

export async function clientByUser(userId: string): Promise<ClientRow | null> {
  const sql = await db();
  const [row] = await sql<RawClient[]>`${clientSelect(sql)} where c.user_id = ${userId}`;
  return row ? toClient(row, istToday().day) : null;
}

export async function createClient(input: {id: string; userId: string; name: string; initials: string; email: string; phone: string | null; goal: string; trainerId: string | null}) {
  const sql = await db();
  await sql`insert into clients (id, user_id, name, initials, stage, trainer_id, goal, email, phone, joined_on)
    values (${input.id}, ${input.userId}, ${input.name}, ${input.initials}, 'Payment review', ${input.trainerId}, ${input.goal}, ${input.email}, ${input.phone}, ${istToday().day})`;
}

export async function assignTrainer(id: string, trainerId: string | null) {
  const sql = await db();
  await sql`update clients set trainer_id = ${trainerId} where id = ${id}`;
}

export async function verifyPayment(id: string) {
  const sql = await db();
  await sql`update clients set paid = true, stage = case when stage = 'Payment review' then 'Onboarding' else stage end where id = ${id}`;
}

export async function setStage(id: string, stage: string) {
  const sql = await db();
  await sql`update clients set stage = ${stage} where id = ${id}`;
}

export async function markCheckinReviewed(id: string) {
  const sql = await db();
  await sql`update clients set stage = 'Active' where id = ${id} and stage = 'Check-in due'`;
}

export async function getSettings(): Promise<Settings> {
  const sql = await db();
  const rows = await sql<{key: string; value: string}[]>`select key, value from settings`;
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {price: map.price ?? "299", currency, cohortSize: map.cohortSize ?? "10"};
}

export async function updateSettings(next: {price: string; cohortSize: string}) {
  const sql = await db();
  for (const [key, value] of Object.entries(next)) {
    await sql`insert into settings (key, value) values (${key}, ${value}) on conflict (key) do update set value = excluded.value`;
  }
}

export async function audit(actorId: string, action: string, detail: string, subjectId: string | null = null) {
  const sql = await db();
  await sql`insert into audit_log (actor_id, action, detail, subject_id) values (${actorId}, ${action}, ${detail}, ${subjectId})`;
}

/** at is "YYYY-MM-DD HH:MM:SS" in UTC. */
export type AuditEntry = {action: string; detail: string; at: string; actor: string};
const auditSelect = (sql: postgres.Sql) => sql`
  select a.action, a.detail, to_char(a.created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS') as at, coalesce(u.name, a.actor_id) as actor
  from audit_log a left join users u on u.id = a.actor_id`;
// Rows carry driver metadata; React can only pass plain objects to client components.
const plainAudit = (rows: AuditEntry[]) => rows.map(({action, detail, at, actor}) => ({action, detail, at, actor}));

export async function recentAudit(limit = 8): Promise<AuditEntry[]> {
  const sql = await db();
  return plainAudit(await sql<AuditEntry[]>`${auditSelect(sql)} order by a.id desc limit ${limit}`);
}

export type TrainerStats = Trainer & {
  clients: number; utilisation: number; avgProgress: number; activeToday: number;
  checkinsWaiting: number; checkinsReviewed: number; paymentsPending: number;
};

/** Per-trainer workload and outcomes, computed from client records and the audit log. */
export async function trainerAnalytics(): Promise<TrainerStats[]> {
  const sql = await db();
  const [clients, trainers] = await Promise.all([listClients(), listTrainers()]);
  const reviewed = await sql<{id: string; n: number}[]>`select actor_id as id, count(*)::int as n from audit_log where action = 'review_checkin' group by actor_id`;
  return trainers.map(t => {
    const mine = clients.filter(c => c.trainerId === t.id);
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

export type PastWeek = {weekStart: string; workoutsDone: number; checkin: string | null};
export type ClientDetail = {client: ClientRow; state: MemberState | null; history: AuditEntry[]; lastSaved: string | null; plan: WeekPlan | null; pastWeeks: PastWeek[]};

/** Everything staff can see about one client: record, saved member progress, past weeks and action history. */
export async function clientDetail(id: string): Promise<ClientDetail | null> {
  const client = await getClient(id);
  if (!client) return null;
  const sql = await db();
  let state: MemberState | null = null;
  let lastSaved: string | null = null;
  let pastWeeks: PastWeek[] = [];
  if (client.userId) {
    state = await getMemberState(client.userId);
    const [saved] = await sql<{at: string}[]>`select to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS') as at from member_state where user_id = ${client.userId}`;
    lastSaved = saved?.at ?? null;
    const weeks = await sql<{week_start: string; data: unknown}[]>`select period_start::text as week_start, data from member_history where user_id = ${client.userId} and period = 'week' order by period_start desc limit 12`;
    pastWeeks = weeks.map(w => {
      const s = sanitizeMemberState(w.data, w.week_start, w.week_start);
      return {weekStart: w.week_start, workoutsDone: s.workout.completedDays.length, checkin: s.checkin.submitted ? `Energy ${s.checkin.energy.toLowerCase()} · ${s.checkin.planFit.toLowerCase()}` : null};
    });
  }
  const history = plainAudit(await sql<AuditEntry[]>`${auditSelect(sql)} where a.subject_id = ${id} order by a.id desc limit 50`);
  return {client, state, history, lastSaved, plan: await getWeekPlan(id, istToday().weekStart), pastWeeks};
}

/** A member's saved progress for today, starting a fresh day or week when the saved state is older. */
export async function getMemberState(userId: string): Promise<MemberState> {
  const sql = await db();
  const {day, weekStart} = istToday();
  const [row] = await sql<{data: unknown}[]>`select data from member_state where user_id = ${userId}`;
  return rollOver(sanitizeMemberState(row?.data ?? null, day, weekStart), day, weekStart);
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Saves a member's progress for today (India time, decided by the server) and mirrors what staff need onto their client record.
 * The previous day's tracker and the previous week's full state are archived to member_history before being replaced.
 */
export async function saveMemberState(userId: string, input: unknown) {
  const sql = await db();
  const {day, weekStart} = istToday();
  const sanitized = sanitizeMemberState(input, day, weekStart);
  // A tab left open overnight sends yesterday's state: start it fresh rather than filing it under today.
  const state = {...rollOver(sanitized, day, weekStart), day, weekStart};

  await sql.begin(async tx => {
    const [previousRow] = await tx<{data: unknown}[]>`select data from member_state where user_id = ${userId} for update`;
    const before = previousRow ? sanitizeMemberState(previousRow.data, day, weekStart) : null;
    if (before && isoDate.test(before.day) && before.day !== day) {
      await tx`insert into member_history (user_id, period, period_start, data) values (${userId}, 'day', ${before.day}, ${tx.json(before.tracker as unknown as postgres.JSONValue)})
        on conflict (user_id, period, period_start) do update set data = excluded.data`;
    }
    if (before && isoDate.test(before.weekStart) && before.weekStart !== weekStart) {
      await tx`insert into member_history (user_id, period, period_start, data) values (${userId}, 'week', ${before.weekStart}, ${tx.json(before as unknown as postgres.JSONValue)})
        on conflict (user_id, period, period_start) do update set data = excluded.data`;
    }
    await tx`insert into member_state (user_id, data, updated_at) values (${userId}, ${tx.json(state as unknown as postgres.JSONValue)}, now())
      on conflict (user_id) do update set data = excluded.data, updated_at = excluded.updated_at`;

    const [client] = await tx<{id: string}[]>`select id from clients where user_id = ${userId}`;
    if (!client) return;
    // Progress is completed ÷ planned workouts in the trainer's schedule; without a schedule there is nothing to measure.
    const plan = await getWeekPlan(client.id, weekStart, tx);
    const planned = plan ? plan.flatMap((w, i) => w ? [i] : []) : [];
    const completed = state.workout.completedDays.filter(d => planned.includes(d));
    const progress = planned.length ? Math.round((completed.length / planned.length) * 100) : 0;
    const todayIndex = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
    const trainedToday = plan ? completed.includes(todayIndex) : state.workout.finished || state.tracker.trained;
    await tx`update clients set progress = ${progress}, next_checkin = ${state.booking ?? "Not booked"},
      last_workout_on = case when ${trainedToday} then ${day}::date else last_workout_on end where id = ${client.id}`;
    const sameWeek = before?.weekStart === weekStart;
    const checkinChanged = state.checkin.submitted && (!sameWeek || !before?.checkin.submitted || before.checkin.energy !== state.checkin.energy || before.checkin.planFit !== state.checkin.planFit);
    if (checkinChanged) {
      await tx`update clients set stage = 'Check-in due', checkin_note = ${`Energy ${state.checkin.energy.toLowerCase()} · ${state.checkin.planFit.toLowerCase()}`} where id = ${client.id}`;
    }
    if (state.payment.submitted && (!before?.payment.submitted || before.payment.reference !== state.payment.reference)) {
      await tx`update clients set payment_reference = ${state.payment.reference} where id = ${client.id}`;
    }
  });
}

type RawPlan = {day: number; title: string; exercises: string; start_time: string | null; duration_min: number | null; meeting_url: string | null};

/** The client's plan for one week, or null when the trainer hasn't scheduled anything. */
export async function getWeekPlan(clientId: string, weekStart: string, tx?: postgres.TransactionSql): Promise<WeekPlan | null> {
  const sql = tx ?? await db();
  const rows = await sql<RawPlan[]>`select day, title, exercises, start_time, duration_min, meeting_url from workout_plans where client_id = ${clientId} and week_start = ${weekStart}`;
  if (rows.length === 0) return null;
  const plan: WeekPlan = Array(7).fill(null);
  for (const r of rows) {
    const workout: PlannedWorkout = {title: r.title, exercises: r.exercises ? r.exercises.split("\n") : [], time: r.start_time, durationMin: r.duration_min, meetingUrl: r.meeting_url};
    plan[r.day] = workout;
  }
  // A saved week with only rest days is stored as a single marker row so it is not mistaken for "not scheduled".
  return plan.map(p => p && p.title === "__rest_week__" ? null : p);
}

/** Every client's plan for the given weeks in one query, keyed "clientId|weekStart". */
export async function getWeekPlans(clientIds: string[], weekStarts: string[]): Promise<Record<string, WeekPlan | null>> {
  const plans: Record<string, WeekPlan | null> = {};
  for (const c of clientIds) for (const w of weekStarts) plans[`${c}|${w}`] = null;
  if (clientIds.length === 0) return plans;
  const sql = await db();
  const rows = await sql<(RawPlan & {client_id: string; week_start: string})[]>`
    select client_id, week_start::text as week_start, day, title, exercises, start_time, duration_min, meeting_url
    from workout_plans where client_id in ${sql(clientIds)} and week_start in ${sql(weekStarts)}`;
  for (const r of rows) {
    const key = `${r.client_id}|${r.week_start}`;
    const plan = plans[key] ?? Array(7).fill(null);
    if (r.title !== "__rest_week__") plan[r.day] = {title: r.title, exercises: r.exercises ? r.exercises.split("\n") : [], time: r.start_time, durationMin: r.duration_min, meetingUrl: r.meeting_url};
    plans[key] = plan;
  }
  return plans;
}

export async function saveWeekPlan(clientId: string, weekStart: string, plan: WeekPlan, trainerId: string) {
  const sql = await db();
  await sql.begin(async tx => {
    await tx`delete from workout_plans where client_id = ${clientId} and week_start = ${weekStart}`;
    const rows = plan.flatMap((w, day) => w ? [{client_id: clientId, week_start: weekStart, day, title: w.title, exercises: w.exercises.join("\n"), start_time: w.time, duration_min: w.durationMin, meeting_url: w.meetingUrl, updated_by: trainerId}] : []);
    if (rows.length === 0) rows.push({client_id: clientId, week_start: weekStart, day: 6, title: "__rest_week__", exercises: "", start_time: null, duration_min: null, meeting_url: null, updated_by: trainerId});
    await tx`insert into workout_plans ${tx(rows)}`;
  });
}

export async function setMeetingUrl(clientId: string, url: string | null) {
  const sql = await db();
  await sql`update clients set meeting_url = ${url} where id = ${clientId}`;
}

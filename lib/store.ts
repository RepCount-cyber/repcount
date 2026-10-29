import "server-only";
import type postgres from "postgres";
import {db} from "./db";
import {rollOver, sanitizeMemberState, type MemberState} from "./memberState";
import {istToday} from "./dates";
import {listTrainers, type Trainer} from "./users";
import type {PlannedWorkout, WeekPlan} from "./schedule";
import {currency, type Bio} from "./programme";
import {sanitizeNutritionPlan, type NutritionPlan} from "./nutritionPlan";
import {scoreFor, shiftDay, streakFrom, type LeaderboardRow} from "./streak";

export type ClientRow = {
  id: string; name: string; initials: string; stage: string; trainerId: string | null; trainer: string; paid: boolean; progress: number;
  goal: string; lastWorkout: string; lastWorkoutOn: string | null; nextCheckIn: string; reference: string | null; checkinNote: string | null;
  email: string | null; phone: string | null; joinedOn: string | null; userId: string | null; accountActive: boolean | null; meetingUrl: string | null;
  intake: Intake | null; bio: Bio | null; memberNo: number;
  /** This week's planned workouts and how many were done (marked by the member or confirmed by the trainer). progress = done ÷ planned. */
  weekPlanned: number; weekDone: number;
};
/** What a member told us when they registered. */
export type Intake = {place: string; days: string};
export {currency, stages} from "./programme";
export type Settings = {price: string; currency: typeof currency; cohortSize: string};

type RawClient = {
  id: string; user_id: string | null; name: string; initials: string; stage: string; trainer_id: string | null; trainer_name: string | null; paid: boolean; progress: number;
  goal: string; last_workout_on: string | null; next_checkin: string; payment_reference: string | null; checkin_note: string | null;
  email: string | null; phone: string | null; joined_on: string | null; account_active: boolean | null; meeting_url: string | null; intake: Intake | null;
  bio: Bio | null; member_no: string; planned_days: number[]; member_done: unknown; confirmed_days: number[];
};

/** "Today", "Yesterday", "3 days ago" relative to today in India time. */
function relativeDay(iso: string | null, today: string) {
  if (!iso) return "—";
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) / 86400000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}

const toClient = (r: RawClient, today: string): ClientRow => {
  const memberDone = Array.isArray(r.member_done) ? r.member_done : [];
  const weekDone = r.planned_days.filter(d => memberDone.includes(d) || r.confirmed_days.includes(d)).length;
  const weekPlanned = r.planned_days.length;
  return {
    id: r.id, name: r.name, initials: r.initials, stage: r.stage, trainerId: r.trainer_id, trainer: r.trainer_name ?? "Unassigned", paid: r.paid,
    progress: weekPlanned ? Math.round((weekDone / weekPlanned) * 100) : 0, weekPlanned, weekDone,
    goal: r.goal, lastWorkout: relativeDay(r.last_workout_on, today), lastWorkoutOn: r.last_workout_on, nextCheckIn: r.next_checkin, reference: r.payment_reference,
    checkinNote: r.checkin_note, email: r.email, phone: r.phone, joinedOn: r.joined_on, userId: r.user_id, accountActive: r.account_active, meetingUrl: r.meeting_url,
    intake: r.intake ? {place: String(r.intake.place ?? ""), days: String(r.intake.days ?? "")} : null,
    bio: r.bio ? {dob: typeof r.bio.dob === "string" ? r.bio.dob : null, gender: typeof r.bio.gender === "string" ? r.bio.gender : null, heightCm: typeof r.bio.heightCm === "number" ? r.bio.heightCm : null} : null,
    memberNo: Number(r.member_no),
  };
};

/* Weekly progress is worked out live for the current week, so it never shows last week's number after Monday. */
const clientSelect = (sql: postgres.Sql) => {
  const {weekStart} = istToday();
  return sql`
  select c.id, c.user_id, c.name, c.initials, c.stage, c.trainer_id, t.name as trainer_name, c.paid, c.goal,
    c.last_workout_on::text as last_workout_on, c.next_checkin, c.payment_reference, c.checkin_note, c.email, c.phone,
    c.joined_on::text as joined_on, u.active as account_active, c.meeting_url, c.intake, c.bio, c.member_no,
    coalesce((select array_agg(wp.day) from workout_plans wp where wp.client_id = c.id and wp.week_start = ${weekStart} and wp.title <> '__rest_week__'), '{}') as planned_days,
    case when ms.data->>'weekStart' = ${weekStart} then ms.data->'workout'->'completedDays' else '[]'::jsonb end as member_done,
    coalesce((select array_agg(extract(isodow from sc.day)::int - 1) from session_confirmations sc
      where sc.client_id = c.id and sc.day between ${weekStart}::date and ${weekStart}::date + 6), '{}') as confirmed_days
  from clients c left join users t on t.id = c.trainer_id left join users u on u.id = c.user_id left join member_state ms on ms.user_id = c.user_id`;
};

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

export async function createClient(input: {id: string; userId: string; name: string; initials: string; email: string; phone: string | null; goal: string; trainerId: string | null; intake?: Intake}) {
  const sql = await db();
  await sql`insert into clients (id, user_id, name, initials, stage, trainer_id, goal, email, phone, joined_on, intake)
    values (${input.id}, ${input.userId}, ${input.name}, ${input.initials}, 'Payment review', ${input.trainerId}, ${input.goal}, ${input.email}, ${input.phone}, ${istToday().day}, ${input.intake ? sql.json(input.intake) : null})`;
}

export async function saveIntake(id: string, goal: string, intake: Intake) {
  const sql = await db();
  await sql`update clients set goal = ${goal}, intake = ${sql.json(intake)} where id = ${id}`;
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

/**
 * Per-trainer coaching results for the current week (India time):
 * - completion: workouts done ÷ workouts planned across the trainer's members (member-marked or trainer-confirmed)
 * - scheduled: members with a plan for this week
 * - activeWeek: members who trained in the last 7 days
 * - confirmedWeek: sessions the trainer confirmed this week
 * - checkinsReviewed: check-ins the trainer reviewed in the last 30 days
 */
export type TrainerStats = Trainer & {
  clients: number; scheduled: number; workoutsPlanned: number; workoutsDone: number; completion: number;
  activeWeek: number; confirmedWeek: number; checkinsWaiting: number; checkinsReviewed: number;
};

export async function trainerAnalytics(): Promise<TrainerStats[]> {
  const sql = await db();
  const {day: today, weekStart} = istToday();
  const weekAgo = shiftDay(today, -6);
  const [clients, trainers, reviewed, confirmed] = await Promise.all([
    listClients(), listTrainers(),
    sql<{id: string; n: number}[]>`select actor_id as id, count(*)::int as n from audit_log where action = 'review_checkin' and created_at > now() - interval '30 days' group by actor_id`,
    sql<{id: string; n: number}[]>`select trainer_id as id, count(*)::int as n from session_confirmations where day between ${weekStart} and ${today} group by trainer_id`,
  ]);
  return trainers.map(t => {
    const mine = clients.filter(c => c.trainerId === t.id);
    const workoutsPlanned = mine.reduce((sum, c) => sum + c.weekPlanned, 0);
    const workoutsDone = mine.reduce((sum, c) => sum + c.weekDone, 0);
    return {
      ...t,
      clients: mine.length,
      scheduled: mine.filter(c => c.weekPlanned > 0).length,
      workoutsPlanned, workoutsDone,
      completion: workoutsPlanned ? Math.round((workoutsDone / workoutsPlanned) * 100) : 0,
      activeWeek: mine.filter(c => c.lastWorkoutOn !== null && c.lastWorkoutOn >= weekAgo).length,
      confirmedWeek: confirmed.find(r => r.id === t.id)?.n ?? 0,
      checkinsWaiting: mine.filter(c => c.stage === "Check-in due").length,
      checkinsReviewed: reviewed.find(r => r.id === t.id)?.n ?? 0,
    };
  });
}

/** Admin edit of a member's name, contact, goal and biodata. The name is copied to their sign-in so it matches everywhere. */
export async function updateClientDetails(id: string, input: {name: string; initials: string; phone: string | null; goal: string; bio: Bio}) {
  const sql = await db();
  await sql.begin(async tx => {
    const [row] = await tx<{user_id: string | null}[]>`update clients set name = ${input.name}, initials = ${input.initials}, phone = ${input.phone}, goal = ${input.goal},
      bio = ${tx.json(input.bio as unknown as postgres.JSONValue)} where id = ${id} returning user_id`;
    if (row?.user_id) await tx`update users set name = ${input.name}, initials = ${input.initials} where id = ${row.user_id}`;
  });
}

export type PastWeek = {weekStart: string; workoutsDone: number; checkin: string | null};
export type Message = {body: string; at: string; author: string};
export type ClientDetail = {client: ClientRow; state: MemberState | null; history: AuditEntry[]; lastSaved: string | null; plan: WeekPlan | null; pastWeeks: PastWeek[]; messages: Message[]};

/** Everything staff can see about one client: record, saved member progress, past weeks and action history. */
export async function clientDetail(id: string): Promise<ClientDetail | null> {
  const client = await getClient(id);
  if (!client) return null;
  const sql = await db();
  const userId = client.userId;
  // Independent reads run together: one round trip to the database instead of seven in a row.
  const [state, saved, weeks, audit, plan, messages] = await Promise.all([
    userId ? getMemberState(userId) : null,
    userId ? sql<{at: string}[]>`select to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS') as at from member_state where user_id = ${userId}` : [],
    userId ? sql<{week_start: string; data: unknown}[]>`select period_start::text as week_start, data from member_history where user_id = ${userId} and period = 'week' order by period_start desc limit 12` : [],
    sql<AuditEntry[]>`${auditSelect(sql)} where a.subject_id = ${id} order by a.id desc limit 50`,
    getWeekPlan(id, istToday().weekStart),
    listMessages(id),
  ]);
  const pastWeeks: PastWeek[] = weeks.map(w => {
    const s = sanitizeMemberState(w.data, w.week_start, w.week_start);
    return {weekStart: w.week_start, workoutsDone: s.workout.completedDays.length, checkin: s.checkin.submitted ? `Energy ${s.checkin.energy.toLowerCase()} · ${s.checkin.planFit.toLowerCase()}` : null};
  });
  return {client, state, history: plainAudit(audit), lastSaved: saved[0]?.at ?? null, plan, pastWeeks, messages};
}

/** A member's saved progress for today, starting a fresh day or week when the saved state is older. */
export async function getMemberState(userId: string): Promise<MemberState> {
  const sql = await db();
  const {day, weekStart} = istToday();
  const [row] = await sql<{data: unknown}[]>`select data from member_state where user_id = ${userId}`;
  return rollOver(sanitizeMemberState(row?.data ?? null, day, weekStart), day, weekStart);
}

/** A member's question for their trainer. */
export async function addMessage(clientId: string, authorId: string, body: string) {
  const sql = await db();
  await sql`insert into messages (client_id, author_id, body) values (${clientId}, ${authorId}, ${body})`;
}

export async function listMessages(clientId: string, limit = 20): Promise<Message[]> {
  const sql = await db();
  const rows = await sql<Message[]>`
    select m.body, to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS') as at, coalesce(u.name, m.author_id) as author
    from messages m left join users u on u.id = m.author_id where m.client_id = ${clientId} order by m.id desc limit ${limit}`;
  return rows.map(({body, at, author}) => ({body, at, author}));
}

/** One archived day of a member's daily tracker. */
export type DayLog = {day: string; water: number; steps: number; sleep: number | null; mood: string | null; trained: boolean};

/** The member's archived days since the given date (oldest first), for habit charts and the 30-day calendar. */
export async function getMemberDays(userId: string, since: string): Promise<DayLog[]> {
  const sql = await db();
  const rows = await sql<{day: string; data: Record<string, unknown>}[]>`
    select period_start::text as day, data from member_history where user_id = ${userId} and period = 'day' and period_start >= ${since} order by period_start`;
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : 0;
  return rows.map(r => ({day: r.day, water: num(r.data.water), steps: num(r.data.steps), sleep: typeof r.data.sleep === "number" ? r.data.sleep : null,
    mood: typeof r.data.mood === "string" ? r.data.mood : null, trained: r.data.trained === true}));
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
    const {progress, trainedToday} = await weekProgress(tx, client.id, state.workout.completedDays, day, weekStart);
    await tx`update clients set progress = ${progress}, next_checkin = ${state.booking ?? "Not booked"},
      last_workout_on = case when ${trainedToday || state.tracker.trained} then ${day}::date else last_workout_on end where id = ${client.id}`;
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

/**
 * This week's completion: planned workouts the member marked done or the trainer confirmed, as a share of all planned workouts.
 * Without a schedule there is nothing to measure.
 */
async function weekProgress(tx: postgres.TransactionSql, clientId: string, memberDone: number[], day: string, weekStart: string) {
  const plan = await getWeekPlan(clientId, weekStart, tx);
  const planned = plan ? plan.flatMap((w, i) => w ? [i] : []) : [];
  const confirmed = (await confirmedDays(clientId, weekStart, shiftDay(weekStart, 6), tx)).map(d => dayIndex(d));
  const completed = planned.filter(i => memberDone.includes(i) || confirmed.includes(i));
  return {progress: planned.length ? Math.round((completed.length / planned.length) * 100) : 0, trainedToday: completed.includes(dayIndex(day))};
}

/** 0 = Monday … 6 = Sunday */
const dayIndex = (iso: string) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;

/** Days (YYYY-MM-DD) between from and to on which the trainer confirmed the client's session. */
export async function confirmedDays(clientId: string, from: string, to: string, tx?: postgres.TransactionSql): Promise<string[]> {
  const sql = tx ?? await db();
  const rows = await sql<{day: string}[]>`select day::text as day from session_confirmations where client_id = ${clientId} and day between ${from} and ${to} order by day`;
  return rows.map(r => r.day);
}

/** Records (or removes) the trainer's confirmation that a session happened, then refreshes the client's weekly progress. */
export async function setSessionConfirmed(clientId: string, day: string, done: boolean, trainerId: string) {
  const sql = await db();
  const {day: today, weekStart} = istToday();
  await sql.begin(async tx => {
    if (done) await tx`insert into session_confirmations (client_id, day, trainer_id) values (${clientId}, ${day}, ${trainerId}) on conflict (client_id, day) do nothing`;
    else await tx`delete from session_confirmations where client_id = ${clientId} and day = ${day}`;
    const [client] = await tx<{user_id: string | null}[]>`select user_id from clients where id = ${clientId}`;
    const [row] = client?.user_id ? await tx<{data: unknown}[]>`select data from member_state where user_id = ${client.user_id}` : [];
    const state = row ? rollOver(sanitizeMemberState(row.data, today, weekStart), today, weekStart) : null;
    const {progress} = await weekProgress(tx, clientId, state?.workout.completedDays ?? [], today, weekStart);
    await tx`update clients set progress = ${progress},
      last_workout_on = case when ${done} and (last_workout_on is null or last_workout_on < ${day}::date) then ${day}::date else last_workout_on end where id = ${clientId}`;
  });
}

export async function getNutritionPlan(clientId: string): Promise<NutritionPlan | null> {
  const sql = await db();
  const [row] = await sql<{data: unknown}[]>`select data from nutrition_plans where client_id = ${clientId}`;
  return row ? sanitizeNutritionPlan(row.data) : null;
}

/** Saves the trainer's nutrition plan for a client; an empty plan removes it. */
export async function saveNutritionPlan(clientId: string, plan: NutritionPlan | null, trainerId: string) {
  const sql = await db();
  if (!plan) { await sql`delete from nutrition_plans where client_id = ${clientId}`; return; }
  await sql`insert into nutrition_plans (client_id, data, updated_by, updated_at) values (${clientId}, ${sql.json(plan as unknown as postgres.JSONValue)}, ${trainerId}, now())
    on conflict (client_id) do update set data = excluded.data, updated_by = excluded.updated_by, updated_at = excluded.updated_at`;
}

/**
 * Every active member ranked by points over the last 30 days, then by streak.
 * A completed day is one the member marked complete (archived days and today's saved state) or one their trainer confirmed.
 * Names are shortened to first name and last initial.
 */
export async function leaderboard(): Promise<LeaderboardRow[]> {
  const sql = await db();
  const {day: today} = istToday();
  // Look back further than the scoring window so long streaks are counted in full.
  const since = shiftDay(today, -365);
  const members = await sql<{user_id: string; client_id: string; name: string; initials: string}[]>`
    select u.id as user_id, c.id as client_id, u.name, u.initials from users u join clients c on c.user_id = u.id where u.role = 'member' and u.active`;
  if (members.length === 0) return [];
  const userIds = members.map(m => m.user_id);
  const clientIds = members.map(m => m.client_id);
  const [archived, current, confirmations] = await Promise.all([
    sql<{user_id: string; day: string}[]>`select user_id, period_start::text as day from member_history
      where period = 'day' and period_start >= ${since} and user_id in ${sql(userIds)} and data->>'trained' = 'true'`,
    sql<{user_id: string; day: string}[]>`select user_id, data->>'day' as day from member_state where user_id in ${sql(userIds)} and data->'tracker'->>'trained' = 'true'`,
    sql<{client_id: string; day: string}[]>`select client_id, day::text as day from session_confirmations where day >= ${since} and client_id in ${sql(clientIds)}`,
  ]);
  const doneBy = new Map<string, Set<string>>(members.map(m => [m.user_id, new Set()]));
  const confirmedBy = new Map<string, Set<string>>(members.map(m => [m.client_id, new Set()]));
  for (const r of [...archived, ...current]) if (r.day && r.day <= today) doneBy.get(r.user_id)?.add(r.day);
  for (const r of confirmations) if (r.day <= today) confirmedBy.get(r.client_id)?.add(r.day);
  const rows = members.map(m => {
    const confirmed = confirmedBy.get(m.client_id)!;
    const done = new Set([...doneBy.get(m.user_id)!, ...confirmed]);
    const [first, ...rest] = m.name.trim().split(/\s+/);
    const beforeToday = new Set([...done].filter(d => d < today));
    return {userId: m.user_id, name: rest.length ? `${first} ${rest.at(-1)![0]}.` : first, initials: m.initials, score: scoreFor(done, confirmed, today), streak: streakFrom(done, today), rank: 0,
      pastStreak: streakFrom(beforeToday, today), confirmedToday: confirmed.has(today)};
  }).sort((a, b) => b.score - a.score || b.streak - a.streak || a.name.localeCompare(b.name));
  // Equal points and streak share a rank (1, 2, 2, 4).
  rows.forEach((r, i) => { r.rank = i > 0 && rows[i - 1].score === r.score && rows[i - 1].streak === r.streak ? rows[i - 1].rank : i + 1; });
  return rows;
}

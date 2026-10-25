import "server-only";
import {db} from "./db";
import {rollOver, sanitizeMemberState, type MemberState} from "./memberState";

export type ClientRow = {
  id: string; name: string; initials: string; stage: string; trainer: string; paid: boolean; progress: number;
  goal: string; lastWorkout: string; nextCheckIn: string; reference: string | null; checkinNote: string | null;
};
export type Settings = {price: string; currency: string; cohortSize: string};
export const trainerNames = ["Akif", "Trainer 2"];
export const currencies = ["AED", "INR"];

type RawClient = {id: string; name: string; initials: string; stage: string; trainer: string; paid: number; progress: number; goal: string; last_workout: string; next_checkin: string; payment_reference: string | null; checkin_note: string | null};
const toClient = (r: RawClient): ClientRow => ({
  id: r.id, name: r.name, initials: r.initials, stage: r.stage, trainer: r.trainer, paid: r.paid === 1, progress: r.progress,
  goal: r.goal, lastWorkout: r.last_workout, nextCheckIn: r.next_checkin, reference: r.payment_reference, checkinNote: r.checkin_note,
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

export function audit(actorId: string, action: string, detail: string) {
  db().prepare("insert into audit_log (actor_id, action, detail) values (?, ?, ?)").run(actorId, action, detail);
}

export function recentAudit(limit = 8) {
  const rows = db().prepare("select action, detail, created_at as at from audit_log order by id desc limit ?").all(limit) as {action: string; detail: string; at: string}[];
  // node:sqlite rows have a null prototype; React can only pass plain objects to client components.
  return rows.map(({action, detail, at}) => ({action, detail, at}));
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
  const progress = state.workout.finished ? 100 : 75;
  database.prepare("update clients set progress = ?, last_workout = case when ? then 'Today' else last_workout end, next_checkin = ? where id = ?")
    .run(progress, state.workout.finished ? 1 : 0, state.booking ?? "Not booked", client.id);
  const checkinChanged = state.checkin.submitted && (!before?.checkin.submitted || before.checkin.energy !== state.checkin.energy || before.checkin.planFit !== state.checkin.planFit);
  if (checkinChanged) {
    database.prepare("update clients set stage = 'Check-in due', checkin_note = ? where id = ?")
      .run(`Energy ${state.checkin.energy.toLowerCase()} · ${state.checkin.planFit.toLowerCase()}`, client.id);
  }
  if (state.payment.submitted && (!before?.payment.submitted || before.payment.reference !== state.payment.reference)) {
    database.prepare("update clients set payment_reference = ? where id = ?").run(state.payment.reference, client.id);
  }
}

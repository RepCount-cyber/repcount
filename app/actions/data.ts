"use server";

import {randomBytes} from "node:crypto";
import {revalidatePath} from "next/cache";
import {requireRole} from "@/lib/dal";
import {istToday} from "@/lib/dates";
import * as store from "@/lib/store";
import {createUser, emailTaken, initialsOf, listTrainers, setUserActive, updateTrainer} from "@/lib/users";
import {cleanMeetingUrl, planningWeeks, sanitizeWeekPlan} from "@/lib/schedule";
import {sanitizeNutritionPlan} from "@/lib/nutritionPlan";
import {genders} from "@/lib/programme";
import {shiftDay} from "@/lib/streak";

type Result = {ok?: string; error?: string};
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

export async function saveProgress(input: unknown) {
  const user = await requireRole("member");
  await store.saveMemberState(user.id, input);
}

/** A member's question for their trainer; staff see it on the client page. */
export async function askCoach(body: string): Promise<Result> {
  const user = await requireRole("member");
  const text = String(body ?? "").trim();
  if (text.length < 3 || text.length > 1000) return {error: "Write your question (up to 1,000 characters)."};
  const client = await store.clientByUser(user.id);
  if (!client) return {error: "Your client record isn’t set up yet. Please contact the team."};
  await store.addMessage(client.id, user.id, text);
  await store.audit(user.id, "ask_coach", `${client.name} asked a question`, client.id);
  revalidatePath("/trainer", "layout");
  revalidatePath("/admin", "layout");
  return {ok: `Sent to ${client.trainer === "Unassigned" ? "the team" : client.trainer}. They’ll reply at your next check-in or by email.`};
}

export async function assignTrainer(clientId: string, trainerId: string): Promise<Result> {
  const user = await requireRole("admin");
  const client = await store.getClient(clientId);
  const trainer = trainerId ? (await listTrainers()).find(t => t.id === trainerId && t.active) : null;
  if (!client || (trainerId && !trainer)) return {error: "Unknown client or trainer."};
  await store.assignTrainer(clientId, trainer?.id ?? null);
  const name = trainer?.name ?? "Unassigned";
  await store.audit(user.id, "assign_trainer", `${client.name} → ${name}`, clientId);
  revalidatePath("/admin", "layout");
  return {ok: `${client.name} assigned to ${name}.`};
}

export async function verifyPayment(clientId: string): Promise<Result> {
  const user = await requireRole("admin");
  const client = await store.getClient(clientId);
  if (!client) return {error: "Unknown client."};
  if (client.paid) return {ok: `${client.name} is already verified.`};
  await store.verifyPayment(clientId);
  await store.audit(user.id, "verify_payment", `${client.name} · ${client.reference ?? "no reference"}`, clientId);
  revalidatePath("/admin", "layout");
  return {ok: `Payment ${client.reference ?? ""} verified — ${client.name} moves to onboarding.`};
}

export async function setClientStage(clientId: string, stage: string): Promise<Result> {
  const user = await requireRole("admin");
  const client = await store.getClient(clientId);
  if (!client || !(store.stages as readonly string[]).includes(stage)) return {error: "Unknown client or stage."};
  await store.setStage(clientId, stage);
  await store.audit(user.id, "set_stage", `${client.name} · ${client.stage} → ${stage}`, clientId);
  revalidatePath("/admin", "layout");
  return {ok: `${client.name} moved to ${stage}.`};
}

export async function reviewCheckin(clientId: string): Promise<Result> {
  const user = await requireRole("trainer");
  const client = await store.getClient(clientId);
  // Trainers may only act on clients assigned to them.
  if (!client || client.trainerId !== user.id) return {error: "That client isn’t assigned to you."};
  await store.markCheckinReviewed(clientId);
  await store.audit(user.id, "review_checkin", client.name, clientId);
  revalidatePath("/trainer", "layout");
  return {ok: `${client.name}’s check-in marked as reviewed.`};
}

/** Prices are in AED; only the amount and cohort size are editable. */
export async function saveSettings(input: {price: string; cohortSize: string}): Promise<Result> {
  const user = await requireRole("admin");
  const price = Number(input.price);
  const cohortSize = Number(input.cohortSize);
  if (!Number.isInteger(price) || price < 1 || price > 1_000_000) return {error: "Price must be a whole number above zero."};
  if (!Number.isInteger(cohortSize) || cohortSize < 1 || cohortSize > 500) return {error: "Cohort size must be between 1 and 500."};
  await store.updateSettings({price: String(price), cohortSize: String(cohortSize)});
  await store.audit(user.id, "update_settings", `${store.currency} ${price} · cohort ${cohortSize}`);
  revalidatePath("/", "layout");
  return {ok: "Programme settings saved."};
}

export async function addTrainer(input: {name: string; email: string; title: string; password: string}): Promise<Result> {
  const user = await requireRole("admin");
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const title = input.title.trim() || "Trainer";
  if (name.length < 2 || name.length > 40) return {error: "Enter the trainer’s name (2–40 characters)."};
  if (!validEmail(email)) return {error: "Enter a valid email address."};
  if (title.length > 40) return {error: "Keep the role title under 40 characters."};
  if (input.password && (input.password.length < 10 || input.password.length > 200)) return {error: "A password needs at least 10 characters, or leave it blank for Google sign-in only."};
  if (await emailTaken(email)) return {error: "A user with that email already exists."};
  const id = await createUser({role: "trainer", name, email, title, password: input.password || null});
  await store.audit(user.id, "add_trainer", `${name} · ${email}`, id);
  revalidatePath("/admin", "layout");
  return {ok: `${name} added. They can sign in ${input.password ? "with their password or " : "with "}Google using ${email}.`};
}

export async function editTrainer(id: string, input: {name: string; title: string}): Promise<Result> {
  const user = await requireRole("admin");
  const name = input.name.trim();
  const title = input.title.trim() || "Trainer";
  if (name.length < 2 || name.length > 40) return {error: "Enter the trainer’s name (2–40 characters)."};
  if (title.length > 40) return {error: "Keep the role title under 40 characters."};
  const updated = await updateTrainer(id, name, title);
  if (!updated) return {error: "That trainer no longer exists."};
  await store.audit(user.id, "edit_trainer", `${name} · ${title}`, id);
  revalidatePath("/admin", "layout");
  revalidatePath("/trainer", "layout");
  revalidatePath("/member", "layout");
  return {ok: `${name}’s details saved.`};
}

/** Admin edit of a member's name, phone, goal and biodata (date of birth, gender, height). */
export async function editClientDetails(clientId: string, input: {name: string; phone: string; goal: string; dob: string; gender: string; heightCm: string}): Promise<Result> {
  const user = await requireRole("admin");
  const client = await store.getClient(clientId);
  if (!client) return {error: "That client no longer exists."};
  const name = input.name.trim();
  const phone = input.phone.trim();
  const goal = input.goal.trim();
  const height = input.heightCm.trim() ? Number(input.heightCm) : null;
  const {day: today} = istToday();
  if (name.length < 2 || name.length > 60) return {error: "Enter the client’s full name (2–60 characters)."};
  if (phone && !/^\+?[\d\s()-]{7,20}$/.test(phone)) return {error: "Enter a phone number with digits only, or leave it blank."};
  if (!goal || goal.length > 60) return {error: "Enter the client’s goal (up to 60 characters)."};
  if (input.dob && (!/^\d{4}-\d{2}-\d{2}$/.test(input.dob) || input.dob < "1920-01-01" || input.dob > shiftDay(today, -18 * 365))) return {error: "Enter a date of birth for someone 18 or over."};
  if (input.gender && !(genders as readonly string[]).includes(input.gender)) return {error: "Choose a gender from the list."};
  if (height !== null && (!Number.isInteger(height) || height < 100 || height > 250)) return {error: "Height must be a whole number of centimetres between 100 and 250."};
  await store.updateClientDetails(clientId, {name, initials: initialsOf(name, "RC"), phone: phone || null, goal, bio: {dob: input.dob || null, gender: input.gender || null, heightCm: height}});
  await store.audit(user.id, "edit_client", `${name} · details updated`, clientId);
  revalidatePath("/admin", "layout");
  revalidatePath("/trainer", "layout");
  revalidatePath("/member", "layout");
  return {ok: `${name}’s details saved.`};
}

/** Creates the member's sign-in and their client record. They start in payment review. */
export async function addClient(input: {name: string; email: string; phone: string; goal: string; trainerId: string; password: string}): Promise<Result> {
  const user = await requireRole("admin");
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const goal = input.goal.trim() || "Build a routine";
  if (name.length < 2 || name.length > 60) return {error: "Enter the client’s name (2–60 characters)."};
  if (!validEmail(email)) return {error: "Enter a valid email address."};
  if (phone && !/^\+?[\d\s()-]{7,20}$/.test(phone)) return {error: "Enter a phone number with digits only, or leave it blank."};
  if (goal.length > 60) return {error: "Keep the goal under 60 characters."};
  if (input.password && (input.password.length < 10 || input.password.length > 200)) return {error: "A password needs at least 10 characters, or leave it blank for Google sign-in only."};
  const trainer = input.trainerId ? (await listTrainers()).find(t => t.id === input.trainerId && t.active) : null;
  if (input.trainerId && !trainer) return {error: "Choose an active trainer."};
  if (await emailTaken(email)) return {error: "A user with that email already exists."};
  const userId = await createUser({role: "member", name, email, password: input.password || null});
  const id = `c-${randomBytes(6).toString("hex")}`;
  await store.createClient({id, userId, name, initials: initialsOf(name, "RC"), email, phone: phone || null, goal, trainerId: trainer?.id ?? null});
  await store.audit(user.id, "add_client", `${name} · ${email}`, id);
  revalidatePath("/admin", "layout");
  return {ok: `${name} added. They can sign in ${input.password ? "with their password or " : "with "}Google using ${email}.`};
}

/** Deactivating blocks sign-in and ends every open session; reactivating restores access. */
export async function setAccountActive(userId: string, active: boolean, subjectId: string | null = null): Promise<Result> {
  const user = await requireRole("admin");
  const name = await setUserActive(userId, active);
  if (!name) return {error: "Unknown account."};
  await store.audit(user.id, active ? "reactivate_user" : "deactivate_user", name, subjectId ?? userId);
  revalidatePath("/admin", "layout");
  return {ok: active ? `${name} can sign in again.` : `${name} is deactivated and signed out everywhere.`};
}

/** Trainers may schedule this week or the next three for their own clients. */
function allowedWeeks() {
  return planningWeeks(istToday().weekStart).map(w => w.start);
}

export async function saveSchedule(clientId: string, weekStart: string, input: unknown): Promise<Result> {
  const user = await requireRole("trainer");
  const client = await store.getClient(clientId);
  if (!client || client.trainerId !== user.id) return {error: "That client isn’t assigned to you."};
  if (!allowedWeeks().includes(weekStart)) return {error: "Choose this week or one of the next three."};
  const plan = sanitizeWeekPlan(input);
  if (!plan) return {error: "Check each workout has a title and any meeting link starts with https://."};
  await store.saveWeekPlan(clientId, weekStart, plan, user.id);
  const count = plan.filter(Boolean).length;
  await store.audit(user.id, "schedule_week", `${client.name} · week of ${weekStart} · ${count} workout${count === 1 ? "" : "s"}`, clientId);
  revalidatePath("/trainer", "layout");
  revalidatePath("/member", "layout");
  return {ok: `${client.name}’s week of ${weekStart} saved — ${count} workout${count === 1 ? "" : "s"} scheduled.`};
}

export async function saveMeetingLink(clientId: string, url: string): Promise<Result> {
  const user = await requireRole("trainer");
  const client = await store.getClient(clientId);
  if (!client || client.trainerId !== user.id) return {error: "That client isn’t assigned to you."};
  const cleaned = cleanMeetingUrl(url);
  if (cleaned === "invalid") return {error: "Paste a full meeting link starting with https:// (Google Meet, Zoom or Teams)."};
  await store.setMeetingUrl(clientId, cleaned);
  await store.audit(user.id, "set_meeting_link", `${client.name} · ${cleaned ? "check-in call link updated" : "check-in call link removed"}`, clientId);
  revalidatePath("/trainer", "layout");
  revalidatePath("/member", "layout");
  return {ok: cleaned ? `Check-in call link saved — ${client.name} can now join from their app.` : `Check-in call link removed — ${client.name}`};
}

/** The trainer confirms (or un-confirms) that a client's session happened. Only this week's days up to today can be confirmed. */
export async function confirmSession(clientId: string, day: string, done: boolean): Promise<Result> {
  const user = await requireRole("trainer");
  const client = await store.getClient(clientId);
  if (!client || client.trainerId !== user.id) return {error: "That client isn’t assigned to you."};
  const {day: today, weekStart} = istToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < weekStart || day > today) return {error: "Sessions can be confirmed for this week, up to today."};
  await store.setSessionConfirmed(clientId, day, done, user.id);
  await store.audit(user.id, done ? "confirm_session" : "unconfirm_session", `${client.name} · ${day}`, clientId);
  revalidatePath("/trainer", "layout");
  revalidatePath("/member", "layout");
  return {ok: done ? `Session on ${day} marked completed — it counts towards ${client.name}’s streak.` : `Completion removed for ${day}.`};
}

export async function saveNutritionPlan(clientId: string, input: unknown): Promise<Result> {
  const user = await requireRole("trainer");
  const client = await store.getClient(clientId);
  if (!client || client.trainerId !== user.id) return {error: "That client isn’t assigned to you."};
  const plan = sanitizeNutritionPlan(input);
  await store.saveNutritionPlan(clientId, plan, user.id);
  await store.audit(user.id, "save_nutrition", `${client.name} · ${plan ? `${plan.meals.length} meal${plan.meals.length === 1 ? "" : "s"}` : "plan removed"}`, clientId);
  revalidatePath("/trainer", "layout");
  revalidatePath("/member", "layout");
  return {ok: plan ? `Nutrition plan saved — ${client.name} sees it on their Nutrition page.` : `Nutrition plan removed for ${client.name}.`};
}

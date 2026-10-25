"use server";

import {revalidatePath} from "next/cache";
import {requireRole} from "@/lib/dal";
import {istToday} from "@/lib/dates";
import {sanitizeMemberState} from "@/lib/memberState";
import * as store from "@/lib/store";
import {createTrainer, emailOrNameTaken} from "@/lib/users";
import {cleanMeetingUrl, sanitizeWeekPlan} from "@/lib/schedule";

export async function saveProgress(input: unknown) {
  const user = await requireRole("member");
  const {day, weekStart} = istToday();
  store.saveMemberState(user.id, sanitizeMemberState(input, day, weekStart));
}

export async function assignTrainer(clientId: string, trainer: string) {
  const user = await requireRole("admin");
  const client = store.getClient(clientId);
  if (!client || !["Unassigned", ...store.trainerNames()].includes(trainer)) return {error: "Unknown client or trainer."};
  store.assignTrainer(clientId, trainer);
  store.audit(user.id, "assign_trainer", `${client.name} → ${trainer}`, clientId);
  revalidatePath("/admin", "layout");
  return {ok: `${client.name} assigned to ${trainer}.`};
}

export async function verifyPayment(clientId: string) {
  const user = await requireRole("admin");
  const client = store.getClient(clientId);
  if (!client) return {error: "Unknown client."};
  if (client.paid) return {ok: `${client.name} is already verified.`};
  store.verifyPayment(clientId);
  store.audit(user.id, "verify_payment", `${client.name} · ${client.reference ?? "no reference"}`, clientId);
  revalidatePath("/admin", "layout");
  return {ok: `Payment ${client.reference ?? ""} verified — ${client.name} moves to onboarding.`};
}

export async function reviewCheckin(clientId: string) {
  const user = await requireRole("trainer");
  const client = store.getClient(clientId);
  // Trainers may only act on clients assigned to them.
  if (!client || client.trainer !== user.name) return {error: "That client isn’t assigned to you."};
  store.markCheckinReviewed(clientId);
  store.audit(user.id, "review_checkin", client.name, clientId);
  revalidatePath("/trainer");
  return {ok: `${client.name}’s check-in marked as reviewed.`};
}

export async function saveSettings(input: {price: string; currency: string; cohortSize: string}) {
  const user = await requireRole("admin");
  const price = Number(input.price);
  const cohortSize = Number(input.cohortSize);
  if (!Number.isInteger(price) || price < 1 || price > 1_000_000) return {error: "Price must be a whole number above zero."};
  if (!store.currencies.includes(input.currency)) return {error: "Choose AED or INR."};
  if (!Number.isInteger(cohortSize) || cohortSize < 1 || cohortSize > 500) return {error: "Cohort size must be between 1 and 500."};
  store.updateSettings({price: String(price), currency: input.currency, cohortSize: String(cohortSize)});
  store.audit(user.id, "update_settings", `${input.currency} ${price} · cohort ${cohortSize}`);
  revalidatePath("/", "layout");
  return {ok: "Programme settings saved."};
}

export async function addTrainer(input: {name: string; email: string; title: string; capacity: string; password: string}) {
  const user = await requireRole("admin");
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const title = input.title.trim() || "Trainer";
  const capacity = Number(input.capacity);
  if (name.length < 2 || name.length > 40 || name.toLowerCase() === "unassigned") return {error: "Enter the trainer’s name (2–40 characters)."};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return {error: "Enter a valid email address."};
  if (title.length > 40) return {error: "Keep the role title under 40 characters."};
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) return {error: "Client capacity must be between 1 and 50."};
  if (input.password && (input.password.length < 10 || input.password.length > 200)) return {error: "A password needs at least 10 characters, or leave it blank for Google sign-in only."};
  if (emailOrNameTaken(email, name)) return {error: "A user with that email or name already exists."};
  const id = createTrainer({name, email, title, capacity, password: input.password || null});
  store.audit(user.id, "add_trainer", `${name} · ${email}`, id);
  revalidatePath("/admin", "layout");
  return {ok: `${name} added. They can sign in ${input.password ? "with their password or " : "with "}Google using ${email}.`};
}

/** Trainers may schedule this week or the next three for their own clients. */
function allowedWeeks() {
  const {weekStart} = istToday();
  const monday = Date.parse(`${weekStart}T00:00:00Z`);
  return [0, 1, 2, 3].map(i => new Date(monday + i * 7 * 86400000).toISOString().slice(0, 10));
}

export async function saveSchedule(clientId: string, weekStart: string, input: unknown) {
  const user = await requireRole("trainer");
  const client = store.getClient(clientId);
  if (!client || client.trainer !== user.name) return {error: "That client isn’t assigned to you."};
  if (!allowedWeeks().includes(weekStart)) return {error: "Choose this week or one of the next three."};
  const plan = sanitizeWeekPlan(input);
  if (!plan) return {error: "Check each workout has a title and any meeting link starts with https://."};
  store.saveWeekPlan(clientId, weekStart, plan, user.id);
  const count = plan.filter(Boolean).length;
  store.audit(user.id, "schedule_week", `${client.name} · week of ${weekStart} · ${count} workout${count === 1 ? "" : "s"}`, clientId);
  revalidatePath("/trainer");
  revalidatePath("/member", "layout");
  return {ok: `${client.name}’s week of ${weekStart} saved — ${count} workout${count === 1 ? "" : "s"} scheduled.`};
}

export async function saveMeetingLink(clientId: string, url: string) {
  const user = await requireRole("trainer");
  const client = store.getClient(clientId);
  if (!client || client.trainer !== user.name) return {error: "That client isn’t assigned to you."};
  const cleaned = cleanMeetingUrl(url);
  if (cleaned === "invalid") return {error: "Paste a full meeting link starting with https:// (Google Meet, Zoom or Teams)."};
  store.setMeetingUrl(clientId, cleaned);
  store.audit(user.id, "set_meeting_link", `${client.name} · ${cleaned ? "check-in call link updated" : "check-in call link removed"}`, clientId);
  revalidatePath("/trainer");
  revalidatePath("/member", "layout");
  return {ok: cleaned ? `Check-in call link saved — ${client.name} can now join from their app.` : `Check-in call link removed — ${client.name}`};
}

"use server";

import {revalidatePath} from "next/cache";
import {requireRole} from "@/lib/dal";
import {istToday} from "@/lib/dates";
import {sanitizeMemberState} from "@/lib/memberState";
import * as store from "@/lib/store";

export async function saveProgress(input: unknown) {
  const user = await requireRole("member");
  const {day, weekStart} = istToday();
  store.saveMemberState(user.id, sanitizeMemberState(input, day, weekStart));
}

export async function assignTrainer(clientId: string, trainer: string) {
  const user = await requireRole("admin");
  const client = store.getClient(clientId);
  if (!client || !["Unassigned", ...store.trainerNames].includes(trainer)) return {error: "Unknown client or trainer."};
  store.assignTrainer(clientId, trainer);
  store.audit(user.id, "assign_trainer", `${client.name} → ${trainer}`);
  revalidatePath("/admin");
  return {ok: `${client.name} assigned to ${trainer}.`};
}

export async function verifyPayment(clientId: string) {
  const user = await requireRole("admin");
  const client = store.getClient(clientId);
  if (!client) return {error: "Unknown client."};
  if (client.paid) return {ok: `${client.name} is already verified.`};
  store.verifyPayment(clientId);
  store.audit(user.id, "verify_payment", `${client.name} · ${client.reference ?? "no reference"}`);
  revalidatePath("/admin");
  return {ok: `Payment ${client.reference ?? ""} verified — ${client.name} moves to onboarding.`};
}

export async function reviewCheckin(clientId: string) {
  const user = await requireRole("trainer");
  const client = store.getClient(clientId);
  // Trainers may only act on clients assigned to them.
  if (!client || client.trainer !== user.name) return {error: "That client isn’t assigned to you."};
  store.markCheckinReviewed(clientId);
  store.audit(user.id, "review_checkin", client.name);
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

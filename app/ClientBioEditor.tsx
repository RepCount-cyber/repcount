"use client";

import {useState} from "react";
import Modal from "./Modal";
import {editClientDetails} from "./actions/data";
import {genders, goals} from "@/lib/programme";
import type {ClientRow} from "@/lib/store";

type Result = {ok?: string; error?: string};

/** Admin-only: edit a member's name, phone, goal and biodata in a modal. */
export default function ClientBioEditor({client: c, pending, run}: {client: ClientRow; pending: boolean; run: (action: () => Promise<Result>) => void}) {
  const initial = () => ({name: c.name, phone: c.phone ?? "", goal: c.goal, dob: c.bio?.dob ?? "", gender: c.bio?.gender ?? "", heightCm: c.bio?.heightCm ? String(c.bio.heightCm) : ""});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const set = (change: Partial<ReturnType<typeof initial>>) => setForm({...form, ...change});
  // A goal typed by staff before the fixed list existed stays selectable.
  const goalOptions = (goals as readonly string[]).includes(c.goal) || !c.goal ? goals : [c.goal, ...goals];
  return <>
    <button type="button" className="button outline" onClick={() => {setForm(initial()); setError(""); setOpen(true);}}>Edit details</button>
    <Modal open={open} eyebrow="CLIENT PROFILE" title={`Edit ${c.name.split(" ")[0]}’s details`} onClose={() => setOpen(false)}>
      <form className="rc-modal-form" onSubmit={e => {e.preventDefault(); run(async () => {const result = await editClientDetails(c.id, form); if (result.ok) setOpen(false); else setError(result.error ?? ""); return result;});}}>
        <label className="field">Full name<input value={form.name} onChange={e => set({name: e.target.value})} required maxLength={60} autoComplete="off"/></label>
        <label className="field">Phone<input type="tel" value={form.phone} onChange={e => set({phone: e.target.value})} maxLength={20} autoComplete="off"/></label>
        <label className="field">Main goal<select value={form.goal} onChange={e => set({goal: e.target.value})} required>{!form.goal && <option value="">Choose a goal</option>}{goalOptions.map(g => <option key={g}>{g}</option>)}</select></label>
        <div className="rc-modal-row">
          <label className="field">Date of birth<input type="date" value={form.dob} onChange={e => set({dob: e.target.value})} min="1920-01-01"/></label>
          <label className="field">Height (cm)<input type="number" inputMode="numeric" min={100} max={250} value={form.heightCm} onChange={e => set({heightCm: e.target.value})}/></label>
        </div>
        <label className="field">Gender<select value={form.gender} onChange={e => set({gender: e.target.value})}><option value="">Not recorded</option>{genders.map(g => <option key={g}>{g}</option>)}</select></label>
        <p className="small-note">Where they train and how often come from the member’s own onboarding answers.</p>
        {error && <p className="rc-modal-error" role="alert">{error}</p>}
        <button className="button dark" type="submit" disabled={pending}>{pending ? "Saving…" : "Save details"} →</button>
      </form>
    </Modal>
  </>;
}

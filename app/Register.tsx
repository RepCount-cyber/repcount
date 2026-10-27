"use client";

import {useActionState, useEffect, useRef} from "react";
import Link from "next/link";
import {Icon} from "./Media";
import {AuthShell} from "./Login";
import {register, type RegisterState} from "./actions/register";
import {goals, places, rhythms} from "@/lib/programme";
import "./register.css";

function Choice({name, label, options, value, wide}: {name: string; label: string; options: readonly string[]; value?: string; wide?: boolean}) {
  return <label className={wide ? "rc-login-wide" : undefined}><span>{label}</span>
    <select name={name} required defaultValue={value ?? ""}>
      <option value="" disabled>Choose…</option>
      {options.map(option => <option key={option}>{option}</option>)}
    </select>
  </label>;
}

/** New member sign-up: contact details, password and their starting point. */
export default function Register() {
  const heading = useRef<HTMLHeadingElement>(null);
  const [state, action, pending] = useActionState<RegisterState, FormData>(register, undefined);
  const v = state?.values;
  useEffect(() => { heading.current?.focus({preventScroll: true}); }, []);

  return <AuthShell active="register">
    <h1 id="auth-heading" tabIndex={-1} ref={heading}>Find your <em>starting point.</em></h1>
    <p className="rc-login-lead">Tell us a little about you. Your trainer builds your plan from here.</p>
    {/* key resets the uncontrolled fields to the submitted values after an error */}
    <form key={JSON.stringify(v ?? {})} className="rc-login-form rc-register-form" action={action} noValidate>
      {state?.error && <div className="rc-login-error" role="alert">{state.error}</div>}
      <div className="rc-login-grid">
        <label><span>Full name</span><input name="name" autoComplete="name" required maxLength={60} defaultValue={v?.name}/></label>
        <label><span>Phone <i>(optional)</i></span><input name="phone" type="tel" autoComplete="tel" maxLength={20} defaultValue={v?.phone}/></label>
        <label><span>Email</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required defaultValue={v?.email}/></label>
        <label><span>Password</span><input name="password" type="password" autoComplete="new-password" placeholder="10+ characters" minLength={10} required/></label>
        <Choice name="goal" label="Your main goal" options={goals} value={v?.goal} wide/>
        <Choice name="place" label="Where you’ll train" options={places} value={v?.place}/>
        <Choice name="days" label="How often" options={rhythms} value={v?.days}/>
      </div>
      <label className="rc-register-consent"><input type="checkbox" name="adult" required/><span>I’m 18 or over and agree to be contacted about my programme.</span></label>
      <button type="submit" className="rc-login-submit" disabled={pending}>{pending ? "Creating your account…" : "Create account"} <Icon name="arrow" size={18}/></button>
    </form>
    <p className="rc-login-switch">Already a member? <Link href="/login">Sign in →</Link></p>
  </AuthShell>;
}

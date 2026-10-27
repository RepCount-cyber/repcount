"use client";

import Photo from './Photo';
import {useActionState,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import Brand from './Brand';
import {Icon,media} from './Media';
import {login,type LoginState} from './actions/auth';
import './login.css';

const testAccounts=[
  ['Admin','admin@repcount.demo','Admin#2026'],
  ['Trainer','trainer@repcount.demo','Trainer#2026'],
  ['Trainer 2','trainer2@repcount.demo','Trainer2#2026'],
  ['Member','member@repcount.demo','Member#2026'],
  ['Member 2','member2@repcount.demo','Member2#2026'],
] as const;

const googleMark=<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>;

/**
 * Auth shell shared by /login and /register: photo panel + centred card, sized to the viewport so the
 * page never scrolls. Pass the card content as children; `active` highlights the matching tab.
 */
export function AuthShell({active,children}:{active:'login'|'register';children:React.ReactNode}) {
  return <div className="rc-login">
    <a className="skip" href="#auth-heading">Skip to form</a>
    <aside className="rc-login-story" aria-label="Personal coaching at home">
      <Photo src={media.home.poster} alt="Woman exercising in her living room" priority sizes="(max-width: 860px) 1px, 52vw"/>
      <div className="rc-login-story-shade"/>
      <Link className="rc-login-story-brand" href="/" aria-label="RepCount home"><Brand tone="light"/></Link>
      <div className="rc-login-story-copy">
        <span>MAKE ROOM FOR YOU</span>
        <h2>A little effort.<br/><em>A stronger everyday.</em></h2>
        <p>Your plan, your progress and a coach in your corner.</p>
      </div>
    </aside>
    <main className="rc-login-panel">
      <div className="rc-login-card">
        <Link className="rc-login-mobile-brand" href="/" aria-label="RepCount home"><Brand/></Link>
        <nav className="rc-login-tabs" aria-label="Account">
          <Link href="/login" aria-current={active==='login'?'page':undefined}>Sign in</Link>
          <Link href="/register" aria-current={active==='register'?'page':undefined}>Create account</Link>
        </nav>
        {children}
      </div>
    </main>
  </div>;
}

/** Sign in for members, trainers and the super admin (password or Google). */
export default function Login({showDemoAccounts,googleEnabled,notice}:{showDemoAccounts:boolean;googleEnabled:boolean;notice?:string}) {
  const heading=useRef<HTMLHeadingElement>(null);
  const form=useRef<HTMLFormElement>(null);
  const [help,setHelp]=useState(false);
  const [state,action,pending]=useActionState<LoginState,FormData>(login,undefined);
  const error=state?.error??notice;
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[]);
  function fill(email:string,password:string){
    const f=form.current;if(!f)return;
    (f.elements.namedItem('email') as HTMLInputElement).value=email;
    const passwordInput=f.elements.namedItem('password') as HTMLInputElement;
    passwordInput.value=password;
    passwordInput.focus();
  }

  return <AuthShell active="login">
    <h1 id="auth-heading" tabIndex={-1} ref={heading}>Welcome <em>back.</em></h1>
    <p className="rc-login-lead">Members, trainers and admins sign in here.</p>
    <form ref={form} className="rc-login-form" action={action} noValidate>
      {error&&<div className="rc-login-error" role="alert">{error}</div>}
      <label><span>Email</span><input name="email" type="email" placeholder="you@example.com" autoComplete="username" required defaultValue={state?.email} aria-invalid={!!state?.error}/></label>
      <label><span className="rc-login-label-row">Password<button type="button" aria-expanded={help} aria-controls="login-help" onClick={()=>setHelp(!help)}>Forgot?</button></span>
        <input name="password" type="password" placeholder="Your password" autoComplete="current-password" required aria-invalid={!!state?.error}/></label>
      {help&&<p id="login-help" className="rc-login-small" role="status">Ask the RepCount team to reset your password, or sign in with Google.</p>}
      <button type="submit" className="rc-login-submit" disabled={pending}>{pending?'Signing in…':'Sign in'} <Icon name="arrow" size={18}/></button>
      {googleEnabled&&<a className="rc-login-google" href="/api/auth/google">{googleMark}Continue with Google</a>}
    </form>
    <p className="rc-login-switch">New to RepCount? <Link href="/register">Create your account →</Link></p>
    {showDemoAccounts&&<div className="rc-login-test">
      <span>Test accounts · tap to fill</span>
      <div>{testAccounts.map(([role,email,password])=><button key={email} type="button" title={email} onClick={()=>fill(email,password)}>{role}</button>)}</div>
    </div>}
  </AuthShell>;
}

"use client";

import Photo from './Photo';
import {useActionState,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import Brand from './Brand';
import {Icon,media} from './Media';
import {login,type LoginState} from './actions/auth';
import './login.css';

const demoAccounts=[
  ['Member','member@repcount.demo','Member#2026'],
  ['Trainer','trainer@repcount.demo','Trainer#2026'],
  ['Super admin','admin@repcount.demo','Admin#2026'],
  ['Trainer 2','trainer2@repcount.demo','Trainer2#2026'],
  ['Member 2','member2@repcount.demo','Member2#2026'],
] as const;

/** Sign-in for members, trainers and the super admin. Access requests remain a preview until intake is built. */
export default function Login({showDemoAccounts,googleEnabled,notice}:{showDemoAccounts:boolean;googleEnabled:boolean;notice?:string}) {
  const heading=useRef<HTMLHeadingElement>(null);
  const form=useRef<HTMLFormElement>(null);
  const [help,setHelp]=useState(false);
  const [request,setRequest]=useState(false);
  const [state,action,pending]=useActionState<LoginState,FormData>(login,undefined);
  useEffect(()=>{
    document.title=request?'Request access — RepCount':'Log in — RepCount';
    heading.current?.focus({preventScroll:true});
  },[request]);
  function fill(email:string,password:string){
    const f=form.current;if(!f)return;
    (f.elements.namedItem('email') as HTMLInputElement).value=email;
    (f.elements.namedItem('password') as HTMLInputElement).value=password;
  }
  return <div className="rc-login">
    <a className="skip" href="#login-main">Skip to login</a>
    <header className="rc-login-header"><Link href="/" aria-label="RepCount home"><Brand/></Link><Link className="rc-login-back" href="/"><span aria-hidden="true">←</span> Back to RepCount</Link></header>
    <main id="login-main" className="rc-login-layout">
      <section className="rc-login-story" aria-label="Personal coaching at home">
        <Photo src={media.home.poster} alt="Woman exercising in her living room" priority sizes="(max-width: 900px) 100vw, 50vw"/>
        <div className="rc-login-story-shade"/>
        <div className="rc-login-story-top"><span className="rc-login-dot"/> YOUR SPACE. YOUR PACE.</div>
        <div className="rc-login-story-copy"><span>MAKE ROOM FOR YOU</span><h2>A little effort.<br/><em>A stronger everyday.</em></h2><p>Your plan, your progress and a person in your corner.</p><div className="rc-login-story-tags"><span><Icon name="move" size={16}/> Personal training</span><span><Icon name="heart" size={16}/> Thoughtful support</span></div></div>
        <span className="rc-login-photo-note">Illustrative home-training photograph</span>
      </section>
      <section className="rc-login-panel" aria-labelledby="login-heading">
        <div className="rc-login-intro"><span className="rc-login-eyebrow">YOUR REPCOUNT SPACE</span><h1 id="login-heading" tabIndex={-1} ref={heading}>{request?<>Your next<br/><em>chapter.</em></>:<>Welcome<br/><em>back.</em></>}</h1><p>{request?'Share your details. The team will review your request and payment before inviting you.':'Members, trainers and admins sign in here.'}</p></div>
        {request?<>
          <div className="rc-login-preview" id="login-availability"><Icon name="lock" size={18}/><div><strong>Requests open soon</strong><p>This form isn’t accepting details yet. Nothing will be submitted or stored.</p></div></div>
          <form className="rc-login-form" aria-describedby="login-availability" onSubmit={event=>event.preventDefault()}>
            <label htmlFor="login-name">Full name</label><input id="login-name" type="text" placeholder="Your full name" autoComplete="off" disabled/><span className="rc-login-field-gap"/>
            <label htmlFor="request-email">Email address</label><input id="request-email" type="email" placeholder="you@example.com" autoComplete="off" disabled/>
            <label className="rc-login-spaced-label" htmlFor="login-phone">Phone number <span>(optional)</span></label><input id="login-phone" type="tel" placeholder="Include your country code" autoComplete="off" disabled/>
            <label className="rc-login-spaced-label" htmlFor="login-payment">Payment reference <span>(if already paid)</span></label><input id="login-payment" type="text" placeholder="Reference only — no bank or card details" autoComplete="off" disabled/>
            <p className="rc-login-form-note">Account access follows admin approval. You’ll set your own password using an invitation link. A payment reference alone does not confirm payment.</p>
            <button type="submit" className="rc-login-submit" disabled>Submit request <Icon name="arrow" size={19}/></button>
          </form>
        </>:<form ref={form} className="rc-login-form" action={action} noValidate>
          {(state?.error??notice)&&<div className="rc-login-error" role="alert">{state?.error??notice}</div>}
          <label htmlFor="login-email">Email address</label><input id="login-email" name="email" type="email" placeholder="you@example.com" autoComplete="username" required defaultValue={state?.email} aria-invalid={!!state?.error}/>
          <div className="rc-login-password-label"><label htmlFor="login-password">Password</label><button type="button" aria-expanded={help} aria-controls="login-help" onClick={()=>setHelp(!help)}>Forgot password?</button></div>
          <input id="login-password" name="password" type="password" placeholder="Your password" autoComplete="current-password" required aria-invalid={!!state?.error}/>
          <div id="login-help" className="rc-login-help" role="status">{help&&'Ask the RepCount team to send you a new invitation link. Self-service reset is coming soon.'}</div>
          <button type="submit" className="rc-login-submit" disabled={pending}>{pending?'Signing in…':'Sign in'} <Icon name="arrow" size={19}/></button>
          {googleEnabled&&<><div className="rc-login-or" aria-hidden="true"><span>or</span></div>
          <a className="rc-login-google" href="/api/auth/google"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Continue with Google</a>
          <p className="rc-login-google-note">Use the Google account with the email the RepCount team added.</p></>}
        </form>}
        {showDemoAccounts&&!request&&<div className="rc-login-demo"><span>Demo accounts</span><div className="rc-login-demo-list">{demoAccounts.map(([role,email,password])=><button key={email} type="button" onClick={()=>fill(email,password)}><b>{role}</b><small>{email} · {password}</small></button>)}</div><p>Tap one to fill the form, then sign in.</p></div>}
        <p className="rc-login-access">{request?'Already have an invitation?':'New to RepCount?'} <button onClick={()=>{setRequest(!request);setHelp(false);}}>{request?'Back to login':'Request access'}</button></p>
      </section>
    </main>
    <footer className="rc-login-footer"><span>© 2026 RepCount</span><span>Personal training. Thoughtful support.</span></footer>
  </div>;
}

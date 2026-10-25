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
] as const;

/** Sign-in for members, trainers and the super admin. Access requests remain a preview until intake is built. */
export default function Login({showDemoAccounts}:{showDemoAccounts:boolean}) {
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
          {state?.error&&<div className="rc-login-error" role="alert">{state.error}</div>}
          <label htmlFor="login-email">Email address</label><input id="login-email" name="email" type="email" placeholder="you@example.com" autoComplete="username" required defaultValue={state?.email} aria-invalid={!!state?.error}/>
          <div className="rc-login-password-label"><label htmlFor="login-password">Password</label><button type="button" aria-expanded={help} aria-controls="login-help" onClick={()=>setHelp(!help)}>Forgot password?</button></div>
          <input id="login-password" name="password" type="password" placeholder="Your password" autoComplete="current-password" required aria-invalid={!!state?.error}/>
          <div id="login-help" className="rc-login-help" role="status">{help&&'Ask the RepCount team to send you a new invitation link. Self-service reset is coming soon.'}</div>
          <button type="submit" className="rc-login-submit" disabled={pending}>{pending?'Signing in…':'Sign in'} <Icon name="arrow" size={19}/></button>
        </form>}
        {showDemoAccounts&&!request&&<div className="rc-login-demo"><span>Demo accounts</span><div className="rc-login-demo-list">{demoAccounts.map(([role,email,password])=><button key={email} type="button" onClick={()=>fill(email,password)}><b>{role}</b><small>{email} · {password}</small></button>)}</div><p>Tap one to fill the form, then sign in.</p></div>}
        <p className="rc-login-access">{request?'Already have an invitation?':'New to RepCount?'} <button onClick={()=>{setRequest(!request);setHelp(false);}}>{request?'Back to login':'Request access'}</button></p>
      </section>
    </main>
    <footer className="rc-login-footer"><span>© 2026 RepCount</span><span>Personal training. Thoughtful support.</span></footer>
  </div>;
}

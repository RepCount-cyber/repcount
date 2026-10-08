"use client";

import {useEffect,useRef,useState} from 'react';
import Brand from './Brand';
import {Icon,media} from './Media';
import './login.css';

/** Account-screen preview. Real credentials are deliberately not collected. */
export default function Login({onHome,onDemo}:{onHome:()=>void;onDemo:()=>void}) {
  const heading=useRef<HTMLHeadingElement>(null);
  const [help,setHelp]=useState(false);
  const [request,setRequest]=useState(false);
  useEffect(()=>{
    const previousTitle=document.title;
    document.title=request?'Request access — RepCount':'Log in — RepCount';
    window.scrollTo({top:0,behavior:'instant'});
    heading.current?.focus({preventScroll:true});
    return()=>{document.title=previousTitle;};
  },[request]);
  return <div className="rc-login">
    <a className="skip" href="#login-main">Skip to login</a>
    <header className="rc-login-header"><button onClick={onHome} aria-label="RepCount home"><Brand/></button><button className="rc-login-back" onClick={onHome}><span aria-hidden="true">←</span> Back to RepCount</button></header>
    <main id="login-main" className="rc-login-layout">
      <section className="rc-login-story" aria-label="Personal coaching at home">
        <img src={media.home.poster} alt="Woman exercising in her living room"/>
        <div className="rc-login-story-shade"/>
        <div className="rc-login-story-top"><span className="rc-login-dot"/> YOUR SPACE. YOUR PACE.</div>
        <div className="rc-login-story-copy"><span>MAKE ROOM FOR YOU</span><h2>A little effort.<br/><em>A stronger everyday.</em></h2><p>Your plan, your progress and a person in your corner.</p><div className="rc-login-story-tags"><span><Icon name="move" size={16}/> Personal training</span><span><Icon name="heart" size={16}/> Thoughtful support</span></div></div>
        <span className="rc-login-photo-note">Illustrative home-training photograph</span>
      </section>
      <section className="rc-login-panel" aria-labelledby="login-heading">
        <div className="rc-login-intro"><span className="rc-login-eyebrow">YOUR REPCOUNT SPACE</span><h1 id="login-heading" tabIndex={-1} ref={heading}>{request?<>Your next<br/><em>chapter.</em></>:<>Welcome<br/><em>back.</em></>}</h1><p>{request?'Share your details. The team will review your request and payment before inviting you.':<>A little time for your plan.<br/>A little space for your progress.</>}</p></div>
        <div className="rc-login-preview" id="login-availability"><Icon name="lock" size={18}/><div><strong>{request?'Registration preview':'Member sign-in is coming soon.'}</strong><p>{request?'This form is not accepting details yet. Nothing will be submitted or stored.':'This is the login-page preview. Accounts aren’t active yet, so there’s no need to enter an email or password.'}</p></div></div>
        <form className="rc-login-form" aria-describedby="login-availability" onSubmit={event=>event.preventDefault()}>
          {request&&<><label htmlFor="login-name">Full name</label><input id="login-name" type="text" placeholder="Your full name" autoComplete="off" disabled/><span className="rc-login-field-gap"/></>}
          <label htmlFor="login-email">Email address</label><input id="login-email" type="email" placeholder="you@example.com" autoComplete="off" disabled/>
          {request?<><label className="rc-login-spaced-label" htmlFor="login-phone">Phone number <span>(optional)</span></label><input id="login-phone" type="tel" placeholder="Include your country code" autoComplete="off" disabled/><label className="rc-login-spaced-label" htmlFor="login-payment">Payment reference <span>(if already paid)</span></label><input id="login-payment" type="text" placeholder="Reference only — no bank or card details" autoComplete="off" disabled/><p className="rc-login-form-note">Account access follows admin approval. You’ll set your own password using an invitation link. A payment reference alone does not confirm payment.</p></>:<>
          <div className="rc-login-password-label"><label htmlFor="login-password">Password</label><button type="button" aria-expanded={help} aria-controls="login-help" onClick={()=>setHelp(!help)}>Forgot password?</button></div>
          <input id="login-password" type="password" placeholder="Your password" autoComplete="off" disabled/>
          <div id="login-help" className="rc-login-help" role="status">{help&&'Password reset will be available when secure accounts open. No reset email has been sent.'}</div>
          </>}
          <button type="submit" className="rc-login-submit" disabled>{request?'Submit request':'Sign in'} <Icon name="arrow" size={19}/></button>
        </form>
        <div className="rc-login-demo"><span>Take a look around</span><button onClick={onDemo}>Explore the member demo <Icon name="diagonal" size={18}/></button><p>Sample information only. No account needed.</p></div>
        <p className="rc-login-access">{request?'Already have an invitation?':'New to RepCount?'} <button onClick={()=>{setRequest(!request);setHelp(false);}}>{request?'Back to login':'Preview the access-request form'}</button></p>
      </section>
    </main>
    <footer className="rc-login-footer"><span>© 2026 RepCount</span><span>Personal training. Thoughtful support.</span></footer>
  </div>;
}

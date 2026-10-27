"use client";

import Photo from './Photo';
import {useEffect, useState} from 'react';
import Brand, {RepCountMark} from './Brand';
import Film, {Icon} from './Media';
import Experience, {MiniPhone} from './Experience';
import './landing-premium.css';
import './accessibility-polish.css';

const homePhoto='https://images.pexels.com/photos/6496088/pexels-photo-6496088.jpeg?auto=compress&cs=tinysrgb&w=1000';
const questions=[
 ['Is this for me if I’m just starting out?','The first pilot is for adults in India. Your goals, experience, available space and equipment are discussed before a trainer finalises your plan. You don’t have to arrive with a perfect routine.'],
 ['Can I train at home?','Yes. The programme is planned around online coaching, with workouts adapted to your available space and equipment. Home, gym or a mix can be discussed with your trainer.'],
 ['Are personalised diet plans included?','You can plan a daily meal rhythm and log meals in the app. Individual diet plans are not included: personalised nutrition plans are not currently part of the confirmed pilot package.'],
 ['How do I pay for the pilot?','The price is shown in the programme section, in UAE dirhams (AED) for 30 days. Payment is manual and verified by the team; the payment method will be confirmed before enrolment.'],
 ['How do I join?','Create your account, tell us your goal and where you’ll train, then submit your payment reference from your profile page. Once the team verifies it, your trainer books your first call.'],
];

export default function Landing({onRegister,onLogin,price}:{onRegister:()=>void;onLogin:()=>void;price:{amount:string;currency:string}}) {
 const [menu,setMenu]=useState(false);
 const [heroClip,setHeroClip]=useState<'flow'|'coach'>('flow');
 useEffect(()=>{
   if(!menu)return;
   const closeMenu=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMenu(false);document.querySelector<HTMLButtonElement>('.rc-menu')?.focus();}};
   document.addEventListener('keydown',closeMenu);
   return()=>document.removeEventListener('keydown',closeMenu);
 },[menu]);
 function start(){setMenu(false);onRegister();}
 function scrollToExperience(){
   const target=document.getElementById('experience-heading');
   target?.setAttribute('tabindex','-1');
   target?.focus({preventScroll:true});
   document.getElementById('experience')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }
 return <div className="rc-site" id="rc-top">
   <a className="skip" href="#rc-main">Skip to content</a>
   <header className="rc-header">
     <a href="#rc-top" aria-label="RepCount home"><Brand/></a>
     <nav id="rc-main-menu" className={menu?'rc-main-nav open':'rc-main-nav'} aria-label="Main navigation">
       {[['#experience','The experience'],['#programme','Programme & price'],['#questions','Questions']].map(([link,label])=><a href={link} key={link} onClick={()=>setMenu(false)}>{label}</a>)}
       <button className="rc-mobile-member" onClick={onLogin}>Log in <Icon name="diagonal" size={16}/></button>
     </nav>
     <div className="rc-header-actions"><button className="rc-member-link" onClick={onLogin}>Log in <Icon name="diagonal" size={15}/></button><button className="rc-button rc-small" onClick={start}>Find your starting point <Icon name="arrow" size={17}/></button><button className="rc-menu" aria-label={menu?'Close menu':'Open menu'} aria-expanded={menu} aria-controls="rc-main-menu" onClick={()=>setMenu(!menu)}><Icon name={menu?'close':'menu'} size={25}/></button></div>
   </header>
   <main id="rc-main">
     <section className="rc-hero">
       <div className="rc-hero-copy"><p className="rc-eyebrow"><span/> PERSONAL COACHING. REAL LIFE.</p><h1 tabIndex={-1}>Stronger,<br/>in your<br/><em>own space.</em></h1><p>Your own workout plan. A weekly trainer check-in. Thoughtful support to help you build a routine that fits your life.</p><div className="rc-hero-actions"><button className="rc-button" onClick={start}>Find your starting point <Icon name="diagonal"/></button><button className="rc-play-link" onClick={scrollToExperience}><span><Icon name="play" size={16}/></span>See it in action</button></div><div className="rc-hero-promise"><Icon name="home" size={17}/><span>At home. At your pace. With you.</span></div></div>
       <div className="rc-hero-visual"><div className="rc-hero-film-wrap">{heroClip==='flow'?<div className="rc-hero-client-scene"><Film key="athome" clip="athome" controls={false} priority className="rc-hero-film rc-hero-film--man" caption="TRAIN AT HOME. GUIDED ONLINE."/><div className="rc-online-coach-preview"><Film key="trainer" clip="trainer" controls={false} className="rc-hero-film rc-hero-film--trainer"/><span><i/> COACH VIEW</span></div></div>:<Film key="coach" clip="coach" controls={false} priority className="rc-hero-film" caption="YOUR COACH, WHEREVER YOU ARE."/>}<div className="rc-hero-film-switch" role="group" aria-label="Choose home coaching scene"><button className={heroClip==='flow'?'active':''} onClick={()=>setHeroClip('flow')} aria-pressed={heroClip==='flow'}>Home session</button><button className={heroClip==='coach'?'active':''} onClick={()=>setHeroClip('coach')} aria-pressed={heroClip==='coach'}>Watch a coach</button></div></div><div className="rc-hero-chip rc-hero-chip--plan" aria-hidden="true"><span><Icon name="check" size={15}/></span><p><b>Today’s plan</b><small>Home strength · 20 min</small></p></div><div className="rc-hero-chip rc-hero-chip--coach" aria-hidden="true"><span><Icon name="chat" size={15}/></span><p><b>Weekly coach follow-up</b><small>Every week, one to one</small></p></div><div className="rc-hero-phone"><MiniPhone onExplore={scrollToExperience}/></div><div className="rc-hero-caption"><span className="rc-round-arrow"><Icon name="diagonal" size={20}/></span><p>A plan in your pocket.<br/><b>A person in your corner.</b></p></div></div>
     </section>
     <div className="rc-belief-strip"><span>MORE THAN A WORKOUT</span><div><Icon name="move"/>Personal training</div><div><Icon name="heart"/>Thoughtful support</div><div><Icon name="chart"/>Everyday momentum</div><a href="#programme">The RepCount approach <Icon name="arrow" size={16}/></a></div>
     <Experience onRegister={onRegister}/>
     <section className="rc-home-story rc-section" id="at-home">
       <div className="rc-section-head"><div><p className="rc-eyebrow">YOUR LIVING ROOM. YOUR FRESH START.</p><h2>A little space.<br/><em>A whole lot of possibility.</em></h2></div><p>A mat by the window. A break between meetings. Training can find a place in your day, wherever you’re starting.</p></div>
       <div className="rc-home-grid"><article className="rc-home-main"><Photo src={homePhoto} alt="Smiling woman exercising with a dumbbell at home"/><div className="rc-photo-shade"/><span className="rc-photo-pill"><Icon name="home" size={15}/> BUILT AROUND YOUR SPACE</span><div className="rc-home-main-copy"><p>Show up as you are.</p><h3>We’ll start<br/>from there.</h3><button onClick={start}>Explore your starting point <Icon name="diagonal" size={19}/></button></div></article><div className="rc-home-side"><article className="rc-home-video"><Film clip="cardio" controls={false} caption="HOME. MAT. MOMENTUM."/><div><h3>Your everyday energy.</h3><p>See a home session in motion.</p></div></article><article className="rc-coaching-card"><span><Icon name="chat" size={25}/></span><h3>Plans change.<br/>Your plan can, too.</h3><p>Weekly trainer follow-ups make space for what worked, what didn’t and what comes next.</p><a href="#programme">See the programme <Icon name="arrow" size={17}/></a></article></div></div>
       <div className="rc-home-foot"><span>HOME OR GYM</span><span>PERSONAL WORKOUT PLAN</span><span>WEEKLY TRAINER FOLLOW-UP</span><span>ALL ONLINE</span></div>
     </section>
     
     <section className="rc-journey rc-section" id="how">
       <div className="rc-section-head"><div><p className="rc-eyebrow">START SMALL. BUILD SOMETHING YOURS.</p><h2>Your first 30 days.<br/><em>A little more you.</em></h2></div><button className="rc-text-link" onClick={start}>Find your starting point <Icon name="diagonal"/></button></div>
       <div className="rc-journey-grid">{[['01','Start with you.','ONBOARDING','A first call with your trainer about your goals, routine and equipment.','heart'],['02','Find your rhythm.','YOUR PERSONAL PLAN','Meet your trainer’s plan for your space, experience and everyday routine.','move'],['03','Keep in touch.','WEEKLY FOLLOW-UPS','Bring questions, reflect on your progress and adjust the next steps together.','chat'],['04','See what sticks.','30-DAY REFLECTION','Look back at the routine you’ve started, then discuss the way forward.','chart']].map(([n,title,label,body,icon])=><article key={n}><div><span>{n}</span><Icon name={icon} size={25}/></div><small>{label}</small><h3>{title}</h3><p>{body}</p></article>)}</div>
     </section>
     <section className="rc-programme rc-section" id="programme"><div className="rc-programme-copy"><p className="rc-eyebrow">THE FOUNDING PILOT</p><h2>A personal start.<br/><em>Room to grow.</em></h2><p>A small first cohort. Real attention. Thirty days to start building a routine with people in your corner.</p><div className="rc-cohort-facts"><div><strong>10</strong><span>adults in the<br/>first India cohort</span></div><div><strong>30</strong><span>days of<br/>personal support</span></div></div><p className="rc-launch-note"><span/> Now enrolling · India, online</p><div className="rc-proposed-team"><span>YOUR COACHING TEAM</span><div><b>Akif</b><small>Trainer coordination</small></div><p>Your trainer confirms your first call after you register.</p></div></div><div className="rc-price-card"><div className="rc-price-top"><Brand variant="phone" tone="light"/><span>FOUNDING PROGRAMME</span></div><p>For your next chapter.</p><div className="rc-price"><span>{price.currency}</span><strong>{Number(price.amount).toLocaleString("en-AE")}</strong><small>/ 30 days</small></div><ul>{['Personalised trainer-led workout plan','Weekly trainer follow-ups','A place to follow your plan and progress'].map(item=><li key={item}><Icon name="check" size={17}/>{item}</li>)}</ul><button className="rc-button rc-white" onClick={start}>Create your account <Icon name="diagonal"/></button><p className="rc-payment-note">Manual payment, verified by the team. Priced in AED.</p><div className="rc-price-bottom"><Icon name="lock" size={15}/> You pay only after your place is confirmed.</div></div></section>
     <section className="rc-faq rc-section" id="questions"><div><p className="rc-eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</p><h2>Good questions.<br/><em>Clear answers.</em></h2><p>Get comfortable with the idea<br/>before taking the next step.</p></div><div className="rc-faq-list">{questions.map(([q,a])=><details key={q}><summary>{q}<Icon name="plus" size={19}/></summary><p>{a}</p></details>)}</div></section>
     <section className="rc-finale"><div className="rc-finale-mark"><RepCountMark/></div><p className="rc-eyebrow">YOU DON’T HAVE TO DO IT ALL TODAY.</p><h2>Just make room<br/><em>for a beginning.</em></h2><button className="rc-button" onClick={start}>Find your starting point <Icon name="diagonal"/></button><span>Your space. Your pace. Your RepCount.</span></section>
   </main>
   <footer className="rc-footer"><div className="rc-footer-main"><div><Brand variant="footer"/><p>Personal training.<br/>A more thoughtful kind of support.</p></div><div><span>MAKE YOURSELF AT HOME</span><a href="#experience">The experience</a><a href="#programme">Programme &amp; price</a><button onClick={onRegister}>Create your account <Icon name="diagonal" size={14}/></button><button onClick={onLogin}>Log in <Icon name="diagonal" size={14}/></button></div><div><span>OUR STARTING POINT</span><p>India · Online coaching<br/>Adults 18+ · 30-day pilot</p><small>Enrol online. Payment is verified<br/>by the team before you start.</small></div></div><div className="rc-footer-bottom"><span>© 2026 RepCount. Make every rep count.</span><details className="rc-credits"><summary>Image & video credits</summary><p>Stock media from <a href="https://mixkit.co/free-stock-video/physical-education-teacher-recording-a-class-5055/" target="_blank" rel="noreferrer">Mixkit</a>, <a href="https://www.pexels.com/" target="_blank" rel="noreferrer">Pexels</a> and <a href="https://unsplash.com/photos/IGfIGP5ONV0" target="_blank" rel="noreferrer">Unsplash</a>. People shown are not presented as RepCount staff or clients.</p></details><a href="#rc-top">Back to top <Icon name="diagonal" size={15}/></a></div></footer>
 </div>;
}

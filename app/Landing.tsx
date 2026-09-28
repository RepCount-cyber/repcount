"use client";

import {useEffect, useRef, useState} from 'react';
import Brand, {RepCountMark} from './Brand';
import Film, {Icon, consultation} from './Media';
import Experience, {MiniPhone} from './Experience';
import './landing-premium.css';
import './accessibility-polish.css';

const homePhoto='https://images.pexels.com/photos/6496088/pexels-photo-6496088.jpeg?auto=compress&cs=tinysrgb&w=1000';
const warmPhoto='https://images.pexels.com/photos/6697252/pexels-photo-6697252.jpeg?auto=compress&cs=tinysrgb&w=800';
const questions=[
 ['Is this for me if I’m just starting out?','The first pilot is for adults in India. Your goals, experience, available space and equipment are discussed before a trainer finalises your plan. You don’t have to arrive with a perfect routine.'],
 ['Can I train at home?','Yes. The programme is planned around online coaching, with workouts adapted to your available space and equipment. Home, gym or a mix can be discussed with your trainer.'],
 ['What happens in the wellbeing conversation?','The pilot includes an initial psychologist onboarding session. You agree what practical guidance may be shared with your trainer. Private counselling notes stay separate from general training records; ongoing therapy is not a confirmed programme inclusion.'],
 ['Are personalised diet plans included?','The meal-planning screens are a preview. Nutrition support and professional responsibility are still being finalised, so personalised nutrition plans are not currently part of the confirmed pilot package.'],
 ['How do I pay for the pilot?','The proposed price is AED 250 for 30 days. Payment is manual and verified by the team. The India collection currency and payment method will be confirmed before enrolment. This preview does not collect payments.'],
 ['Can I join or book a consultation here?','This is an interactive design preview, so you can explore the plan, videos and member experience with sample information. Real enrolment, secure accounts and appointments are not open on this site yet.'],
];

export default function Landing({onEnter}:{onEnter:()=>void}) {
 const [menu,setMenu]=useState(false);
 const [quiz,setQuiz]=useState(false);
 const [step,setStep]=useState(0);
 const [goal,setGoal]=useState('Build strength');
 const [place,setPlace]=useState('At home');
 const [days,setDays]=useState('3 days');
 const [heroClip,setHeroClip]=useState<'flow'|'coach'>('flow');
 const dialog=useRef<HTMLDialogElement>(null);
 const quizHeading=useRef<HTMLHeadingElement>(null);
 const returnFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{
   if(!quiz)return;
   const el=dialog.current;
   const previousOverflow=document.body.style.overflow;
   el?.showModal();document.body.style.overflow='hidden';
   return()=>{el?.close();document.body.style.overflow=previousOverflow;returnFocus.current?.focus();};
 },[quiz]);
 useEffect(()=>{if(quiz){const id=requestAnimationFrame(()=>quizHeading.current?.focus());return()=>cancelAnimationFrame(id);}},[quiz,step]);
 useEffect(()=>{
   if(!menu)return;
   const closeMenu=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMenu(false);document.querySelector<HTMLButtonElement>('.rc-menu')?.focus();}};
   document.addEventListener('keydown',closeMenu);
   return()=>document.removeEventListener('keydown',closeMenu);
 },[menu]);
 function start(){returnFocus.current=document.activeElement as HTMLElement;setStep(0);setMenu(false);setQuiz(true);}
 function scrollToExperience(){
   const target=document.getElementById('experience-heading');
   target?.setAttribute('tabindex','-1');
   target?.focus({preventScroll:true});
   document.getElementById('experience')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }
 function enter(){setQuiz(false);onEnter();}
 const quizChoices=step===0?['Build strength','Build a consistent routine','Feel more confident exercising']:step===1?['At home','At a gym','A mix of both']:['2 days','3 days','4 days'];
 const selected=step===0?goal:step===1?place:days;
 const quizTitles=['What feels important to you?','Where will you make room?','Find a rhythm that fits.','Your starting point.'];
 return <div className="rc-site" id="rc-top">
   <a className="skip" href="#rc-main">Skip to content</a>
   <div className="rc-preview-bar"><span><i/> A personal approach to moving well.</span><span>INDIA PILOT <b>·</b> INTERACTIVE PREVIEW</span></div>
   <header className="rc-header">
     <a href="#rc-top" aria-label="RepCount home"><Brand/></a>
     <nav id="rc-main-menu" className={menu?'rc-main-nav open':'rc-main-nav'} aria-label="Main navigation">
       {[['#experience','The experience'],['#support','Your support'],['#programme','The programme'],['#questions','Questions']].map(([link,label])=><a href={link} key={link} onClick={()=>setMenu(false)}>{label}</a>)}
       <button className="rc-mobile-member" onClick={onEnter}>Member demo <Icon name="diagonal" size={16}/></button>
     </nav>
     <div className="rc-header-actions"><button className="rc-member-link" onClick={onEnter}>Member demo <Icon name="diagonal" size={15}/></button><button className="rc-button rc-small" onClick={start}>Find your starting point <Icon name="arrow" size={17}/></button><button className="rc-menu" aria-label={menu?'Close menu':'Open menu'} aria-expanded={menu} aria-controls="rc-main-menu" onClick={()=>setMenu(!menu)}><Icon name={menu?'close':'menu'} size={25}/></button></div>
   </header>
   <main id="rc-main">
     <section className="rc-hero">
       <div className="rc-hero-copy"><p className="rc-eyebrow"><span/> PERSONAL COACHING. REAL LIFE.</p><h1 tabIndex={-1}>Stronger,<br/>in your<br/><em>own space.</em></h1><p>Make a little room for yourself. Personal training, thoughtful support and a plan that fits the life you actually live.</p><div className="rc-hero-actions"><button className="rc-button" onClick={start}>Find your starting point <Icon name="diagonal"/></button><button className="rc-play-link" onClick={scrollToExperience}><span><Icon name="play" size={16}/></span>See it in action</button></div><div className="rc-hero-promise"><Icon name="home" size={17}/><span>At home. At your pace. With you.</span></div></div>
       <div className="rc-hero-visual"><div className="rc-hero-film-wrap"><Film key={heroClip} clip={heroClip} controls={false} priority className="rc-hero-film" caption="A LITTLE TIME. JUST FOR YOU."/><div className="rc-hero-film-switch" role="group" aria-label="Choose home coaching video"><button className={heroClip==='flow'?'active':''} onClick={()=>setHeroClip('flow')} aria-pressed={heroClip==='flow'}>Move at home</button><button className={heroClip==='coach'?'active':''} onClick={()=>setHeroClip('coach')} aria-pressed={heroClip==='coach'}>Coach from home</button></div></div><div className="rc-hero-phone"><MiniPhone onExplore={scrollToExperience}/></div><div className="rc-hero-caption"><span className="rc-round-arrow"><Icon name="diagonal" size={20}/></span><p>A plan in your pocket.<br/><b>A person in your corner.</b></p></div></div>
     </section>
     <div className="rc-belief-strip"><span>MORE THAN A WORKOUT</span><div><Icon name="move"/>Personal training</div><div><Icon name="heart"/>Thoughtful support</div><div><Icon name="chart"/>Everyday momentum</div><a href="#support">The RepCount approach <Icon name="arrow" size={16}/></a></div>
     <Experience onEnter={onEnter}/>
     <section className="rc-home-story rc-section" id="at-home">
       <div className="rc-section-head"><div><p className="rc-eyebrow">YOUR LIVING ROOM. YOUR FRESH START.</p><h2>A little space.<br/><em>A whole lot of possibility.</em></h2></div><p>A mat by the window. A break between meetings. Training can find a place in your day, wherever you’re starting.</p></div>
       <div className="rc-home-grid"><article className="rc-home-main"><img src={homePhoto} loading="lazy" alt="Smiling woman exercising with a dumbbell at home"/><div className="rc-photo-shade"/><span className="rc-photo-pill"><Icon name="home" size={15}/> BUILT AROUND YOUR SPACE</span><div className="rc-home-main-copy"><p>Show up as you are.</p><h3>We’ll start<br/>from there.</h3><button onClick={start}>Explore your starting point <Icon name="diagonal" size={19}/></button></div></article><div className="rc-home-side"><article className="rc-home-video"><Film clip="cardio" controls={false} caption="HOME. MAT. MOMENTUM."/><div><h3>Your everyday energy.</h3><p>See a home session in motion.</p></div></article><article className="rc-coaching-card"><span><Icon name="chat" size={25}/></span><h3>Plans change.<br/>Your plan can, too.</h3><p>Weekly trainer follow-ups make space for what worked, what didn’t and what comes next.</p><a href="#support">Meet your support <Icon name="arrow" size={17}/></a></article></div></div>
       <div className="rc-home-foot"><span>HOME OR GYM</span><span>PERSONAL WORKOUT PLAN</span><span>WEEKLY TRAINER FOLLOW-UP</span><span>ALL ONLINE</span></div>
     </section>
     <section className="rc-support" id="support">
       <div className="rc-support-inner"><div className="rc-support-visual"><div className="rc-support-photo"><img src={consultation} loading="lazy" alt="Illustrative conversation between a woman and a wellbeing professional"/><span>ILLUSTRATIVE CONSULTATION</span></div><div className="rc-support-small"><img src={warmPhoto} loading="lazy" alt="Woman connecting with an online exercise session at home"/><span><Icon name="heart" size={20}/> HUMAN, FROM THE START.</span></div><div className="rc-support-circle"><span>MOVE WELL</span><Icon name="sun" size={35}/><span>FEEL SUPPORTED</span></div></div><div className="rc-support-copy"><p className="rc-eyebrow">YOU’RE A PERSON. NOT A PROGRAMME.</p><h2>Before the first rep,<br/><em>a real conversation.</em></h2><p>Your starting point is more than your fitness goal. The pilot begins with psychologist onboarding, followed by a trainer-led plan shaped around the practical guidance you agree to share.</p><div className="rc-support-points"><div><span>01</span><p><b>Space to be heard.</b>Discuss your needs, expectations and starting point.</p></div><div><span>02</span><p><b>You decide what is shared.</b>Agree what practical context your trainer receives.</p></div><div><span>03</span><p><b>Support that keeps moving.</b>Review your routine with your trainer each week.</p></div></div><div className="rc-support-privacy"><Icon name="lock" size={17}/><p>Private counselling notes stay separate from general training records.</p></div></div></div>
     </section>
     <section className="rc-journey rc-section" id="how">
       <div className="rc-section-head"><div><p className="rc-eyebrow">START SMALL. BUILD SOMETHING YOURS.</p><h2>Your first 30 days.<br/><em>A little more you.</em></h2></div><button className="rc-text-link" onClick={start}>Find your starting point <Icon name="diagonal"/></button></div>
       <div className="rc-journey-grid">{[['01','Start with you.','ONBOARDING','A conversation about your goals and needs. Agree what support looks like.','heart'],['02','Find your rhythm.','YOUR PERSONAL PLAN','Meet your trainer’s plan for your space, experience and everyday routine.','move'],['03','Keep in touch.','WEEKLY FOLLOW-UPS','Bring questions, reflect on your progress and adjust the next steps together.','chat'],['04','See what sticks.','30-DAY REFLECTION','Look back at the routine you’ve started, then discuss the way forward.','chart']].map(([n,title,label,body,icon])=><article key={n}><div><span>{n}</span><Icon name={icon} size={25}/></div><small>{label}</small><h3>{title}</h3><p>{body}</p></article>)}</div>
     </section>
     <section className="rc-programme rc-section" id="programme"><div className="rc-programme-copy"><p className="rc-eyebrow">THE FOUNDING PILOT</p><h2>A personal start.<br/><em>Room to grow.</em></h2><p>A small first cohort. Real attention. Thirty days to start building a routine with people in your corner.</p><div className="rc-cohort-facts"><div><strong>10</strong><span>adults in the<br/>first India cohort</span></div><div><strong>30</strong><span>days of<br/>personal support</span></div></div><p className="rc-launch-note"><span/> Planned service start · 15 October 2026</p><div className="rc-proposed-team"><span>YOUR PROPOSED PILOT TEAM</span><div><b>Akif</b><small>Trainer coordination</small><b>Thasleema</b><small>Psychologist onboarding</small></div><p>Team availability and appointments confirmed before enrolment.</p></div></div><div className="rc-price-card"><div className="rc-price-top"><Brand variant="phone" tone="light"/><span>FOUNDING PROGRAMME</span></div><p>For your next chapter.</p><div className="rc-price"><span>AED</span><strong>250</strong><small>/ 30 days</small></div><ul>{['Initial psychologist onboarding session','Personalised trainer-led workout plan','Weekly trainer follow-ups','A place to follow your plan and progress'].map(item=><li key={item}><Icon name="check" size={17}/>{item}</li>)}</ul><button className="rc-button rc-white" onClick={start}>Explore the pilot <Icon name="diagonal"/></button><p className="rc-payment-note">Manual payment, verified by the team. India collection currency and payment method confirmed before enrolment.</p><div className="rc-price-bottom"><Icon name="lock" size={15}/> No payment is taken in this preview.</div></div></section>
     <section className="rc-faq rc-section" id="questions"><div><p className="rc-eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</p><h2>Good questions.<br/><em>Clear answers.</em></h2><p>Get comfortable with the idea<br/>before taking the next step.</p></div><div className="rc-faq-list">{questions.map(([q,a])=><details key={q}><summary>{q}<Icon name="plus" size={19}/></summary><p>{a}</p></details>)}</div></section>
     <section className="rc-finale"><div className="rc-finale-mark"><RepCountMark/></div><p className="rc-eyebrow">YOU DON’T HAVE TO DO IT ALL TODAY.</p><h2>Just make room<br/><em>for a beginning.</em></h2><button className="rc-button" onClick={start}>Find your starting point <Icon name="diagonal"/></button><span>Your space. Your pace. Your RepCount.</span></section>
   </main>
   <footer className="rc-footer"><div className="rc-footer-main"><div><Brand variant="footer"/><p>Personal training.<br/>A more thoughtful kind of support.</p></div><div><span>MAKE YOURSELF AT HOME</span><a href="#experience">The experience</a><a href="#support">Your support</a><a href="#programme">The programme</a><button onClick={onEnter}>Member demo <Icon name="diagonal" size={14}/></button></div><div><span>OUR STARTING POINT</span><p>India · Online coaching<br/>Adults 18+ · 30-day pilot</p><small>Design demo. No live enrolment,<br/>payments or appointments.</small></div></div><div className="rc-footer-bottom"><span>© 2026 RepCount. Make every rep count.</span><details className="rc-credits"><summary>Image & video credits</summary><p>Illustrative stock media from <a href="https://mixkit.co/free-stock-video/physical-education-teacher-recording-a-class-5055/" target="_blank" rel="noreferrer">Mixkit</a>, <a href="https://www.pexels.com/photo/concentrated-female-psychologist-consulting-patient-in-office-7176320/" target="_blank" rel="noreferrer">Pexels</a> and <a href="https://unsplash.com/photos/IGfIGP5ONV0" target="_blank" rel="noreferrer">Unsplash</a>. People shown are not presented as RepCount staff or clients.</p></details><a href="#rc-top">Back to top <Icon name="diagonal" size={15}/></a></div></footer>
   <dialog className="rc-quiz" ref={dialog} aria-labelledby="rc-quiz-heading" onCancel={()=>setQuiz(false)}><div className="rc-quiz-inner"><div className="rc-quiz-top"><Brand variant="phone"/><button className="rc-quiz-close" aria-label="Close starting-point quiz" onClick={()=>setQuiz(false)}><Icon name="close"/></button></div><p className="rc-eyebrow">YOUR STARTING POINT · {step<3?`0${step+1} / 03`:'YOUR PREVIEW'}</p><div className="rc-quiz-progress"><i style={{width:`${(step+1)*25}%`}}/></div><h2 id="rc-quiz-heading" ref={quizHeading} tabIndex={-1}>{quizTitles[step]}</h2>{step<3?<><p>{['Choose the goal that matters most right now.','A good plan starts with the space you have.','This is a preference to discuss with your trainer.'][step]}</p><div className="rc-quiz-options">{quizChoices.map((value,i)=><button key={value} aria-pressed={selected===value} className={selected===value?'selected':''} onClick={()=>step===0?setGoal(value):step===1?setPlace(value):setDays(value)}><span>0{i+1}</span>{value}<i>{selected===value?<Icon name="check" size={16}/>:<Icon name="plus" size={16}/>}</i></button>)}</div><div className="rc-quiz-buttons">{step>0?<button className="rc-text-link" onClick={()=>setStep(step-1)}>Back</button>:<span/>}<button className="rc-button" onClick={()=>setStep(step+1)}>Continue <Icon name="arrow"/></button></div></>:<><div className="rc-quiz-result"><div><span>YOUR GOAL</span><b>{goal}</b></div><div><span>YOUR SPACE</span><b>{place}</b></div><div><span>YOUR RHYTHM</span><b>{days} per week</b></div></div><p>It starts with a conversation. An onboarding session and trainer-approved plan would come next. For now, explore how that everyday experience could feel.</p><button className="rc-button" onClick={enter}>Explore the member demo <Icon name="diagonal"/></button><button className="rc-quiz-restart" onClick={()=>setStep(0)}>Change my answers</button></>}<small className="rc-quiz-disclosure"><Icon name="lock" size={13}/> Demo only. No application or personal information is sent.</small></div></dialog>
 </div>;
}

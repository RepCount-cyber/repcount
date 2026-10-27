"use client";
import Photo from "./Photo";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import Brand from "./Brand";
import {Icon} from "./Media";
import Nutrition from "./Nutrition";
import { logout } from "./actions/auth";
import { saveProgress } from "./actions/data";
import Motivation from "./Motivation";
import {useTracker,DailyTracker,ProgressDashboard,PlanWeek,CoachPanel,JourneyTimeline} from "./Tracker";
import {memberViews,type MemberView} from "@/lib/memberViews";
import type {MemberState} from "@/lib/memberState";
import {formatTime, type WeekPlan} from "@/lib/schedule";
import AssignedPlan from "./AssignedPlan";
import "./member-polish.css";
import "./accessibility-polish.css";

type View = MemberView;
type Modal = "booking" | "checkin" | "join" | "payment" | "message" | null;
export type MemberUser={name:string;initials:string;email:string};
const dayMs=86400000;
/** weekStart is the Monday (YYYY-MM-DD, India time) computed on the server, so both renders agree. */
function weekDates(weekStart:string){
  const monday=Date.parse(`${weekStart}T00:00:00Z`);
  return Array.from({length:7},(_,i)=>new Date(monday+i*dayMs));
}
const fmt=(d:Date,o:Intl.DateTimeFormatOptions)=>d.toLocaleDateString("en-GB",{timeZone:"UTC",...o});
const photo = "https://images.pexels.com/videos/8837215/pexels-photo-8837215.jpeg?auto=compress&w=1200";
const exercises = [
  ["Easy warm-up", "5 minutes · gentle movement", "Begin at a comfortable pace. This session illustrates the app experience; it is not a personalised prescription."],
  ["Chair squat", "2 sets · 8 repetitions", "Use a stable chair. Move slowly within a comfortable range."],
  ["Wall push-up", "2 sets · 8 repetitions", "Use a stable wall and keep the movement controlled."],
  ["Standing calf raise", "2 sets · 10 repetitions", "Use stable support for balance and lower your heels slowly."],
  ["Gentle cool-down", "5 minutes · easy movement", "Finish gently. Stop if you feel pain or unwell and seek appropriate advice."],
];
export default function MemberApp({user,initial,price,schedule,coach,checkinLink,membership}:{user:MemberUser;initial:MemberState;price:{amount:string;currency:string};schedule:WeekPlan|null;coach:{name:string;initials:string};checkinLink:string|null;membership:{start:string;end:string}|null}) {
  const weekStart=initial.weekStart;
  const router=useRouter();
  const segment=usePathname().split("/")[2] as View;
  const view:View=memberViews.includes(segment)?segment:"overview";
  const dates=weekDates(weekStart);
  const slots=[[4,"6:00 PM"],[5,"10:00 AM"],[5,"5:00 PM"]].map(([d,t])=>`${fmt(dates[d as number],{weekday:"long",day:"numeric",month:"short"}).replace(" ",", ")} · ${t} IST`);
  const firstName=user.name.split(" ")[0];
  const [day,setDay]=useState(()=>schedule?(new Date(`${initial.day}T00:00:00Z`).getUTCDay()+6)%7:5);
  const [done,setDone]=useState<number[]>(initial.workout.done);
  const [workout,setWorkout]=useState(false);
  const [finished,setFinished]=useState(initial.workout.finished);
  const [checkedDays,setCheckedDays]=useState<number[]>(initial.workout.completedDays);
  const [feedback,setFeedback]=useState(initial.workout.feedback);
  const [checkin,setCheckin]=useState(initial.checkin.submitted);
  const [energy,setEnergy]=useState(initial.checkin.energy);
  const [draftEnergy,setDraftEnergy]=useState(initial.checkin.energy);
  const [planFit,setPlanFit]=useState(initial.checkin.planFit);
  const [draftPlanFit,setDraftPlanFit]=useState(initial.checkin.planFit);
  const [booking,setBooking]=useState(initial.booking??slots[0]);
  const [slot,setSlot]=useState(booking);
  const [modal,setModal]=useState<Modal>(null);
  const [notice,setNotice]=useState("");
  const [payment,setPayment]=useState(initial.payment.submitted);
  const [paymentReference,setPaymentReference]=useState(initial.payment.reference);
  const [draftPaymentReference,setDraftPaymentReference]=useState(initial.payment.reference);
  const [nutrition,setNutrition]=useState(initial.nutrition);
  const [saveState,setSaveState]=useState<"saved"|"saving"|"error">("saved");
  const tracker=useTracker(initial.tracker,initial.day);
  const dialog=useRef<HTMLDialogElement>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  const dayStrip=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(view!=="plan")return;
    const frame=requestAnimationFrame(()=>{
      const strip=dayStrip.current;
      const selected=strip?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
      if(!strip||!selected)return;
      const viewport=strip.getBoundingClientRect();
      const item=selected.getBoundingClientRect();
      if(item.right>viewport.right){
        strip.scrollTo({left:strip.scrollLeft+item.right-viewport.right+4,behavior:"instant"});
      }else if(item.left<viewport.left){
        strip.scrollTo({left:Math.max(0,strip.scrollLeft+item.left-viewport.left-4),behavior:"instant"});
      }
    });
    return()=>cancelAnimationFrame(frame);
  },[view,day]);
  const firstRender=useRef(true);
  useEffect(()=>{
    if(firstRender.current){firstRender.current=false;return;}
    setModal(null);
    window.scrollTo({top:0,behavior:"instant"});
    heading.current?.focus({preventScroll:true});
  },[view]);
  const snapshot:MemberState={day:initial.day,weekStart,tracker:{water:tracker.water,steps:tracker.steps,sleep:tracker.sleep,mood:tracker.mood,trained:tracker.trained,weights:tracker.weights,fats:tracker.fats},workout:{done,finished,feedback,completedDays:checkedDays},checkin:{submitted:checkin,energy,planFit},booking,payment:{submitted:payment,reference:paymentReference},nutrition};
  const serialized=JSON.stringify(snapshot);
  const lastSaved=useRef(serialized);
  useEffect(()=>{
    if(serialized===lastSaved.current)return;
    setSaveState("saving");
    const timer=setTimeout(()=>{
      saveProgress(JSON.parse(serialized)).then(()=>{lastSaved.current=serialized;setSaveState("saved");},()=>setSaveState("error"));
    },600);
    return()=>clearTimeout(timer);
  },[serialized]);
  useEffect(()=>{
    const currentDialog=dialog.current;
    if(modal){
      const previousOverflow=document.body.style.overflow;
      currentDialog?.showModal();
      document.body.style.overflow="hidden";
      return()=>{currentDialog?.close();document.body.style.overflow=previousOverflow;};
    }
  },[modal]);
  const nav:[View,string,string,string][]=[["overview","home","Overview","Home"],["plan","move","My plan","Plan"],["nutrition","leaf","Nutrition","Food"],["progress","chart","My progress","Progress"],["team","chat","My team","Coach"],["membership","lock","Membership","Account"]];
  function go(v:View){router.push(`/member/${v}`);setNotice("");setWorkout(false);}
  function open(m:Modal){setSlot(booking);setDraftEnergy(energy);setDraftPlanFit(planFit);setDraftPaymentReference(paymentReference);setModal(m);}
  // A trainer schedule drives the week; without one the sample week applies (Mon/Wed/Fri done, Saturday next).
  const scheduledDays=schedule?schedule.flatMap((w,i)=>w?[i]:[]):[0,2,4,5];
  const doneDays=schedule?checkedDays.filter(d=>scheduledDays.includes(d)):[0,2,4,5].slice(0,finished?4:3);
  const weekly=doneDays.length;
  const target=Math.max(1,scheduledDays.length);
  const pct=Math.round((weekly/target)*100);
  const todayIndex=(new Date(`${initial.day}T00:00:00Z`).getUTCDay()+6)%7;
  const nextDay=schedule?(scheduledDays.find(i=>i>=todayIndex&&!doneDays.includes(i))??scheduledDays.find(i=>!doneDays.includes(i))??scheduledDays[0]??todayIndex):5;
  const nextWorkout=schedule?schedule[nextDay]:null;
  const seededCompletedDay=[0,2,4].includes(day);
  const displayedDone=seededCompletedDay?[0,1,2,3,4]:done;
  const displayedFinished=seededCompletedDay||finished;
  const displayedFeedback=seededCompletedDay?"About right":feedback;
  const titles:Record<View,string>={overview:`Let’s train, ${firstName}.`,plan:"Today’s work. Tomorrow’s strength.",nutrition:"Fuel the work.",progress:"Every rep counts.",team:"Real people. In your corner.",membership:"Your next chapter starts here."};
  return <div className="app rc-member">
    <a className="skip" href="#main" onClick={event=>{event.preventDefault();heading.current?.focus();}}>Skip to content</a>
    <aside className="sidebar"><button className="brand" aria-label="RepCount overview" onClick={()=>go("overview")}><Brand/></button><div className="workspace-label">YOUR EVERYDAY, STRONGER</div><nav aria-label="Client navigation">{nav.map(([key,icon,label,short])=><button key={key} title={label} className={view===key?"nav active":"nav"} onClick={()=>go(key)} aria-current={view===key?"page":undefined}><span aria-hidden="true"><Icon name={icon} size={20}/></span><span className="nav-label">{label}</span><span className="nav-short" aria-hidden="true">{short}</span></button>)}</nav><div className="sidebar-note"><span className="little-sun"><Icon name="sun" size={30}/></span><h3>Small steps.<br/>Lasting change.</h3><p>You don’t have to do it alone.</p><button onClick={()=>go("team")}>Meet your trainer <span><Icon name="diagonal" size={16}/></span></button></div><div className="sidebar-bottom"><div className="profile"><span className="avatar">{user.initials}</span><div><b>{user.name}</b><small>{user.email}</small></div></div><form action={logout}><button type="submit">Log out <span><Icon name="arrow" size={16}/></span></button></form></div></aside>
    <div className="content"><header className="topbar"><span><span className="status-dot"/> INDIA PILOT <span className="divider">/</span> YOUR 30-DAY JOURNEY</span><div><span className={`demo-badge save-${saveState}`} role="status">{saveState==="saving"?"Saving…":saveState==="error"?"Not saved — retrying on next change":"All changes saved"}</span><button className="top-avatar" onClick={()=>go("membership")} aria-label="Open membership">{user.initials}</button><form action={logout}><button type="submit" className="top-logout">Log out</button></form></div></header><main id="main"><div className="page-heading"><div><p className="eyebrow">{`WEEK OF ${fmt(dates[0],{day:"numeric",month:"long",year:"numeric"}).toUpperCase()}`}</p><h1 ref={heading} tabIndex={-1}>{titles[view]}</h1><p>{view==="overview"?"Your plan, your streak and your coach — all in one place.":"Movement, personal support and a plan that fits your life."}</p></div><span className="pilot-tag">✦ Founding cohort</span></div><div className="preview-bar"><p>Your logs and check-ins are saved to your account and shared with your trainer. Payments are verified by the team; nothing is charged here.</p></div>{notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss notification"><Icon name="close" size={18}/></button></div>}
    {view==="overview"&&<><div className="overview-grid"><section className="hero"><Photo src={photo} alt="Woman training with dumbbells in a bright home interior" priority/><div className="hero-shade"/><div className="hero-top"><span>YOUR SPACE. YOUR PACE.</span><span className="hero-pill">Week 01 / 04</span></div><div className="hero-copy"><p>Room to move.<br/><em>Space to grow.</em></p><span>A little strength, right where you are.</span><button className="button light" onClick={()=>{go("plan");setDay(nextDay);setWorkout(true);}}>Start {fmt(dates[nextDay],{weekday:"long"})}’s workout <span><Icon name="diagonal" size={16}/></span></button></div><a className="photo-credit" href="https://www.pexels.com/video/woman-exercising-at-home-8837215/" target="_blank" rel="noreferrer">Illustrative home training · Pexels</a></section><section className="card journey"><div className="section-top"><span className="eyebrow">YOUR WEEK AT A GLANCE</span><span><Icon name="diagonal" size={16}/></span></div><h2>You’re showing up.<br/>That’s what matters.</h2><div className="ring" style={{"--progress":`${pct}%`} as CSSProperties}><div><strong>{weekly}<small>/{target}</small></strong><span>workouts complete</span></div></div><div className="week-dots" aria-label={`${weekly} of ${target} planned workouts completed`}>{["M","T","W","T","F","S","S"].map((d,i)=><span key={i} className={doneDays.includes(i)?"checked":""}>{doneDays.includes(i)?"✓":d}</span>)}</div><p>{weekly>=target?"You reached this week’s workout goal.":`${target-weekly} more session${target-weekly===1?"":"s"} to reach your weekly goal.`}</p><button className="text-button" onClick={()=>go("progress")}>See your progress <span><Icon name="arrow" size={16}/></span></button></section></div><div className="member-pulse" aria-label="Your week"><div><span className="member-pulse-label">YOUR MOMENTUM</span><strong>{pct}<small>%</small></strong><span>of your weekly plan</span></div><div><span className="member-pulse-label">TIME FOR YOURSELF</span><strong>{finished ? 90 : 65}<small>min</small></strong><span>logged this week</span></div><div><span className="member-pulse-label">NEXT CONVERSATION</span><strong>{booking.split(",")[0].slice(0,3)}<small>{booking.split(", ")[1].split(" · ")[0]}</small></strong><span>your trainer check-in</span></div></div><Motivation streak={tracker.streak} goalReached={weekly>=target} onTrain={()=>{go("plan");setDay(nextDay);setWorkout(true);}}/><DailyTracker t={tracker} onProgress={()=>go("progress")}/><div className="section-heading"><h2>A little structure. A lot of support.</h2><span>YOUR NEXT STEPS</span></div><div className="three-grid"><section className="card action-card"><div className="section-top"><span className="tile-icon sage"><Icon name="move" size={22}/></span><span className="pill">{fmt(dates[nextDay],{weekday:"long",day:"numeric",month:"short"}).toUpperCase()}</span></div><p className="eyebrow">MOVE WITH INTENTION</p><h3>{nextWorkout?.title??"Full-body foundations"}</h3><p>{nextWorkout?`Planned by ${coach.name}${nextWorkout.meetingUrl?" · live session":""}.`:"Build your rhythm with a simple strength session."}</p><div className="meta">{nextWorkout?.durationMin??25} min <span>·</span> {nextWorkout?.time?formatTime(nextWorkout.time):"Beginner"} <span>·</span> At home</div><button className="button dark" onClick={()=>{go("plan");setDay(nextDay);setWorkout(true);}}>{weekly>=target?"Review workout":"View workout"}<span><Icon name="arrow" size={16}/></span></button></section><section className="card action-card"><div className="section-top"><span className="tile-icon peach"><Icon name="chat" size={22}/></span><span className="pill">WEEKLY SUPPORT</span></div><p className="eyebrow">YOUR TRAINER CHECK-IN</p><h3>A conversation that counts.</h3><p>Review your week and shape what comes next.</p><div className="person"><span className="avatar clay">{coach.initials}</span><div><b>{coach.name}</b><small>Your trainer</small></div></div><button className="button outline" onClick={()=>open("booking")}>{booking.split(" · ")[0]}<span><Icon name="diagonal" size={16}/></span></button>{checkinLink&&<a className="button dark rc-join" href={checkinLink} target="_blank" rel="noopener noreferrer"><Icon name="video" size={18}/> Join check-in call</a>}</section><section className="card action-card lavender"><div className="section-top"><span className="tile-icon purple"><Icon name="heart" size={22}/></span><span className="pill">A MOMENT FOR YOU</span></div><p className="eyebrow">PAUSE. REFLECT. RESET.</p><h3>How is your week going?</h3><p>Your feedback helps your coach adapt the plan to you.</p><div className="checkin-visual" aria-hidden="true">◡ <span>—</span> ◡</div><button className="button outline" onClick={()=>open("checkin")}>{checkin?"Update your check-in":"Complete weekly check-in"}<span><Icon name="arrow" size={16}/></span></button></section></div><section className="bottom-banner"><div><span className="mini-icon"><Icon name="heart" size={24}/></span><div><h3>Coached every week.</h3><p>Your programme includes a personal training plan and weekly trainer follow-ups.</p></div></div><button className="text-button" onClick={()=>go("team")}>Meet your trainer →</button></section></>}
    {view==="plan"&&schedule&&<AssignedPlan schedule={schedule} labels={dates.map(date=>fmt(date,{weekday:"short",day:"numeric"}))} day={day} setDay={setDay} doneDays={doneDays} toggleDone={d=>setCheckedDays(prev=>prev.includes(d)?prev.filter(x=>x!==d):[...prev,d])} todayIndex={todayIndex} coachName={coach.name}/>}{view==="plan"&&!schedule&&<><div className="day-strip" ref={dayStrip} role="group" aria-label="Choose a training day">{dates.map(date=>fmt(date,{weekday:"short",day:"numeric"})).map((d,i)=><button key={d} className={day===i?"selected":""} aria-pressed={day===i} onClick={()=>{setDay(i);setWorkout(false);}}>{d}<small>{[0,2,4,5].includes(i)?"Train":"Rest"}</small></button>)}</div><div className="two-grid"><section className="card plan-main"><span className="eyebrow">{[0,2,4,5].includes(day)?"SAMPLE TRAINER PLAN":"RECOVERY DAY"}</span><h2>{[0,2,4,5].includes(day)?"Full-body foundations":"Make room for recovery."}</h2><p>{[0,2,4,5].includes(day)?"25 minutes · beginner · no gym required":"No workout scheduled. Follow your trainer’s agreed recovery guidance."}</p>{[0,2,4,5].includes(day)&&<><div className="plan-note">Illustrative session for the preview. A qualified trainer must approve each client’s actual plan. Monday, Wednesday and Friday show completed examples. Saturday is the next sample session.</div>{!workout?<button className="button dark" onClick={()=>setWorkout(true)}>{displayedFinished?"Review completed session":"Open sample session"} →</button>:<><div className="exercise-list">{exercises.map(([name,detail,cue],i)=><div className={displayedDone.includes(i)?"exercise complete":"exercise"} key={name}><button className="exercise-check" disabled={displayedFinished} aria-label={`${displayedDone.includes(i)?"Unmark":"Complete"} ${name}`} aria-pressed={displayedDone.includes(i)} onClick={()=>setDone(previous=>previous.includes(i)?previous.filter(n=>n!==i):[...previous,i])}>{displayedDone.includes(i)?"✓":i+1}</button><details><summary><b>{name}</b><small>{detail}</small></summary><p>{cue}</p></details></div>)}</div><label className="field">How did this session feel?<select disabled={displayedFinished} value={displayedFeedback} onChange={e=>setFeedback(e.target.value)}><option value="">Choose feedback</option><option>Too easy</option><option>About right</option><option>Too difficult</option></select></label><button className="button dark" disabled={displayedDone.length!==5||!displayedFeedback||displayedFinished} onClick={()=>{setFinished(true);setNotice("Workout complete — 4 of 4 this week. Your trainer can see it.");}}>{displayedFinished?"Session complete ✓":`Complete session · ${displayedDone.length}/5`}</button></>}</>}</section><aside className="card member-plan-support"><div className="member-video"><video controls muted playsInline preload="metadata" poster={photo} aria-label="Illustrative home exercise video"><source src="https://videos.pexels.com/video-files/8837215/8837215-hd_1366_720_25fps.mp4" type="video/mp4"/>Your browser does not support this video. <a href="https://videos.pexels.com/video-files/8837215/8837215-hd_1366_720_25fps.mp4">Open the home training preview</a>.</video><span>AT HOME · MOVEMENT PREVIEW</span></div><span className="tile-icon sage"><Icon name="chat" size={22}/></span><h3>A plan you can talk about.</h3><p>A small space can be a good starting point. This video shows the setting; your own session follows your trainer-approved plan.</p><button className="button outline" onClick={()=>open("message")}>Draft a coach message →</button><a className="member-media-credit" href="https://www.pexels.com/video/woman-exercising-at-home-8837215/" target="_blank" rel="noreferrer">Illustrative footage · Pexels</a></aside></div><PlanWeek finished={finished}/></>}
    {view==="nutrition"&&<Nutrition initial={nutrition} onChange={setNutrition}/>}
    {view==="progress"&&<ProgressDashboard t={tracker} finished={finished} checkinNode={<section className="card"><span className="tile-icon purple"><Icon name="heart" size={22}/></span><h2>Beyond the numbers.</h2><p>Share how your routine fits into your life. Your coach can help adjust the next week.</p>{checkin&&<div className="plan-note">Latest check-in: energy felt {energy.toLowerCase()}.<br/>Your routine: {planFit.toLowerCase()}.</div>}<button className="button dark" onClick={()=>open("checkin")}>{checkin?"Update check-in":"Add your check-in"} →</button></section>}/>}
    {view==="team"&&<><section className="member-care-intro"><div><span className="eyebrow">YOUR COACH</span><h2>Coached, not crowded.<br/><em>Someone in your corner.</em></h2><p>Your trainer builds your plan around your goals, your time and the equipment you have, then checks in every week to adjust it.</p><span className="small-note">Book your weekly follow-up or send a question any time.</span></div><figure><Photo src="https://images.pexels.com/photos/6455927/pexels-photo-6455927.jpeg?auto=compress&cs=tinysrgb&w=1000" alt="Trainer encouraging a client between gym exercises"/><figcaption>Illustrative coaching · <a href="https://www.pexels.com/photo/6455927/" target="_blank" rel="noreferrer">Pexels</a></figcaption></figure></section><div className="two-grid equal"><section className="card team-card"><span className="large-avatar">{coach.initials}</span><span className="eyebrow">YOUR TRAINER</span><h2>{coach.name}</h2><p>Your point of contact for your plan, weekly follow-ups and progress reviews.</p><span className="small-note">Next follow-up: {booking}</span><button className="button outline" onClick={()=>open("booking")}>Change follow-up time →</button>{checkinLink&&<a className="button dark rc-join" href={checkinLink} target="_blank" rel="noopener noreferrer"><Icon name="video" size={18}/> Join check-in call</a>}</section><section className="card team-card"><span className="large-avatar"><Icon name="chat" size={26}/></span><span className="eyebrow">QUESTIONS</span><h2>Ask your coach</h2><p>Unsure about an exercise, your schedule or what to expect at your next check-in? Send it to your trainer.</p><button className="button outline" onClick={()=>open("message")}>Write a question →</button></section></div><CoachPanel/></>}
    {view==="membership"&&<><div className="two-grid"><section className="card price-card"><span className="eyebrow">FOUNDING COHORT · INDIA · ADULTS 18+</span><h2>Your 30-day programme.</h2><p className="price">{Number(price.amount).toLocaleString("en-AE")} <span>{price.currency} / 30 days</span></p><ul className="benefits"><li>Personalised trainer-led workout plan</li><li>Weekly trainer follow-ups</li><li>Your own progress and programme space</li></ul><span className="pill">{membership?"YOUR MEMBERSHIP":"MEMBERSHIP"}</span><p>{membership?`${membership.start} – ${membership.end}`:"Dates confirmed when the team activates your programme"}</p><button className="button dark" onClick={()=>open("payment")}>{payment?"Update payment reference":"Submit payment reference"} →</button>{payment&&<p className="small-note">Reference submitted · awaiting team verification</p>}</section><section className="card"><span className="tile-icon peach"><Icon name="lock" size={22}/></span><h2>Simple, personal payments.</h2><p>You pay separately, and the team verifies payment before activating your programme.</p><ol className="steps"><li>Receive payment instructions from the team.</li><li>Pay using the agreed external method.</li><li>Share your transaction reference securely.</li><li>The team checks receipt and confirms access.</li></ol><div className="plan-note">Prices are in AED. The team confirms the payment method; nothing is charged or uploaded through this app.</div></section></div><JourneyTimeline weekly={weekly}/><div className="section-heading"><h2>Your first 30 days, thoughtfully planned.</h2></div><div className="three-grid">{[["01","Start with your trainer","A first call about your goals, your routine and the equipment you have."],["02","Find your rhythm","Your trainer shapes a manageable plan around your goals, time and equipment."],["03","Keep moving forward","Weekly follow-ups create space to reflect, adjust and recognise your progress."]].map(([n,t,d])=><section className="card" key={n}><span className="step-number">{n}</span><h3>{t}</h3><p>{d}</p></section>)}</div><section className="card faq"><h2>A few things you might be wondering.</h2>{[["Do I need to download an app?","No. This experience is designed for your phone or computer browser."],["How do I pay?","Payment is manual. The team will confirm the external payment method and verify receipt. No online checkout is included in this preview."],["Is personalised nutrition included?","Nutrition support and professional responsibility are still being defined. A nutritionist is not a confirmed part of this pilot."],["Can I enrol today?","Enrolment is by invitation. Real enrolment, confirmed team availability and secure client accounts are not enabled yet."]].map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section></>}
    <footer><span><Brand variant="phone"/> <span className="member-footer-note">Make room for you.</span></span><span>Founding cohort · India pilot</span></footer></main></div>
    <dialog ref={dialog} aria-labelledby="dialog-title" onCancel={()=>setModal(null)}>{modal&&<div className="dialog-inner"><button className="close" aria-label="Close dialog" onClick={()=>setModal(null)}><Icon name="close" size={20}/></button><p className="eyebrow">YOUR REPCOUNT SPACE</p><h2 id="dialog-title">{modal==="booking"?"Make time for your check-in.":modal==="checkin"?"Your week, in your words.":modal==="join"?"Let’s find your starting point.":modal==="payment"?"Manual payment, made clear.":"A question for your team."}</h2><form onSubmit={e=>{e.preventDefault();if(modal==="checkin"){setCheckin(true);setEnergy(draftEnergy);setPlanFit(draftPlanFit);}if(modal==="payment"){setPayment(true);setPaymentReference(draftPaymentReference);}if(modal==="booking")setBooking(slot);setNotice(modal==="booking"?`Check-in time saved: ${slot}. Your trainer will confirm it.`:modal==="checkin"?"Check-in saved and shared with your trainer.":modal==="join"?"Joining flow explored. Real enrolment is not yet open; no application was submitted.":modal==="payment"?"Reference saved. The team will verify your payment before confirming.":"Sample question drafted. Nothing was sent to the team.");setModal(null);}}>
    {modal==="booking"&&<><p>Times are in India Standard Time. Your trainer will confirm the appointment.</p><label className="field">Choose a time<select value={slot} onChange={e=>setSlot(e.target.value)}>{slots.map(o=><option key={o}>{o}</option>)}</select></label></>}
    {modal==="checkin"&&<><p>Your trainer sees these answers and uses them to adjust next week’s plan.</p><label className="field">How has your energy felt?<select value={draftEnergy} onChange={e=>setDraftEnergy(e.target.value)}><option>Low</option><option>Steady</option><option>High</option></select></label><label className="field">How did the plan fit your week?<select value={draftPlanFit} onChange={e=>setDraftPlanFit(e.target.value)}><option>Manageable</option><option>I need shorter sessions</option><option>I would like more guidance</option></select></label></>}
    {modal==="join"&&<><p>Explore onboarding without entering personal or medical information.</p><label className="field">Your main goal<select><option>Build a consistent routine</option><option>Improve strength</option><option>Feel more confident exercising</option></select></label><label className="field">Where would you train?<select><option>At home</option><option>At a gym</option><option>A mix of both</option></select></label><label className="checkbox"><input type="checkbox" required/> I understand this is an adults-only pilot and a demonstration, not live enrolment.</label></>}
    {modal==="payment"&&<><p>The team checks receipt independently before activating access. Enter the reference only — never bank or card details.</p><label className="field">Transaction reference<input required value={draftPaymentReference} onChange={e=>setDraftPaymentReference(e.target.value)} maxLength={40} autoComplete="off"/></label><span className="pill">AWAITING STAFF VERIFICATION</span></>}
    {modal==="message"&&<><p>Choose a sample question. Real messaging will be connected after the pilot workflow is agreed.</p><label className="field">What would you like help with?<select><option>Can we adjust my workout schedule?</option><option>What should I expect during onboarding?</option><option>Can you explain my next check-in?</option></select></label></>}
    <button className="button dark" type="submit">{modal==="booking"?"Save time":modal==="checkin"?"Save check-in":modal==="join"?"Preview next step":modal==="payment"?"Save reference":"Save sample draft"} →</button></form></div>}</dialog>
  </div>;
}

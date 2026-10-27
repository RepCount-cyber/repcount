"use client";
import Photo from "./Photo";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import Brand from "./Brand";
import {Icon} from "./Media";
import Nutrition from "./Nutrition";
import { logout } from "./actions/auth";
import { askCoach, saveProgress } from "./actions/data";
import type {DayLog} from "@/lib/store";
import Motivation from "./Motivation";
import {useTracker,DailyTracker,ProgressDashboard,JourneyTimeline} from "./Tracker";
import {memberViews,type MemberView} from "@/lib/memberViews";
import type {MemberState} from "@/lib/memberState";
import {formatTime, type WeekPlan} from "@/lib/schedule";
import AssignedPlan from "./AssignedPlan";
import "./member-polish.css";
import "./accessibility-polish.css";

type View = MemberView;
type Modal = "booking" | "checkin" | "payment" | "message" | null;
export type MemberUser={name:string;initials:string;email:string};
/** What the member told us at registration, plus where their programme stands. */
export type MemberDetails={phone:string|null;goal:string|null;place:string|null;days:string|null;stage:string|null;paid:boolean};
const dayMs=86400000;
/** weekStart is the Monday (YYYY-MM-DD, India time) computed on the server, so both renders agree. */
function weekDates(weekStart:string){
  const monday=Date.parse(`${weekStart}T00:00:00Z`);
  return Array.from({length:7},(_,i)=>new Date(monday+i*dayMs));
}
const fmt=(d:Date,o:Intl.DateTimeFormatOptions)=>d.toLocaleDateString("en-GB",{timeZone:"UTC",...o});
const photo = "https://images.pexels.com/videos/8837215/pexels-photo-8837215.jpeg?auto=compress&w=1200";
export default function MemberApp({user,initial,price,schedule,coach,checkinLink,membership,details,history,since}:{user:MemberUser;initial:MemberState;price:{amount:string;currency:string};schedule:WeekPlan|null;coach:{name:string;initials:string};checkinLink:string|null;membership:{start:string;end:string;iso:string}|null;details:MemberDetails;history:DayLog[];since:string}) {
  const weekStart=initial.weekStart;
  const router=useRouter();
  const segment=usePathname().split("/")[2] as View;
  const view:View=memberViews.includes(segment)?segment:"overview";
  const dates=weekDates(weekStart);
  const slots=[[4,"6:00 PM"],[5,"10:00 AM"],[5,"5:00 PM"]].map(([d,t])=>`${fmt(dates[d as number],{weekday:"long",day:"numeric",month:"short"}).replace(" ",", ")} · ${t} IST`);
  const firstName=user.name.split(" ")[0];
  const [day,setDay]=useState(()=>(new Date(`${initial.day}T00:00:00Z`).getUTCDay()+6)%7);
  const [done]=useState<number[]>(initial.workout.done);
  const [finished]=useState(initial.workout.finished);
  const [checkedDays,setCheckedDays]=useState<number[]>(initial.workout.completedDays);
  const [feedback]=useState(initial.workout.feedback);
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
  const tracker=useTracker(initial.tracker,initial.day,history,since);
  const [question,setQuestion]=useState("");
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
  const nav:[View,string,string,string][]=[["overview","home","Overview","Home"],["plan","move","My plan","Plan"],["nutrition","leaf","Nutrition","Food"],["progress","chart","My progress","Progress"],["profile","lock","Profile","Profile"]];
  function go(v:View){router.push(`/member/${v}`);setNotice("");}
  function open(m:Modal){setSlot(booking);setDraftEnergy(energy);setDraftPlanFit(planFit);setDraftPaymentReference(paymentReference);setModal(m);}
  // The trainer's schedule drives the week; until there is one, nothing is planned.
  const scheduledDays=schedule?schedule.flatMap((w,i)=>w?[i]:[]):[];
  const doneDays=checkedDays.filter(d=>scheduledDays.includes(d));
  const weekly=doneDays.length;
  const target=scheduledDays.length;
  const pct=target?Math.round((weekly/target)*100):0;
  const minutesDone=doneDays.reduce((sum,d)=>sum+(schedule?.[d]?.durationMin??0),0);
  const todayIndex=(new Date(`${initial.day}T00:00:00Z`).getUTCDay()+6)%7;
  const nextDay=scheduledDays.find(i=>i>=todayIndex&&!doneDays.includes(i))??scheduledDays.find(i=>!doneDays.includes(i))??scheduledDays[0]??todayIndex;
  const nextWorkout=schedule?schedule[nextDay]:null;
  const titles:Record<View,string>={overview:`Let’s train, ${firstName}.`,plan:"Today’s work. Tomorrow’s strength.",nutrition:"Fuel the work.",progress:"Every rep counts.",profile:"Your profile."};
  const latestWeight=tracker.weights.at(-1);
  return <div className="app rc-member">
    <a className="skip" href="#main" onClick={event=>{event.preventDefault();heading.current?.focus();}}>Skip to content</a>
    <aside className="sidebar"><button className="brand" aria-label="RepCount overview" onClick={()=>go("overview")}><Brand/></button><div className="workspace-label">YOUR EVERYDAY, STRONGER</div><nav aria-label="Client navigation">{nav.map(([key,icon,label,short])=><button key={key} title={label} className={view===key?"nav active":"nav"} onClick={()=>go(key)} aria-current={view===key?"page":undefined}><span aria-hidden="true"><Icon name={icon} size={20}/></span><span className="nav-label">{label}</span><span className="nav-short" aria-hidden="true">{short}</span></button>)}</nav></aside>
    <div className="content"><header className="topbar"><span><span className="status-dot"/> INDIA PILOT <span className="divider">/</span> YOUR 30-DAY JOURNEY</span><div>{/* Progress saves automatically; only say so while it's happening or when it fails. */}<span className={saveState==="saved"?"visually-hidden":`demo-badge save-${saveState}`} role="status">{saveState==="saving"?"Saving…":saveState==="error"?"Not saved — retrying on next change":""}</span><button className="top-avatar" onClick={()=>go("profile")} aria-label="Open your profile">{user.initials}</button><form action={logout}><button type="submit" className="top-logout">Log out</button></form></div></header><main id="main"><div className="page-heading"><div><p className="eyebrow">{`WEEK OF ${fmt(dates[0],{day:"numeric",month:"long",year:"numeric"}).toUpperCase()}`}</p><h1 ref={heading} tabIndex={-1}>{titles[view]}</h1><p>{view==="overview"?"Your plan, your streak and your coach — all in one place.":view==="profile"?"Your details, your plan and your trainer.":"Movement, personal support and a plan that fits your life."}</p></div><span className="pilot-tag">✦ Founding cohort</span></div><div className="preview-bar"><p>Your logs and check-ins are saved to your account and shared with your trainer. Payments are verified by the team; nothing is charged here.</p></div>{notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss notification"><Icon name="close" size={18}/></button></div>}
    {view==="overview"&&<><div className="overview-grid"><section className="hero"><Photo src={photo} alt="Woman training with dumbbells in a bright home interior" priority/><div className="hero-shade"/><div className="hero-top"><span>YOUR SPACE. YOUR PACE.</span><span className="hero-pill">Week of {fmt(dates[0],{day:"numeric",month:"short"})}</span></div><div className="hero-copy"><p>Room to move.<br/><em>Space to grow.</em></p><span>A little strength, right where you are.</span><button className="button light" onClick={()=>{go("plan");setDay(nextDay);}}>Start {fmt(dates[nextDay],{weekday:"long"})}’s workout <span><Icon name="diagonal" size={16}/></span></button></div><a className="photo-credit" href="https://www.pexels.com/video/woman-exercising-at-home-8837215/" target="_blank" rel="noreferrer">Photo · Pexels</a></section><section className="card journey"><div className="section-top"><span className="eyebrow">YOUR WEEK AT A GLANCE</span><span><Icon name="diagonal" size={16}/></span></div><h2>You’re showing up.<br/>That’s what matters.</h2><div className="ring" style={{"--progress":`${pct}%`} as CSSProperties}><div><strong>{weekly}<small>/{target}</small></strong><span>workouts complete</span></div></div><div className="week-dots" aria-label={`${weekly} of ${target} planned workouts completed`}>{["M","T","W","T","F","S","S"].map((d,i)=><span key={i} className={doneDays.includes(i)?"checked":""}>{doneDays.includes(i)?"✓":d}</span>)}</div><p>{target===0?"Your trainer is preparing this week’s plan.":weekly>=target?"You reached this week’s workout goal.":`${target-weekly} more session${target-weekly===1?"":"s"} to reach your weekly goal.`}</p><button className="text-button" onClick={()=>go("progress")}>See your progress <span><Icon name="arrow" size={16}/></span></button></section></div><div className="member-pulse" aria-label="Your week"><div><span className="member-pulse-label">YOUR MOMENTUM</span><strong>{pct}<small>%</small></strong><span>of your weekly plan</span></div><div><span className="member-pulse-label">TIME FOR YOURSELF</span><strong>{minutesDone}<small>min</small></strong><span>trained this week</span></div><div><span className="member-pulse-label">NEXT CONVERSATION</span><strong>{booking.split(",")[0].slice(0,3)}<small>{booking.split(", ")[1].split(" · ")[0]}</small></strong><span>your trainer check-in</span></div></div><Motivation streak={tracker.streak} goalReached={target>0&&weekly>=target} onTrain={()=>{go("plan");setDay(nextDay);}}/><DailyTracker t={tracker} onProgress={()=>go("progress")}/><div className="section-heading"><h2>A little structure. A lot of support.</h2><span>YOUR NEXT STEPS</span></div><div className="three-grid"><section className="card action-card"><div className="section-top"><span className="tile-icon sage"><Icon name="move" size={22}/></span><span className="pill">{fmt(dates[nextDay],{weekday:"long",day:"numeric",month:"short"}).toUpperCase()}</span></div><p className="eyebrow">MOVE WITH INTENTION</p><h3>{nextWorkout?.title??"Your plan is on its way"}</h3><p>{nextWorkout?`Planned by ${coach.name}${nextWorkout.meetingUrl?" · live session":""}.`:`${coach.name} is preparing your workouts.`}</p>{nextWorkout&&<div className="meta">{nextWorkout.durationMin??"—"} min <span>·</span> {nextWorkout.time?formatTime(nextWorkout.time):"Any time"}</div>}<button className="button dark" onClick={()=>{go("plan");setDay(nextDay);}}>{!nextWorkout?"See your plan":weekly>=target?"Review workout":"View workout"}<span><Icon name="arrow" size={16}/></span></button></section><section className="card action-card"><div className="section-top"><span className="tile-icon peach"><Icon name="chat" size={22}/></span><span className="pill">WEEKLY SUPPORT</span></div><p className="eyebrow">YOUR TRAINER CHECK-IN</p><h3>A conversation that counts.</h3><p>Review your week and shape what comes next.</p><div className="person"><span className="avatar clay">{coach.initials}</span><div><b>{coach.name}</b><small>Your trainer</small></div></div><button className="button outline" onClick={()=>open("booking")}>{booking.split(" · ")[0]}<span><Icon name="diagonal" size={16}/></span></button>{checkinLink&&<a className="button dark rc-join" href={checkinLink} target="_blank" rel="noopener noreferrer"><Icon name="video" size={18}/> Join check-in call</a>}</section><section className="card action-card lavender"><div className="section-top"><span className="tile-icon purple"><Icon name="heart" size={22}/></span><span className="pill">A MOMENT FOR YOU</span></div><p className="eyebrow">PAUSE. REFLECT. RESET.</p><h3>How is your week going?</h3><p>Your feedback helps your coach adapt the plan to you.</p><div className="checkin-visual" aria-hidden="true">◡ <span>—</span> ◡</div><button className="button outline" onClick={()=>open("checkin")}>{checkin?"Update your check-in":"Complete weekly check-in"}<span><Icon name="arrow" size={16}/></span></button></section></div><section className="bottom-banner"><div><span className="mini-icon"><Icon name="heart" size={24}/></span><div><h3>Coached every week.</h3><p>Your programme includes a personal training plan and weekly trainer follow-ups.</p></div></div><button className="text-button" onClick={()=>go("profile")}>Meet your trainer →</button></section></>}
    {view==="plan"&&schedule&&<AssignedPlan schedule={schedule} labels={dates.map(date=>fmt(date,{weekday:"short",day:"numeric"}))} day={day} setDay={setDay} doneDays={doneDays} toggleDone={d=>setCheckedDays(prev=>prev.includes(d)?prev.filter(x=>x!==d):[...prev,d])} todayIndex={todayIndex} coachName={coach.name}/>}{view==="plan"&&!schedule&&<section className="card plan-main"><span className="eyebrow">THIS WEEK</span><h2>Your plan is on its way.</h2><p>{coach.name} builds your workouts around your goal, your space and your week. They’ll appear here, day by day, as soon as they’re scheduled.</p><div className="person"><span className="avatar clay">{coach.initials}</span><div><b>{coach.name}</b><small>Your trainer</small></div></div><button className="button outline" onClick={()=>open("message")}>Ask a question →</button></section>}
    {view==="nutrition"&&<Nutrition initial={nutrition} onChange={setNutrition}/>}
    {view==="progress"&&<ProgressDashboard t={tracker} week={{done:weekly,planned:target,minutes:minutesDone}} checkinNode={<section className="card"><span className="tile-icon purple"><Icon name="heart" size={22}/></span><h2>Beyond the numbers.</h2><p>Share how your routine fits into your life. Your coach can help adjust the next week.</p>{checkin&&<div className="plan-note">Latest check-in: energy felt {energy.toLowerCase()}.<br/>Your routine: {planFit.toLowerCase()}.</div>}<button className="button dark" onClick={()=>open("checkin")}>{checkin?"Update check-in":"Add your check-in"} →</button></section>}/>}
    {view==="profile"&&<><section className="card profile-card"><span className="large-avatar">{user.initials}</span><div><span className="eyebrow">MY DETAILS</span><h2>{user.name}</h2><dl className="profile-details"><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Phone</dt><dd>{details.phone??"—"}</dd></div><div><dt>Main goal</dt><dd>{details.goal??"—"}</dd></div><div><dt>Where you train</dt><dd>{details.place??"—"}</dd></div><div><dt>Training rhythm</dt><dd>{details.days??"—"}</dd></div><div><dt>Latest weigh-in</dt><dd>{latestWeight?`${latestWeight.value} kg`:"Not logged yet"}</dd></div></dl><p className="small-note">To change your details, ask your trainer.</p></div></section><div className="two-grid equal"><section className="card price-card"><span className="eyebrow">MY PLAN</span><h2>30-day programme</h2><p className="price">{Number(price.amount).toLocaleString("en-AE")} <span>{price.currency} / 30 days</span></p><dl className="profile-details"><div><dt>Status</dt><dd>{details.stage??"Payment review"}</dd></div><div><dt>Dates</dt><dd>{membership?`${membership.start} – ${membership.end}`:"Confirmed when the team activates your programme"}</dd></div><div><dt>Payment</dt><dd>{details.paid?"Verified":payment?`Reference ${paymentReference} · awaiting verification`:"Not submitted yet"}</dd></div></dl>{!details.paid&&<><button className="button dark" onClick={()=>open("payment")}>{payment?"Update payment reference":"Submit payment reference"} →</button><p className="small-note">Pay using the method the team shares with you, then submit your transaction reference. Nothing is charged here.</p></>}</section><section className="card team-card"><span className="large-avatar">{coach.initials}</span><span className="eyebrow">MY TRAINER</span><h2>{coach.name}</h2><p>Your point of contact for your plan, weekly follow-ups and progress reviews.</p><span className="small-note">Next follow-up: {booking}</span><button className="button outline" onClick={()=>open("booking")}>Change follow-up time →</button><button className="button outline" onClick={()=>open("message")}>Ask a question →</button>{checkinLink&&<a className="button dark rc-join" href={checkinLink} target="_blank" rel="noopener noreferrer"><Icon name="video" size={18}/> Join check-in call</a>}</section></div><JourneyTimeline start={membership?{iso:membership.iso,label:membership.start,end:membership.end}:null} today={initial.day} weekly={weekly} target={target}/></>}
    <footer><span><Brand variant="phone"/> <span className="member-footer-note">Make room for you.</span></span><span>Founding cohort · India pilot</span></footer></main></div>
    <dialog ref={dialog} aria-labelledby="dialog-title" onCancel={()=>setModal(null)}>{modal&&<div className="dialog-inner"><button className="close" aria-label="Close dialog" onClick={()=>setModal(null)}><Icon name="close" size={20}/></button><p className="eyebrow">YOUR REPCOUNT SPACE</p><h2 id="dialog-title">{modal==="booking"?"Make time for your check-in.":modal==="checkin"?"Your week, in your words.":modal==="payment"?"Manual payment, made clear.":"A question for your team."}</h2><form onSubmit={e=>{e.preventDefault();if(modal==="message"){const text=question;askCoach(text).then(result=>{setNotice(result.ok??result.error??"");if(result.ok){setQuestion("");setModal(null);}},()=>setNotice("Your question couldn’t be sent. Please try again."));return;}if(modal==="checkin"){setCheckin(true);setEnergy(draftEnergy);setPlanFit(draftPlanFit);}if(modal==="payment"){setPayment(true);setPaymentReference(draftPaymentReference);}if(modal==="booking")setBooking(slot);setNotice(modal==="booking"?`Check-in time saved: ${slot}. Your trainer will confirm it.`:modal==="checkin"?"Check-in saved and shared with your trainer.":"Reference saved. The team will verify your payment before confirming.");setModal(null);}}>
    {modal==="booking"&&<><p>Times are in India Standard Time. Your trainer will confirm the appointment.</p><label className="field">Choose a time<select value={slot} onChange={e=>setSlot(e.target.value)}>{slots.map(o=><option key={o}>{o}</option>)}</select></label></>}
    {modal==="checkin"&&<><p>Your trainer sees these answers and uses them to adjust next week’s plan.</p><label className="field">How has your energy felt?<select value={draftEnergy} onChange={e=>setDraftEnergy(e.target.value)}><option>Low</option><option>Steady</option><option>High</option></select></label><label className="field">How did the plan fit your week?<select value={draftPlanFit} onChange={e=>setDraftPlanFit(e.target.value)}><option>Manageable</option><option>I need shorter sessions</option><option>I would like more guidance</option></select></label></>}
    {modal==="payment"&&<><p>The team checks receipt independently before activating access. Enter the reference only — never bank or card details.</p><label className="field">Transaction reference<input required value={draftPaymentReference} onChange={e=>setDraftPaymentReference(e.target.value)} maxLength={40} autoComplete="off"/></label><span className="pill">AWAITING STAFF VERIFICATION</span></>}
    {modal==="message"&&<><p>Ask about your plan, an exercise or your next check-in. {coach.name} sees it on your client page.</p><label className="field">Your question<textarea required minLength={3} maxLength={1000} rows={5} value={question} onChange={e=>setQuestion(e.target.value)}/></label></>}
    <button className="button dark" type="submit">{modal==="booking"?"Save time":modal==="checkin"?"Save check-in":modal==="payment"?"Save reference":"Send question"} →</button></form></div>}</dialog>
  </div>;
}

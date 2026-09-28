"use client";

import {useId, useState} from 'react';
import Brand from './Brand';
import Film, {Icon, media} from './Media';

type Section='move'|'nourish'|'progress'|'connect';
const features:[Section,string,string,string][]=[
  ['move','move','A plan that fits your day.','Follow a session, see the movement and keep your next step clear.'],
  ['nourish','leaf','Make space for good food.','Explore a daily meal schedule and preferences in our nutrition preview.'],
  ['progress','chart','Notice your small wins.','See completed sessions, weekly momentum and the habits you’re building.'],
  ['connect','chat','Keep a human connection.','Bring your questions to a weekly conversation. Reflect, adjust and keep going.'],
];
const food='https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=650&q=85';

export function MiniPhone({onExplore}:{onExplore:()=>void}) {
  return <div className="rc-mini-phone" role="group" aria-label="Sample RepCount daily plan">
    <div className="rc-phone-island"/><div className="rc-mini-status"><span>9:41</span><span aria-hidden="true">▂▄▆ ▰</span></div>
    <Brand variant="phone"/>
    <p className="rc-mini-hello">A little time.<br/><strong>Just for you.</strong></p>
    <div className="rc-mini-photo"><img src={media.home.poster} alt="Woman exercising in her living room"/><span><Icon name="play" size={15}/> YOUR HOME SESSION</span></div>
    <div className="rc-mini-session"><div><b>Everyday strength</b><span>20 min · At home</span></div><Icon name="diagonal" size={18}/></div>
    <div className="rc-mini-week"><span>YOUR SAMPLE WEEK</span><b>3 of 4 sessions</b><div>{['M','T','W','T','F','S','S'].map((d,i)=><i key={i} className={i<3?'done':''}>{i<3?<Icon name="check" size={11}/>:d}</i>)}</div></div>
    <button onClick={onExplore}>Try the experience <Icon name="arrow" size={14}/></button><div className="rc-phone-home"/>
  </div>;
}

export default function Experience({onEnter}:{onEnter:()=>void}) {
  const [section,setSection]=useState<Section>('move');
  const [sets,setSets]=useState(0);
  const [meal,setMeal]=useState('Balanced');
  const [period,setPeriod]=useState('Week');
  const [water,setWater]=useState(3);
  const [checkin,setCheckin]=useState(false);
  const [feeling,setFeeling]=useState('Steady');
  const [note,setNote]=useState(false);
  const uid=useId();
  const numbers=period==='Week'?[20,25,0,30,0,25,0]:[90,105,85,120];
  const total=numbers.reduce((sum,n)=>sum+n,0);
  const active=features.find(f=>f[0]===section)!;
  return <section className="rc-experience rc-section" id="experience" aria-labelledby="experience-heading">
    <div className="rc-section-intro"><p className="rc-eyebrow">A LITTLE STRUCTURE. A LOT OF SUPPORT.</p><h2 id="experience-heading">Your everyday,<br/><em>all together.</em></h2><p>Less wondering what’s next.<br/>More getting on with feeling like you.</p></div>
    <div className="rc-experience-layout">
      <div className="rc-feature-options" role="group" aria-label="Explore the app features">
        {features.map(([key,icon,title,description],i)=><button key={key} className={section===key?'selected':''} onClick={()=>setSection(key)} aria-pressed={section===key} aria-controls={`${uid}-screen`}><span className="rc-feature-icon"><Icon name={icon}/></span><span><small>0{i+1} / {key==='move'?'YOUR TRAINING':key==='nourish'?'NUTRITION PREVIEW':key==='progress'?'YOUR MOMENTUM':'YOUR SUPPORT'}</small><strong>{title}</strong><span>{description}</span></span><Icon name="diagonal" size={19}/></button>)}
      </div>
      <div className={`rc-device-stage rc-stage-${section}`}>
        <span className="rc-stage-orbit rc-orbit-one"/><span className="rc-stage-orbit rc-orbit-two"/>
        <span className="rc-stage-label">DESIGNED AROUND REAL LIFE</span>
        <div className="rc-phone" id={`${uid}-screen`} role="region" aria-label={active[2]}>
          <div className="rc-phone-island"/><div className="rc-phone-status"><span>9:41</span><span aria-hidden="true">▂▄▆ ▰</span></div>
          <div className="rc-phone-brand"><Brand variant="phone"/><span>DEMO</span></div>
          <div className="rc-phone-body" key={section}>
            {section==='move'&&<>
              <div className="rc-screen-title"><small>YOUR TIME TO MOVE</small><h3>Everyday strength.</h3><p>Sample session · At home</p></div>
              <Film clip="home" className="rc-phone-film"/>
              <div className="rc-session-description"><b>Follow the movement</b><span>Illustrative exercise video</span></div>
              <div className="rc-phone-metrics"><div><small>SETS DONE</small><b>{sets}<span>/3</span></b></div><div><small>REPS / SET</small><b>8<span>target</span></b></div><div><small>REST</small><b>60<span>sec</span></b></div></div>
              <button className="rc-phone-action" onClick={()=>setSets(sets===3?0:sets+1)}>{sets===3?'Reset sample session':'Complete a sample set'}<Icon name={sets===3?'check':'plus'} size={16}/></button>
              <p className="rc-phone-footnote" role="status">{sets===3?'All three sample sets complete. Nicely done.':`${sets} of 3 sample sets complete. Tap when you’re ready.`}</p>
            </>}
            {section==='nourish'&&<>
              <div className="rc-screen-title"><small>YOUR DAILY NOURISHMENT</small><h3>Good food. Your way.</h3><p>Meal planning concept</p></div>
              <div className="rc-segment" role="group" aria-label="Meal preference">{['Balanced','Vegetarian'].map(value=><button key={value} aria-pressed={meal===value} className={meal===value?'active':''} onClick={()=>setMeal(value)}>{value}</button>)}</div>
              <div className="rc-meal-photo"><img src={food} loading="lazy" alt="Colourful bowl of fresh vegetables"/><span><Icon name="leaf" size={14}/> LUNCH IN COLOUR</span></div>
              <div className="rc-meals">{[['08:00','A gentle start','Oats, fruit & yoghurt'],['13:00','A colourful lunch',meal==='Vegetarian'?'Vegetables, lentils & rice':'Vegetables, rice & protein'],['19:30','Your evening plate','A meal that fits your routine']].map(([time,title,detail])=><div key={time}><span>{time}</span><div><b>{title}</b><small>{detail}</small></div><Icon name="check" size={13}/></div>)}</div>
              <p className="rc-phone-footnote">Illustrative meals. Nutrition service and professional review are being finalised.</p>
            </>}
            {section==='progress'&&<>
              <div className="rc-screen-title"><small>LOOK AT YOU GO</small><h3>Every little win.</h3><p>Your sample activity</p></div>
              <div className="rc-segment" role="group" aria-label="Statistics period">{['Week','Month'].map(p=><button key={p} aria-pressed={period===p} className={period===p?'active':''} onClick={()=>setPeriod(p)}>{p}</button>)}</div>
              <div className="rc-stat-total"><strong>{total}<small>min</small></strong><span>Movement this {period.toLowerCase()}</span></div>
              <div className="rc-training-chart" key={period} role="img" aria-label={`${period} sample minutes: ${numbers.join(', ')}`}>{numbers.map((n,i)=><div key={i}><span>{n||'—'}</span><i style={{height:`${n/Math.max(...numbers)*95+3}px`,animationDelay:`${i*40}ms`}}/><small>{period==='Week'?['M','T','W','T','F','S','S'][i]:`W${i+1}`}</small></div>)}</div>
              <div className="rc-stat-pair"><div><small>SESSIONS</small><strong>{period==='Week'?'4':'16'}</strong><span>Completed</span></div><div><small>CONSISTENCY</small><strong>80<em>%</em></strong><span>{period==='Week'?'4 of 5 planned':'16 of 20 planned'}</span></div></div>
              <div className="rc-water"><span><Icon name="sun" size={17}/><b>Water logged</b><small>{water} glasses</small></span><button aria-label="Add a glass of water to sample log" onClick={()=>setWater(water+1)}><Icon name="plus" size={16}/></button></div>
              <p className="rc-phone-footnote">Illustrative statistics, not measured health data.</p>
            </>}
            {section==='connect'&&<>
              <div className="rc-screen-title"><small>A PERSON IN YOUR CORNER</small><h3>Let’s check in.</h3><p>Weekly trainer support</p></div>
              <Film clip="coach" className="rc-phone-film rc-coach-film" caption="COACHING, FROM HOME"/>
              <div className="rc-coach-note"><span>RC</span><div><small>SAMPLE COACH CONVERSATION</small><p>How did this week feel? Let’s make next week work for you.</p></div></div>
              {!checkin?<button className="rc-phone-action" onClick={()=>setCheckin(true)}>Preview a check-in<Icon name="arrow" size={16}/></button>:<div className="rc-checkin-inline"><span>How is your energy?</span><div>{['Low','Steady','Good'].map(value=><button key={value} className={feeling===value?'active':''} aria-pressed={feeling===value} onClick={()=>{setFeeling(value);setNote(false);}}>{value}</button>)}</div><button className="rc-phone-action" onClick={()=>setNote(true)}>Save sample check-in <Icon name="check" size={16}/></button></div>}
              <p className="rc-phone-footnote" role="status">{note?`${feeling} — saved for this preview only. Nothing was sent.`:'Illustrative footage and conversation. No live call or message.'}</p>
            </>}
          </div>
          <nav className="rc-phone-nav" aria-label="Phone preview navigation">{features.map(([key,icon])=><button key={key} className={section===key?'active':''} aria-pressed={section===key} onClick={()=>setSection(key)}><Icon name={icon} size={18}/><span>{key==='move'?'Move':key==='nourish'?'Nourish':key==='progress'?'Progress':'Connect'}</span></button>)}</nav><div className="rc-phone-home"/>
        </div>
        <div className="rc-stage-note"><span className="rc-pulse-dot"/> Interactive preview. Go on, try it.</div>
      </div>
    </div>
    <div className="rc-experience-bottom"><p>One place for the plan.<br/><strong>Real people behind the progress.</strong></p><button className="rc-text-link" onClick={onEnter}>Explore the full member demo <Icon name="diagonal"/></button></div>
  </section>;
}

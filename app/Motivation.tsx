"use client";

import Photo from "./Photo";
import {useState} from "react";
import {Icon} from "./Media";

/* Motivational gym imagery for the member overview. Illustrative Pexels stock; see MEDIA-CREDITS.md. */
const pexels = (id: number, w = 900) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
const wall = [
  {id: 949126, tag: "STRENGTH", line: "Strong is built one rep at a time.", alt: "Athlete gripping a loaded barbell before a deadlift"},
  {id: 1552242, tag: "CONDITIONING", line: "Your pace. Your power.", alt: "Two people training with battle ropes in a gym"},
  {id: 3076509, tag: "MOBILITY", line: "Recovery is part of the plan.", alt: "Woman stretching on a mat in a bright studio"},
  {id: 6455927, tag: "COACHING", line: "Someone in your corner, every week.", alt: "Trainer encouraging a client between gym exercises"},
];
const quotes = [
  ["The only bad workout is the one that didn’t happen.", "Gym wisdom"],
  ["Discipline is choosing what you want most over what you want now.", "Training mindset"],
  ["You don’t have to be extreme, just consistent.", "Coach’s reminder"],
  ["Small reps add up to big change.", "RepCount"],
];

export default function Motivation({streak, weekly, onTrain}: {streak: number; weekly: number; onTrain: () => void}) {
  const [quote, setQuote] = useState(0);
  const [text, source] = quotes[quote];
  const nextMilestone = streak < 7 ? 7 : streak < 14 ? 14 : 30;
  return <section className="rc-motivation" aria-labelledby="rc-motivation-title">
    <div className="rc-motivation-head">
      <div><span className="eyebrow">FUEL FOR YOUR NEXT SESSION</span><h2 id="rc-motivation-title">Show up. Lift up. <em>Level up.</em></h2></div>
      <div className="rc-streak" aria-label={`${streak}-day activity streak. Next milestone ${nextMilestone} days.`}>
        <span className="rc-streak-flame" aria-hidden="true">🔥</span>
        <div><strong>{streak}<small> day streak</small></strong><span>Next badge at {nextMilestone} days</span></div>
        <div className="rc-streak-bar" aria-hidden="true"><span style={{width: `${Math.min(100, (streak / nextMilestone) * 100)}%`}}/></div>
      </div>
    </div>
    <div className="rc-wall">
      {wall.map(({id, tag, line, alt}, i) => <figure key={id} className={i === 0 ? "rc-wall-tile rc-wall-feature" : "rc-wall-tile"}>
        <Photo src={pexels(id, i === 0 ? 1200 : 700)} alt={alt} sizes={i === 0 ? "(max-width: 700px) 100vw, 45vw" : "(max-width: 700px) 50vw, 30vw"}/>
        <figcaption><span>{tag}</span><b>{line}</b></figcaption>
        <a className="rc-wall-credit" href={`https://www.pexels.com/photo/${id}/`} target="_blank" rel="noreferrer">Pexels</a>
      </figure>)}
    </div>
    <div className="rc-quote">
      <span className="rc-quote-mark" aria-hidden="true">“</span>
      <blockquote aria-live="polite"><p>{text}</p><footer>— {source}</footer></blockquote>
      <div className="rc-quote-actions">
        <button className="button outline" onClick={() => setQuote((quote + 1) % quotes.length)}>Another boost <span><Icon name="arrow" size={16}/></span></button>
        <button className="button dark" onClick={onTrain}>{weekly >= 4 ? "Review this week’s session" : "Start today’s session"} <span><Icon name="diagonal" size={16}/></span></button>
      </div>
    </div>
  </section>;
}

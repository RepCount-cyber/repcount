"use client";

import {useActionState, useEffect, useRef, useState} from "react";
import {Icon} from "./Media";
import {AuthShell} from "./Login";
import {completeOnboarding, type OnboardingState} from "./actions/register";
import {goals, places, rhythms} from "@/lib/programme";
import "./onboarding.css";

type Answer = "goal" | "place" | "days";

const steps: {key: Answer; title: React.ReactNode; lead: string; options: readonly string[]; label: string}[] = [
  {key: "goal", title: <>What feels <em>important</em> to you?</>, lead: "Choose the goal that matters most right now.", options: goals, label: "Your goal"},
  {key: "place", title: <>Where will you <em>make room?</em></>, lead: "A good plan starts with the space you have.", options: places, label: "Your space"},
  {key: "days", title: <>Find a rhythm <em>that fits.</em></>, lead: "A preference to discuss with your trainer. You can adjust it together.", options: rhythms, label: "Your rhythm"},
];

/** Three questions after sign-up: goal, training space and rhythm. Saving them opens the dashboard. */
export default function Onboarding({firstName, goal}: {firstName: string; goal?: string}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<Answer, string>>({goal: goal ?? "", place: "", days: ""});
  const [state, action, pending] = useActionState<OnboardingState, FormData>(completeOnboarding, undefined);
  useEffect(() => { heading.current?.focus({preventScroll: true}); }, [step]);

  const current = steps[step];
  const review = !current;

  return <AuthShell>
    <form className="rc-onb" action={action}>
      {(Object.keys(answers) as Answer[]).map(k => answers[k] && <input key={k} type="hidden" name={k} value={answers[k]}/>)}
      <p className="rc-onb-eyebrow">{review ? "Your starting point" : `Your starting point · 0${step + 1} / 03`}</p>
      <div className="rc-onb-progress" aria-hidden="true"><i style={{width: `${(step + 1) * 25}%`}}/></div>
      <h1 id="auth-heading" tabIndex={-1} ref={heading}>{review ? <>Nice to meet you, <em>{firstName}.</em></> : current.title}</h1>
      {state?.error && <div className="rc-login-error" role="alert">{state.error}</div>}

      {current ? <>
        <p className="rc-login-lead">{current.lead}</p>
        <div className="rc-onb-options" role="group" aria-labelledby="auth-heading">
          {current.options.map((value, i) => {
            const selected = answers[current.key] === value;
            return <button key={value} type="button" aria-pressed={selected} className={selected ? "selected" : undefined} onClick={() => setAnswers({...answers, [current.key]: value})}>
              <span>0{i + 1}</span>{value}<i>{selected ? <Icon name="check" size={16}/> : <Icon name="plus" size={16}/>}</i>
            </button>;
          })}
        </div>
        <div className="rc-onb-buttons">
          {step > 0 ? <button type="button" className="rc-onb-back" onClick={() => setStep(step - 1)}>Back</button> : <span/>}
          <button type="button" className="rc-login-submit" disabled={!answers[current.key]} onClick={() => setStep(step + 1)}>Continue <Icon name="arrow" size={18}/></button>
        </div>
      </> : <>
        <p className="rc-login-lead">Here’s what your trainer will build your plan around.</p>
        <dl className="rc-onb-result">
          {steps.map(s => <div key={s.key}><dt>{s.label}</dt><dd>{answers[s.key]}</dd></div>)}
        </dl>
        <button type="submit" className="rc-login-submit" disabled={pending}>{pending ? "Saving…" : "Go to my dashboard"} <Icon name="arrow" size={18}/></button>
        <button type="button" className="rc-onb-back rc-onb-restart" onClick={() => setStep(0)}>Change my answers</button>
      </>}
    </form>
  </AuthShell>;
}

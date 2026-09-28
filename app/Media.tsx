"use client";

import {useCallback, useEffect, useRef, useState} from 'react';

export const media = {
  flow: {src:'https://videos.pexels.com/video-files/8837215/8837215-hd_1366_720_25fps.mp4', poster:'https://images.pexels.com/videos/8837215/pexels-photo-8837215.jpeg?auto=compress&w=1200', title:'Room to move at home', credit:'https://www.pexels.com/video/woman-exercising-at-home-8837215/'},
  home: {src:'https://videos.pexels.com/video-files/8026946/8026946-hd_1366_720_25fps.mp4', poster:'https://images.pexels.com/videos/8026946/pexels-photo-8026946.jpeg?auto=compress&w=800', title:'Strength, in your own space', credit:'https://www.pexels.com/video/woman-exercising-at-home-8026946/'},
  mat: {src:'https://assets.mixkit.co/videos/5063/5063-720.mp4', poster:'https://assets.mixkit.co/videos/5063/5063-thumb-720-0.jpg', title:'Make room for movement', credit:'https://mixkit.co/free-stock-video/'},
  coach: {src:'https://assets.mixkit.co/videos/5055/5055-720.mp4', poster:'https://assets.mixkit.co/videos/5055/5055-thumb-720-0.jpg', title:'A little guidance goes a long way', credit:'https://mixkit.co/free-stock-video/physical-education-teacher-recording-a-class-5055/'},
  cardio: {src:'https://assets.mixkit.co/videos/5050/5050-720.mp4', poster:'https://assets.mixkit.co/videos/5050/5050-thumb-720-0.jpg', title:'Your home. Your movement.', credit:'https://mixkit.co/free-stock-video/young-sportsman-jumping-rope-at-home-5050/'},
  calm: {src:'https://assets.mixkit.co/videos/32635/32635-720.mp4', poster:'https://assets.mixkit.co/videos/32635/32635-thumb-720-0.jpg', title:'A moment to reconnect', credit:'https://mixkit.co/free-stock-video/'},
};
export const consultation = 'https://images.pexels.com/photos/7176320/pexels-photo-7176320.jpeg?auto=compress&cs=tinysrgb&w=1000';
export type Clip = keyof typeof media;

export function Icon({name, size=20}:{name:string; size?:number}) {
  const paths:Record<string,React.ReactNode> = {
    arrow:<><path d="M5 12h14M13 6l6 6-6 6"/></>,
    diagonal:<><path d="M6 18 18 6M6 6h12v12"/></>,
    play:<path d="m9 5 11 7-11 7Z"/>,
    pause:<><path d="M9 5v14M15 5v14"/></>,
    check:<path d="m5 12 4 4L19 6"/>,
    home:<><path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-8h6v8"/></>,
    move:<><path d="m4 9 5-5m6 16 5-5M2 7l5-5m10 20 5-5M6 6l12 12M9 3l3 3M12 18l3 3"/></>,
    heart:<path d="M20.5 4.8a5.1 5.1 0 0 0-7.2 0L12 6.1l-1.3-1.3a5.1 5.1 0 0 0-7.2 7.2L12 20.5l8.5-8.5a5.1 5.1 0 0 0 0-7.2Z"/>,
    chart:<><path d="M4 4v16h17M8 15l4-5 4 3 5-7"/></>,
    leaf:<><path d="M19 3C7 2 2 10 8 16s14 1 11-13ZM5 21 15 9"/></>,
    chat:<><path d="M21 11a8.5 8.5 0 0 1-9 8l-7 3v-6a8 8 0 1 1 16-5Z"/><path d="M8 10h8M8 14h5"/></>,
    clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    lock:<><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    plus:<path d="M12 5v14M5 12h14"/>,
    close:<path d="m6 6 12 12M18 6 6 18"/>,
    menu:<><path d="M4 8h16M4 16h16"/></>,
    sun:<><circle cx="12" cy="12" r="4"/><path d="M12 1v2M12 21v2M1 12h2M21 12h2m-2.2-7.8-1.4 1.4M6.6 17.4l-1.4 1.4m0-13.6 1.4 1.4m10.8 10.8 1.4 1.4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name] || paths.arrow}</svg>;
}

function timestamp(seconds:number) {
  const safe=Number.isFinite(seconds)?Math.max(0,seconds):0;
  return `${Math.floor(safe/60)}:${Math.floor(safe%60).toString().padStart(2,'0')}`;
}

/** Native video with progressive loading, explicit controls and respectful motion. */
export default function Film({clip='home', className='', controls=true, priority=false, caption}:{clip?:Clip; className?:string; controls?:boolean; priority?:boolean; caption?:string}) {
  const asset=media[clip];
  const element=useRef<HTMLVideoElement>(null);
  const wrapper=useRef<HTMLDivElement>(null);
  const manualPause=useRef(false);
  const explicitPlay=useRef(false);
  const playRequest=useRef(0);
  const synchronize=useRef<()=>void>(()=>{});
  const [loaded,setLoaded]=useState(priority);
  const [playing,setPlaying]=useState(false);
  const [waiting,setWaiting]=useState(false);
  const [error,setError]=useState(false);
  const [time,setTime]=useState(0);
  const [duration,setDuration]=useState(0);
  const playSafely=useCallback(async()=>{
    const el=element.current;
    if(!el?.getAttribute('src'))return;
    const request=++playRequest.current;
    try{await el.play();}catch{
      // A scrolling or visibility pause can abort an earlier request. It must
      // not overwrite the state of a later successful playback request.
      if(request===playRequest.current){setPlaying(!el.paused);setWaiting(false);}
    }
  },[]);
  useEffect(()=>{
    const el=element.current;
    const wrap=wrapper.current;
    if(!el||!wrap)return;
    let visible=false;
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync=()=>{
      if(visible&&!document.hidden&&(!motion.matches||explicitPlay.current)&&!manualPause.current) {
        void playSafely();
      } else {++playRequest.current;el.pause();}
    };
    synchronize.current=sync;
    const near=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){setLoaded(true);near.disconnect();}},{rootMargin:'200px'});
    const view=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.25;sync();},{threshold:[0,.25,.75]});
    near.observe(wrap);view.observe(wrap);
    document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);
    return()=>{near.disconnect();view.disconnect();document.removeEventListener('visibilitychange',sync);motion.removeEventListener('change',sync);synchronize.current=()=>{};++playRequest.current;el.pause();};
  },[clip,playSafely]);
  async function toggle(){
    const el=element.current;if(!el)return;
    if(!el.paused){manualPause.current=true;explicitPlay.current=false;++playRequest.current;el.pause();return;}
    manualPause.current=false;explicitPlay.current=true;setLoaded(true);
    if(!el.getAttribute('src')){el.src=asset.src;el.load();}
    await playSafely();
  }
  function retry(){setError(false);element.current?.load();void toggle();}
  return <div className={`rc-film ${className}`} ref={wrapper} data-clip={clip}>
    <video ref={element} src={loaded?asset.src:undefined} poster={asset.poster} muted playsInline loop preload={priority?'auto':'metadata'} aria-label={`${asset.title} — illustrative stock video`}
      onLoadedMetadata={e=>{setDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0);setError(false);synchronize.current();}}
      onTimeUpdate={e=>setTime(e.currentTarget.currentTime)}
      onPlaying={()=>{setPlaying(true);setWaiting(false);}}
      onWaiting={()=>setWaiting(true)} onPause={()=>{setPlaying(false);setWaiting(false);}}
      onError={()=>{setError(true);setWaiting(false);}}/>
    <div className="rc-film-shade"/>
    {caption&&<span className="rc-film-caption">{caption}</span>}
    {error?<div className="rc-film-error" role="status"><span>This video couldn’t load.</span><button onClick={retry} aria-label={`Retry ${asset.title}`}>Try again <Icon name="arrow" size={16}/></button></div>:<>
      <button className="rc-film-toggle" onClick={toggle} aria-label={`${playing?'Pause':'Play'} ${asset.title}`}><Icon name={playing?'pause':'play'} size={18}/></button>
      {waiting&&loaded&&<span className="rc-film-loading" role="status">Loading video…</span>}
      {controls&&<div className="rc-film-controls"><span>{timestamp(time)}</span><input type="range" aria-label={`Seek ${asset.title}`} min={0} max={duration||1} step={.1} value={Math.min(time,duration||1)} disabled={!duration} onChange={e=>{if(element.current)element.current.currentTime=Number(e.target.value);}}/><span>{timestamp(duration)}</span></div>}
    </>}
  </div>;
}

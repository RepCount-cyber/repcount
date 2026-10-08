"use client";

import {useState} from 'react';
import {Icon} from './Media';
import {NutritionBalance} from './Tracker';
import './nutrition.css';

type Preference = 'Balanced' | 'Vegetarian';
const days = ['Monday', 'Tuesday', 'Wednesday'];
type Meal={time:string; name:string; detail:string; tag:string; kcal:number; protein:number; carbs:number; fat:number};
const meals:Record<Preference,Meal[]> = {
  Balanced: [
    {time:'Breakfast',name:'A slower start.',detail:'Eggs on toast, fruit and a little time for yourself.',tag:'Toast & eggs',kcal:380,protein:22,carbs:40,fat:14},
    {time:'Lunch',name:'Colour in your day.',detail:'A rice bowl with chicken, greens and crunchy vegetables.',tag:'Chicken rice bowl',kcal:520,protein:38,carbs:58,fat:14},
    {time:'Dinner',name:'Something comforting.',detail:'Lentil dal, rice and roasted seasonal vegetables.',tag:'Lentils & vegetables',kcal:540,protein:24,carbs:70,fat:16},
  ],
  Vegetarian: [
    {time:'Breakfast',name:'A softer morning.',detail:'Warm oats with fruit, yogurt and a sprinkle of seeds.',tag:'Fruit & oat bowl',kcal:360,protein:16,carbs:52,fat:10},
    {time:'Lunch',name:'Make room for colour.',detail:'Chickpeas, rice, leafy greens and a lemon dressing.',tag:'Chickpea rice bowl',kcal:500,protein:20,carbs:74,fat:12},
    {time:'Dinner',name:'A familiar favourite.',detail:'Paneer with vegetables and a warm flatbread.',tag:'Paneer & vegetables',kcal:560,protein:26,carbs:58,fat:24},
  ],
};

export default function Nutrition(){
  const [preference,setPreference]=useState<Preference>('Balanced');
  const [day,setDay]=useState(0);
  const [logged,setLogged]=useState<string[]>([]);
  const [water,setWater]=useState<Record<number,number>>({});
  const sampleMeals=meals[preference];
  const mealKey=(index:number)=>`${day}-${preference}-${index}`;
  const completed=sampleMeals.filter((_,index)=>logged.includes(mealKey(index))).length;
  const glasses=water[day]||0;
  const loggedMeals=sampleMeals.filter((_,index)=>logged.includes(mealKey(index)));
  const totals=loggedMeals.reduce((sum,meal)=>({kcal:sum.kcal+meal.kcal,protein:sum.protein+meal.protein,carbs:sum.carbs+meal.carbs,fat:sum.fat+meal.fat}),{kcal:0,protein:0,carbs:0,fat:0});
  function toggleMeal(index:number){
    const key=mealKey(index);
    setLogged(previous=>previous.includes(key)?previous.filter(item=>item!==key):[...previous,key]);
  }
  return <div className="member-nutrition">
    <section className="member-nutrition-intro">
      <div><span className="eyebrow">NUTRITION CONCEPT · SAMPLE MEALS</span><h2>Good food.<br/><em>A little less guesswork.</em></h2><p>Explore how a simple meal schedule could fit alongside your training. Choose a sample preference, try the meal log and make it your own for this visit.</p><div className="member-nutrition-scope"><Icon name="leaf" size={18}/><span>Personalised nutrition support is not a confirmed pilot inclusion. These examples are not an individual diet plan.</span></div></div>
      <figure><img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85" alt="An illustrative bowl of colourful vegetables" loading="lazy"/><figcaption>Illustrative food · <a href="https://unsplash.com/photos/IGfIGP5ONV0" target="_blank" rel="noreferrer">Anna Pelzer / Unsplash</a></figcaption></figure>
    </section>
    <section className="member-nutrition-controls" aria-label="Choose a sample meal schedule">
      <div><span className="eyebrow">YOUR SAMPLE PREFERENCE</span><div className="member-nutrition-options" role="group" aria-label="Meal preference">{(['Balanced','Vegetarian'] as Preference[]).map(item=><button key={item} aria-pressed={preference===item} onClick={()=>setPreference(item)}>{item}{preference===item&&<Icon name="check" size={15}/>}</button>)}</div></div>
      <div><span className="eyebrow">EXPLORE A SAMPLE DAY</span><div className="member-nutrition-days" role="group" aria-label="Meal schedule day">{days.map((name,index)=><button key={name} aria-pressed={day===index} aria-label={name} onClick={()=>setDay(index)}>{name.slice(0,3)}</button>)}</div></div>
    </section>
    <div className="member-nutrition-heading"><div><p className="eyebrow">{days[day].toUpperCase()} · SAME EXAMPLE MENU EACH DAY</p><h2>A rhythm for your day.</h2></div><span aria-live="polite">{completed} of 3 meals logged</span></div>
    <div className="member-meal-grid">{sampleMeals.map((meal,index)=>{
      const isLogged=logged.includes(mealKey(index));
      return <article className={`member-meal-card ${isLogged?'is-logged':''}`} key={`${preference}-${index}`}><div className="member-meal-top"><span className="member-meal-number">0{index+1}</span><span>{meal.time}</span><Icon name={index===0?'sun':index===1?'leaf':'home'} size={22}/></div><span className="member-meal-tag">{meal.tag}</span><h3>{meal.name}</h3><p>{meal.detail}</p><button aria-pressed={isLogged} aria-label={`${isLogged?'Unmark':'Log'} ${meal.time.toLowerCase()} for ${days[day]}`} onClick={()=>toggleMeal(index)}><span>{isLogged?'Meal logged':'Log sample meal'}</span><Icon name={isLogged?'check':'plus'} size={18}/></button></article>;
    })}</div>
    <section className="member-water-card" aria-labelledby="water-title"><div className="member-water-copy"><span className="eyebrow">A SIMPLE WATER LOG</span><h3 id="water-title">A small pause to refresh.</h3><p>A sample glass count for {days[day].toLowerCase()}. No daily intake target is set.</p></div><div className="member-water-control"><button aria-label="Remove one sample glass" disabled={!glasses} onClick={()=>setWater(previous=>({...previous,[day]:Math.max(0,(previous[day]||0)-1)}))}>−</button><span className="member-water-number" role="status"><strong>{glasses}</strong><small>{glasses===1?'glass logged':'glasses logged'}</small></span><button aria-label="Add one sample glass" onClick={()=>setWater(previous=>({...previous,[day]:(previous[day]||0)+1}))}><Icon name="plus" size={20}/></button></div></section>
    <NutritionBalance totals={totals} meals={sampleMeals.map((meal,index)=>({name:meal.time,kcal:meal.kcal,logged:logged.includes(mealKey(index))}))} waterByDay={days.map((name,index)=>({label:name.slice(0,3),value:water[index]||0}))}/>
    <p className="member-nutrition-note">Interactive concept only. Sample logs reset when you leave this screen. No personal health information is collected.</p>
  </div>;
}

import { CatmullRomCurve3, Vector3 } from 'three';
export const stages = [
  { id:'forest', name:'Forest Run', surface:'Gravel', ground:'#87966d', road:'#baa17e', edge:'#ae9472', sky:'#c6c5a8', dust:'#cab998', grip:1, conditions:['clear','rain','fog'], points:[[-64,55],[-66,18],[-45,-5],[-64,-34],[-35,-58],[1,-48],[24,-66],[61,-48],[64,-14],[36,0],[60,23],[41,55],[5,42],[-20,62],[-49,48]] },
  { id:'mountain', name:'Mountain Pass', surface:'Tarmac', ground:'#8d918a', road:'#666c70', edge:'#b5b1a0', sky:'#c5d4db', dust:'#b2c4cc', grip:1.22, conditions:['clear','rain','fog'], points:[[-66,59],[-61,25],[-29,32],[-40,4],[-65,-8],[-56,-43],[-20,-60],[-6,-25],[21,-43],[54,-59],[65,-25],[34,-5],[57,19],[35,44],[64,60]] },
  { id:'alpine', name:'Alpine Sprint', surface:'Snow', ground:'#dce6e6', road:'#b4cbd4', edge:'#f2f0e8', sky:'#cbdce5', dust:'#f5f7f3', grip:.72, conditions:['clear','snow','fog'], points:[[-65,55],[-42,44],[-57,15],[-38,-8],[-60,-38],[-29,-59],[1,-39],[28,-60],[55,-40],[34,-17],[62,4],[43,31],[13,26],[-6,52],[25,62]] },
  { id:'desert', name:'Desert Dash', surface:'Sand', ground:'#cda577', road:'#e0bc86', edge:'#bb8f60', sky:'#e9c997', dust:'#e5c392', grip:.86, conditions:['clear','wind','haze'], points:[[-64,55],[-62,3],[-37,-18],[-62,-49],[-26,-62],[2,-44],[35,-60],[63,-35],[37,-7],[61,16],[49,54],[16,44],[-4,63],[-26,39]] },
] as const;
export type StageId = typeof stages[number]['id'];
export type Weather = 'clear'|'rain'|'fog'|'snow'|'wind'|'haze';
export const timesOfDay = ['sunrise','midday','sunset','night'] as const;
export type TimeOfDay = typeof timesOfDay[number];
export const timeNames:Record<TimeOfDay,string>={sunrise:'Sunrise',midday:'Midday',sunset:'Sunset',night:'Night'};
export type StageSelection = { stage: StageId; weather: Weather; reverse: boolean; timeOfDay?:TimeOfDay };
export function timeOfDay(s:StageSelection):TimeOfDay{return s.timeOfDay??'midday';}
export const initialStage: StageSelection = {stage:'forest',weather:'clear',reverse:false};
export const weatherNames: Record<Weather,string> = {clear:'Clear',rain:'Rain',fog:'Fog',snow:'Snowfall',wind:'Wind',haze:'Dust haze'};
export function stageDefinition(selection: StageSelection) { return stages.find(s=>s.id===selection.stage)!; }
export function validSelection(value: unknown): value is StageSelection {
  if(!value || typeof value !== 'object') return false;
  const s=value as StageSelection;
  return (s.timeOfDay===undefined || timesOfDay.includes(s.timeOfDay)) && typeof s.reverse==='boolean' && stages.some(stage=>stage.id===s.stage && (stage.conditions as readonly string[]).includes(s.weather));
}
export function boardKey(s: StageSelection) { const key=`v2:${s.stage}:${s.weather}:${s.reverse?'reverse':'forward'}`;return timeOfDay(s)==='midday'?key:`${key}:${timeOfDay(s)}`; }
export function stagePoints(selection: StageSelection) {
  const points = new CatmullRomCurve3(stageDefinition(selection).points.map(([x,z])=>new Vector3(x,0,z)),false,'catmullrom',.4).getSpacedPoints(650);
  return selection.reverse ? points.reverse() : points;
}
export const checkpointIndices = Array.from({length:18},(_,i)=>Math.round((i+1)*650/18));
export function surfaceGrip(selection: StageSelection) {
  return stageDefinition(selection).grip * (selection.weather==='rain'?.78:selection.weather==='snow'?.82:1);
}

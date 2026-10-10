import { CatmullRomCurve3, Vector3 } from 'three';
export const stages = [
  { id:'forest', name:'Forest Run', surface:'Gravel', ground:'#87966d', road:'#baa17e', edge:'#ae9472', sky:'#c6c5a8', dust:'#cab998', grip:1, conditions:['clear','rain','fog'], points:[[-64,55],[-66,18],[-45,-5],[-64,-34],[-35,-58],[1,-48],[24,-66],[61,-48],[64,-14],[36,0],[60,23],[41,55],[5,42],[-20,62],[-49,48]] },
  { id:'mountain', name:'Mountain Pass', surface:'Tarmac', ground:'#8d918a', road:'#666c70', edge:'#b5b1a0', sky:'#c5d4db', dust:'#b2c4cc', grip:1.22, conditions:['clear','rain','fog'], points:[[-66,59],[-61,25],[-29,32],[-40,4],[-65,-8],[-56,-43],[-20,-60],[-6,-25],[21,-43],[54,-59],[65,-25],[34,-5],[57,19],[35,44],[64,60]] },
  { id:'alpine', name:'Alpine Sprint', surface:'Snow', ground:'#dce6e6', road:'#b4cbd4', edge:'#f2f0e8', sky:'#cbdce5', dust:'#f5f7f3', grip:.72, conditions:['clear','snow','fog'], points:[[-65,55],[-42,44],[-57,15],[-38,-8],[-60,-38],[-29,-59],[1,-39],[28,-60],[55,-40],[34,-17],[62,4],[43,31],[13,26],[-6,52],[25,62]] },
  { id:'desert', name:'Desert Dash', surface:'Sand', ground:'#cda577', road:'#e0bc86', edge:'#bb8f60', sky:'#e9c997', dust:'#e5c392', grip:.86, conditions:['clear','wind','haze'], points:[[-64,55],[-62,3],[-37,-18],[-62,-49],[-26,-62],[2,-44],[35,-60],[63,-35],[37,-7],[61,16],[49,54],[16,44],[-4,63],[-26,39]] },
  { id:'kart', name:'Warehouse GP', surface:'Indoor circuit', ground:'#b0aea4', road:'#4e555b', edge:'#da6642', sky:'#c0cbd0', dust:'#a9aaa1', grip:1.3, conditions:['clear'], points:[[-58,52],[-62,15],[-62,-45],[-32,-58],[5,-56],[5,-25],[-26,-22],[-27,8],[7,13],[29,-10],[55,-45],[64,-17],[56,20],[33,45],[-3,55],[-35,53]] },
] as const;
export type StageId = typeof stages[number]['id'];
export type Weather = 'clear'|'rain'|'fog'|'snow'|'wind'|'haze';
export const timesOfDay = ['sunrise','midday','sunset','night'] as const;
export type TimeOfDay = typeof timesOfDay[number];
export const timeNames:Record<TimeOfDay,string>={sunrise:'Sunrise',midday:'Midday',sunset:'Sunset',night:'Night'};
export type StageSelection = { stage: StageId; weather: Weather; reverse: boolean; track?:1|2|3; laps?:1|3|5; circuitVersion?:2; timeOfDay?:TimeOfDay };
export function timeOfDay(s:StageSelection):TimeOfDay{return s.timeOfDay??'midday';}
export const initialStage: StageSelection = {stage:'forest',weather:'clear',reverse:false};
export const weatherNames: Record<Weather,string> = {clear:'Clear',rain:'Rain',fog:'Fog',snow:'Snowfall',wind:'Wind',haze:'Dust haze'};
export function stageDefinition(selection: StageSelection) { return stages.find(s=>s.id===selection.stage)!; }
export function validSelection(value: unknown): value is StageSelection {
  if(!value || typeof value !== 'object') return false;
  const s=value as StageSelection;
  return (s.laps===undefined || (s.circuitVersion===2&&[1,3,5].includes(s.laps))) && (s.circuitVersion===undefined||s.circuitVersion===2) && (s.stage==='kart'||(s.laps===undefined&&s.circuitVersion===undefined)) && (s.track===undefined || [1,2,3].includes(s.track)) && (s.stage!=='kart'||(s.weather==='clear'&&timeOfDay(s)==='midday')) && (s.timeOfDay===undefined || timesOfDay.includes(s.timeOfDay)) && typeof s.reverse==='boolean' && stages.some(stage=>stage.id===s.stage && (stage.conditions as readonly string[]).includes(s.weather));
}
export function boardKey(s: StageSelection) { if(s.stage==='kart'&&s.circuitVersion===2)return `v3:kart:track${trackNumber(s)}:${s.reverse?'reverse':'forward'}:laps${lapCount(s)}`; const key=`v2:${s.stage}:${s.weather}:${s.reverse?'reverse':'forward'}`;const timed=timeOfDay(s)==='midday'?key:`${key}:${timeOfDay(s)}`;return trackNumber(s)===1?timed:`${timed}:track${trackNumber(s)}`; }
export function stagePoints(selection: StageSelection) {
  const points = new CatmullRomCurve3(routeControlPoints(selection).map(([x,z])=>new Vector3(x,0,z)),selection.stage==='kart'&&selection.circuitVersion===2,'catmullrom',.4).getSpacedPoints(650);
  return selection.reverse ? points.reverse() : points;
}
export const checkpointIndices = Array.from({length:18},(_,i)=>Math.round((i+1)*650/18));
export function surfaceGrip(selection: StageSelection) {
  return stageDefinition(selection).grip * (selection.weather==='rain'?.78:selection.weather==='snow'?.82:1);
}

export function compatibleCar(selection:StageSelection,car:number){return Number.isInteger(car)&&(selection.stage==='kart'?car===8:car>=0&&car<8);}
export function stageTimes(stage:StageId):readonly TimeOfDay[]{return stage==='kart'?['midday']:timesOfDay;}

export function trackNumber(s:StageSelection){return s.track??1;}
export const trackNames:Record<StageId,readonly string[]>={forest:['Forest Run','Fern Valley','Pine Ridge'],mountain:['Mountain Pass','Summit Switchbacks','Quarry Road'],alpine:['Alpine Sprint','Glacier Run','Snowbank Trail'],desert:['Desert Dash','Canyon Run','Dune Loop'],kart:['Warehouse GP','Loading Bay','Factory Sprint']};
export function trackName(s:StageSelection){return trackNames[s.stage][trackNumber(s)-1];}
// Hand-authored routes, not scaled copies. Existing track-one coordinates are unchanged.
const extraRoutes:Record<StageId,readonly (readonly (readonly [number,number])[])[]>={
 forest:[
 [[-64,58],[-63,18],[-58,-30],[-32,-59],[7,-58],[50,-49],[62,-18],[38,-4],[9,-20],[-16,-4],[-3,25],[30,28],[58,55]],
 [[-62,57],[-33,53],[-15,28],[-42,8],[-61,-20],[-41,-57],[-4,-55],[12,-30],[43,-54],[63,-29],[53,6],[23,6],[15,40],[53,59]]],
 mountain:[
 [[-65,57],[-61,18],[-27,22],[-14,1],[-49,-14],[-61,-43],[-32,-59],[5,-53],[45,-61],[62,-34],[36,-13],[12,3],[47,23],[61,56]],
 [[-63,58],[-31,50],[-48,25],[-63,-2],[-35,-24],[-57,-51],[-18,-60],[8,-38],[39,-56],[62,-31],[29,-8],[48,16],[17,35],[52,59]]],
 alpine:[
 [[-64,58],[-60,18],[-34,-2],[-53,-28],[-42,-57],[-4,-58],[29,-44],[59,-58],[61,-22],[30,-10],[4,10],[28,32],[60,55]],
 [[-62,58],[-28,51],[-6,26],[-30,6],[-58,-12],[-53,-49],[-19,-61],[8,-32],[37,-57],[61,-32],[53,2],[20,4],[9,39],[46,58]]],
 desert:[
 [[-64,58],[-62,13],[-43,-7],[-61,-38],[-33,-60],[6,-56],[45,-47],[61,-18],[35,1],[5,-12],[-8,16],[28,31],[61,57]],
 [[-63,58],[-27,52],[-12,26],[-42,7],[-62,-23],[-40,-56],[-4,-59],[17,-32],[45,-54],[63,-22],[42,4],[12,8],[22,39],[56,58]]],
 kart:[
 [[-62,58],[-61,15],[-60,-46],[-28,-59],[8,-55],[13,-26],[-25,-21],[-31,8],[5,25],[32,3],[37,-40],[63,-33],[62,17],[49,53],[16,58]],
 [[-62,58],[-62,13],[-59,-46],[-27,-59],[7,-55],[5,-24],[-29,-15],[-24,18],[6,39],[32,12],[32,-27],[60,-44],[64,3],[60,56]]]
};
export function routeControlPoints(s:StageSelection):readonly (readonly [number,number])[]{return trackNumber(s)===1?stageDefinition(s).points:extraRoutes[s.stage][trackNumber(s)-2];}

export function lapCount(s:StageSelection){return s.stage==='kart'&&s.circuitVersion===2?(s.laps??3):1;}
export function routeLength(s:StageSelection){const points=stagePoints(s);return points.slice(1).reduce((n,p,i)=>n+p.distanceTo(points[i]),0);}

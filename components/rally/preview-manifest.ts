import {trackNumber,type StageSelection} from './stages';
export const weatherIcons:Record<string,string>={clear:'☀',rain:'☂',snow:'❄',fog:'≋',haze:'≋',wind:'〰'};
export function previewImage(kind:string,value:string,selection:StageSelection){const stage=kind==='stage'?value:selection.stage,track=kind==='stage'?1:kind==='track'?Number(value):trackNumber(selection);const variant=kind==='weather'?`weather-${value}`:kind==='time'?`time-${value}`:'weather-clear';return `/rally/previews/v42/${stage}-${track}-${variant}.webp`;}

'use client';
import {useSyncExternalStore,type ReactNode} from 'react';
export type RaceStats={time:number;speed:number;rpm:number;limited:boolean;progress:number;lapProgress:number;count:number;lap:number;lastLap:number};
export class HudStore {
 value:RaceStats={time:0,speed:0,rpm:950,limited:false,progress:0,lapProgress:0,count:3,lap:1,lastLap:0};
 private listeners=new Set<()=>void>();
 set=(value:RaceStats)=>{this.value=value;this.listeners.forEach(fn=>fn());};
 read=()=>this.value;
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
}
export function HudRead({store,children}:{store:HudStore;children:(stats:RaceStats)=>ReactNode}){return children(useSyncExternalStore(store.subscribe,store.read,store.read));}

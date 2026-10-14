import type {StageSelection} from './stages';
export type RoomMember={id:string;name:string;car?:number;ready:boolean;seen:number;status:'lobby'|'racing'|'finished'|'retired'|'disconnected';time?:number;practice?:boolean};
export type RaceRoom={version:1|2|3;code:string;host:string;selection:StageSelection;car:number;phase:'lobby'|'racing'|'results';attempt:number;startAt:number;members:RoomMember[]};
export type LivePose={id:string;y?:number;pitch?:number;roll?:number;x:number;z:number;heading:number;speed:number;progress:number;sent:number};

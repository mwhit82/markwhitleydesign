import {compatibleCar,validSelection} from '../../components/rally/stages';
import type {RaceRoom} from '../../components/rally/room-types';
import {validateRun} from './validation';
export function sweepRoom(r:RaceRoom,now:number){
 for(const m of r.members)if(now-m.seen>20000&&m.status!=='finished'&&m.status!=='retired')m.status='disconnected';
 if(r.phase==='lobby')r.members=r.members.filter(m=>m.status!=='retired'&&m.status!=='disconnected');
 if(!r.members.some(m=>m.id===r.host&&m.status!=='disconnected'&&m.status!=='retired'))r.host=r.members.find(m=>m.status!=='disconnected'&&m.status!=='retired')?.id??r.host;
 if(r.phase==='racing'&&(r.members.every(m=>['finished','retired','disconnected'].includes(m.status))||now-r.startAt>600000))r.phase='results';
}
export function roomAction(r:RaceRoom,id:string,m:Record<string,unknown>,now:number){
 const seat=r.members.find(p=>p.id===id);if(!seat||seat.status==='retired'||seat.status==='disconnected')throw Error('Expired membership');seat.seen=now;
 if(m.type==='ready'&&r.phase==='lobby')seat.ready=m.ready===true;
 else if(m.type==='car'&&r.version===3&&r.phase==='lobby'){if(!compatibleCar(r.selection,m.car as number))throw Error('Invalid car');seat.car=m.car as number;for(const p of r.members)p.ready=false;}
 else if(m.type==='setup'&&r.phase==='lobby'&&r.host===id){if((r.version===1&&Number(m.car)>=9)||!validSelection(m.selection)||!compatibleCar(m.selection,m.car as number))throw Error('Invalid setup');r.selection=m.selection;r.car=m.car as number;for(const p of r.members){p.ready=false;if(r.version===3&&!compatibleCar(r.selection,p.car??r.car))p.car=r.car;}}
 else if(m.type==='start'&&r.phase==='lobby'&&r.host===id){if(r.members.length<2||!r.members.every(p=>p.ready&&p.status==='lobby'))throw Error('All drivers must be ready');r.phase='racing';r.attempt++;r.startAt=now+(r.selection.stage==='nyc'?7000:4000);for(const p of r.members){p.status='racing';delete p.time;delete p.practice;}}
 else if(m.type==='finish'&&r.phase==='racing'&&seat.status==='racing'){if(m.attempt!==r.attempt||typeof m.time!=='number'||!Number.isFinite(m.time)||m.time<=0||m.time>600||m.time>(now-r.startAt)/1000+2)throw Error('Invalid finish');seat.time=m.time;seat.practice=m.practice===true||!validateRun(r.selection,m.time,m.trace,(now-r.startAt)/1000);seat.status='finished';}
 else if(m.type==='leave'){seat.status='retired';seat.ready=false;}
 else if(m.type==='again'&&r.phase==='results'&&r.host===id){r.phase='lobby';r.members=r.members.filter(p=>p.status!=='retired'&&p.status!=='disconnected');for(const p of r.members){p.ready=false;p.status='lobby';delete p.time;delete p.practice;}}
 else throw Error('Action unavailable');
 sweepRoom(r,now);
}

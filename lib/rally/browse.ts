import {stages,timesOfDay,stageTimes,boardKey,type StageSelection} from '../../components/rally/stages';
export function browseRequest(q:URLSearchParams){
 const track=q.get('track'),laps=q.get('laps');
 const stage=q.get('stage'),weather=q.get('weather'),day=q.get('timeOfDay'),direction=q.get('reverse'),car=q.get('car'),search=(q.get('search')||'').trim();
 if((laps!==null&&!['1','3','5'].includes(laps))||(track!==null&&!/^[1-3]$/.test(track))||(stage&&!stages.some(s=>s.id===stage))||(weather&&!stages.some(s=>(s.conditions as readonly string[]).includes(weather)))||(day&&!(timesOfDay as readonly string[]).includes(day))||(direction!==null&&!['true','false'].includes(direction))||(car!==null&&!/^[0-8]$/.test(car))||search.length>20) return null;
 const cursor=q.get('cursor')||'0';if(!/^\d{1,6}$/.test(cursor))return null;const offset=Number(cursor),board=0;
 const selections:StageSelection[]=[];
 for(const s of stages)for(const w of s.conditions)for(const r of [false,true])for(const d of stageTimes(s.id))for(const layout of [1,2,3] as const)for(const count of (s.id==='kart'?[1,3,5]:[1]) as (1|3|5)[]){
  if((laps!==null&&(s.id!=='kart'||count!==Number(laps)))||(track!==null&&layout!==Number(track))||(car!==null&&(s.id==='kart'?car!=='8':car==='8'))||(stage&&s.id!==stage)||(weather&&w!==weather)||(day&&d!==day)||(direction!==null&&String(r)!==direction))continue;
  selections.push({stage:s.id,weather:w,reverse:r,timeOfDay:d,track:layout,...(s.id==='kart'?{laps:count,circuitVersion:2 as const}:{})});
 }
 if(board>selections.length||offset>10000000)return null;
 return {selections,keys:selections.map(s=>`rally:${boardKey(s)}${car===null?'':`:car${car}`}`),board,offset,search:search.toLowerCase()};
}
/** Read a bounded snapshot, sort across boards, then paginate. Fail rather than
 * show misleading ranks if the safety limit is exceeded. No record migration. */
export const browseScript=`
local offset=tonumber(ARGV[2])
local search=ARGV[3]
local player=ARGV[4]
local all={}
local scanned=0
for board=1,#KEYS do
 local count=redis.call('ZCARD',KEYS[board])
 scanned=scanned+count
 if scanned>20000 then return {'[]',-1,0,'[]'} end
 local rows=redis.call('ZRANGE',KEYS[board],0,-1,'WITHSCORES')
 for i=1,#rows,2 do
  local raw=redis.call('HGET',KEYS[board]..':info',rows[i])
  if raw then
   local ok,info=pcall(cjson.decode,raw)
   if ok and type(info)=='table' and type(info.name)=='string' and (search=='' or string.find(string.lower(info.name),search,1,true)) then
    table.insert(all,{board=board-1,name=info.name,car=info.car,time=tonumber(rows[i+1])/1000,mine=rows[i]==player,tie=rows[i]})
   end
  end
 end
end
table.sort(all,function(a,b) if a.time~=b.time then return a.time<b.time end if a.board~=b.board then return a.board<b.board end return a.tie<b.tie end)
local output={}
local mine={}
for i,row in ipairs(all) do
 row.rank=i;row.tie=nil
 if i>offset and i<=offset+20 then table.insert(output,row) end
 if row.mine then table.insert(mine,row) end
end
return {cjson.encode(output),#all,offset+20,cjson.encode(mine)}
`;

import {stages,timesOfDay,boardKey,type StageSelection} from '../../components/rally/stages';
export function browseRequest(q:URLSearchParams){
 const stage=q.get('stage'),weather=q.get('weather'),day=q.get('timeOfDay'),direction=q.get('reverse'),car=q.get('car'),search=(q.get('search')||'').trim();
 if((stage&&!stages.some(s=>s.id===stage))||(weather&&!stages.some(s=>(s.conditions as readonly string[]).includes(weather)))||(day&&!(timesOfDay as readonly string[]).includes(day))||(direction!==null&&!['true','false'].includes(direction))||(car!==null&&!/^[0-3]$/.test(car))||search.length>20) return null;
 const cursor=(q.get('cursor')||'0:0').split(':');
 if(cursor.length!==2||!cursor.every(v=>/^\d{1,8}$/.test(v)))return null;
 const [board,offset]=cursor.map(Number);
 const selections:StageSelection[]=[];
 for(const s of stages)for(const w of s.conditions)for(const r of [false,true])for(const d of timesOfDay){
  if((stage&&s.id!==stage)||(weather&&w!==weather)||(day&&d!==day)||(direction!==null&&String(r)!==direction))continue;
  selections.push({stage:s.id,weather:w,reverse:r,timeOfDay:d});
 }
 if(board>selections.length||offset>10000000)return null;
 return {selections,keys:selections.map(s=>`rally:${boardKey(s)}${car===null?'':`:car${car}`}`),board,offset,search:search.toLowerCase()};
}
/** Scan at most 2,000 metadata rows per page. Search retains real sorted-set ranks.
 * Existing boards are read directly: no index migration, record copying or replay downloads. */
export const browseScript=`
local board=tonumber(ARGV[1])+1
local offset=tonumber(ARGV[2])
local search=ARGV[3]
local player=ARGV[4]
local output={}
local scanned=0
while board<=#KEYS and #output<20 and scanned<2000 do
 local rows=redis.call('ZRANGE',KEYS[board],offset,offset+math.min(99,1999-scanned),'WITHSCORES')
 if #rows==0 then board=board+1;offset=0 else
  for i=1,#rows,2 do
   local raw=redis.call('HGET',KEYS[board]..':info',rows[i])
   offset=offset+1;scanned=scanned+1
   if raw then
    local ok,info=pcall(cjson.decode,raw)
    if ok and type(info)=='table' and type(info.name)=='string' and (search=='' or string.find(string.lower(info.name),search,1,true)) then
     table.insert(output,{board=board-1,rank=offset,name=info.name,car=info.car,time=tonumber(rows[i+1])/1000,mine=rows[i]==player})
    end
   end
   if #output>=20 or scanned>=2000 then break end
  end
 end
end
return {cjson.encode(output),board-1,offset}
`;

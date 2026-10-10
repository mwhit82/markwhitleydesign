import {configured,player,redis} from '../../../../lib/rally/store';
import {browseRequest,browseScript} from '../../../../lib/rally/browse';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const query=browseRequest(new URL(request.url).searchParams);
 if(!query)return Response.json({error:'Invalid leaderboard filters'},{status:400});
 if(!configured())return Response.json({error:'Shared leaderboards are temporarily unavailable.'},{status:503});
 try{
  if(!query.keys.length)return Response.json({entries:[],cursor:null});
  const id=await player();
  const [json,total,offset,mine]=await redis<[string,number,number,string]>('EVAL',browseScript,query.keys.length,...query.keys,query.board,query.offset,query.search,id||'');
  if(total===-1)return Response.json({error:"Too many matching records. Narrow the filters to see accurate ranks."},{status:422});
  const parsed=JSON.parse(json);const rows=Array.isArray(parsed)?parsed:[];
  const entries=rows.map((row:{board:number;rank:number;name:string;car:number;time:number;mine:boolean})=>({...row,selection:query.selections[row.board]}));
  const personal=JSON.parse(mine);
  return Response.json({entries,me:(Array.isArray(personal)?personal:[]).map((row:{board:number})=>({...row,selection:query.selections[row.board]})),cursor:offset<total?String(offset):null},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Could not load leaderboards. Please try again.'},{status:503});}
}

import {configured,player,rateLimit,sameOrigin} from '../../../../lib/rally/store';
import {enterRoom} from '../../../../lib/rally/rooms';
import {validName} from '../../../../lib/rally/validation';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!sameOrigin(request))return new Response(null,{status:403});
 if(!configured())return Response.json({error:'Friend rooms are unavailable. Solo racing still works.'},{status:503});
 try{const text=await request.text();if(text.length>2048)return new Response(null,{status:413});const body=JSON.parse(text);if(!validName(body.name))return Response.json({error:'Use a name of 2–20 letters or numbers.'},{status:400});const id=await player(true);if(!await rateLimit(id!,'rooms',12))return new Response(null,{status:429});return Response.json(await enterRoom(body),{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:e instanceof Error?e.message:'Room unavailable'},{status:400});}
}

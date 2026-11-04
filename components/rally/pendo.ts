/** Identify the Pocket Rally driver in Pendo. `id` is the signed rally-player
 * cookie id returned by the rally API (the cookie itself is httpOnly) and
 * `name` is the public driver name from the leaderboard. */
export function identifyDriver(id:unknown,name?:unknown){
 if(typeof id!=='string'||!id)return;
 // Analytics must never interrupt a run or a leaderboard request.
 try{globalThis.pendo?.identify({visitor:{id,...(typeof name==='string'&&name?{full_name:name}:{})}});}catch{}
}

/** Keep a stable presentation deadline; late callbacks must not shift every later frame. */
export function pacedFrame(now:number,previous:number,interval:number){
 const elapsed=now-previous;
 if(elapsed<interval-2)return null;
 return previous+Math.max(1,Math.floor((elapsed+2)/interval))*interval;
}

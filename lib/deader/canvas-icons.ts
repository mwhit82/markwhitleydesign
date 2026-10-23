import {actionIcons,type ActionIconName} from './action-icons';
type Piece={path:Path2D;fill:boolean;stroke:boolean};
const cache=new Map<ActionIconName,Piece[]>();
/** Cache vector paths, not images/textures, so icons are immediately ready in VR. */
function paths(name:ActionIconName):Piece[]{
 const cached=cache.get(name);if(cached)return cached;
 const pieces=actionIcons[name].map(([tag,attrs])=>{
  const a=attrs as Record<string,string|number>;
  const n=(key:string)=>Number(a[key]??0);
  const p=new Path2D(tag==='path'?String(a.d):undefined);
  if(tag==='circle')p.arc(n('cx'),n('cy'),n('r'),0,Math.PI*2);
  if(tag==='ellipse')p.ellipse(n('cx'),n('cy'),n('rx'),n('ry'),0,0,Math.PI*2);
  if(tag==='rect')p.roundRect(n('x'),n('y'),n('width'),n('height'),n('rx'));
  if(tag==='line'){p.moveTo(n('x1'),n('y1'));p.lineTo(n('x2'),n('y2'));}
  if(tag==='polyline'||tag==='polygon'){
   const pts=String(a.points).trim().split(/[ ,]+/).map(Number);
   for(let i=0;i<pts.length;i+=2){if(i===0)p.moveTo(pts[i],pts[i+1]);else p.lineTo(pts[i],pts[i+1]);}
   if(tag==='polygon')p.closePath();
  }
  return {path:p,fill:!!a.fill&&a.fill!=='none',stroke:a.stroke!=='none'&&(!a.fill||!!a.stroke)};
 });
 cache.set(name,pieces);return pieces;
}
export function drawActionIcon(ctx:CanvasRenderingContext2D,name:ActionIconName,x:number,y:number,size:number,disabled=false){
 ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);ctx.lineWidth=1.5;ctx.lineCap='round';ctx.lineJoin='round';ctx.fillStyle=ctx.strokeStyle=disabled?'#818992':'#e8e4da';
 for(const piece of paths(name)){if(piece.fill)ctx.fill(piece.path);if(piece.stroke)ctx.stroke(piece.path);}
 ctx.restore();
}

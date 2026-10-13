/** Exact nearest-point lookup, with deterministic ties matching the original scan. */
export class RouteIndex {
 private cells=new Map<string,number[]>();private size=16;
 constructor(private points:readonly {x:number;z:number}[]){points.forEach((p,i)=>{const key=this.key(p.x,p.z),cell=this.cells.get(key)??[];cell.push(i);this.cells.set(key,cell);});}
 private key(x:number,z:number){return `${Math.floor(x/this.size)},${Math.floor(z/this.size)}`;}
 nearest(x:number,z:number){const cx=Math.floor(x/this.size),cz=Math.floor(z/this.size);let index=0,best=Infinity;
 for(let r=0;r<32;r++){for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){if(r&&Math.abs(dx)!==r&&Math.abs(dz)!==r)continue;for(const i of this.cells.get(`${cx+dx},${cz+dz}`)??[]){const p=this.points[i],d=(x-p.x)**2+(z-p.z)**2;if(d<best||(d===best&&i<index)){best=d;index=i;}}}
 const edge=Math.min(x-(cx-r)*this.size,(cx+r+1)*this.size-x,z-(cz-r)*this.size,(cz+r+1)*this.size-z);if(best<edge*edge)break;
 }return {index,distance:Math.sqrt(best)};}
}

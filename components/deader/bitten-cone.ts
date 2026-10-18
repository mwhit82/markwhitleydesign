import * as THREE from 'three';

/** Closed ring mesh: bite cylinders remove the right silhouette through the body. */
export function createBittenConeGeometry() {
  const profile=[[.23,0],[.23,.46],[.27,.49],[.34,.48],[1.45,.09],[1.51,.055],[1.53,0]];
  const positions:number[]=[],uvs:number[]=[],colours:number[]=[],indices:number[]=[];
  const rows=160,segments=64;
  for(let row=0;row<=rows;row++){
    const y=.23+1.3*row/rows;
    let radius=0;
    for(let j=1;j<profile.length;j++)if(y>=profile[j-1][0]&&y<=profile[j][0]){
      const [a,r]=profile[j-1],[b,s]=profile[j];radius=b===a?s:r+(s-r)*(y-a)/(b-a);break;
    }
    if(row===0||row===rows)radius=0;
    let edge=radius;
    for(const [cy,cx,r] of [[1.19,.25,.155],[1.405,.15,.12]]){
      const dy=y-cy;if(Math.abs(dy)<r)edge=Math.min(edge,cx-Math.sqrt(r*r-dy*dy));
    }
    edge=Math.max(-radius*.85,edge);
    for(let col=0;col<=segments;col++){
      const angle=col/segments*Math.PI*2,x=radius*Math.sin(angle),z=radius*Math.cos(angle),cut=x>edge;
      positions.push(Math.min(x,edge),y,z);uvs.push(col/segments,row/rows);
      colours.push(...(cut?[1,.96,.72]:[.83,.72,.34]));
      if(row<rows&&col<segments){const a=row*(segments+1)+col,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

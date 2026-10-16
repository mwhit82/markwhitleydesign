"use client";
import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { Box } from './environment';
/** Frame the supplied artwork using UVs; retain the original file unchanged. */
export function UncPortrait(){
  const source=useTexture('/deader/unc.jpg');
  const texture=useMemo(()=>{const t=source.clone();t.repeat.set(304/1280,300/889);t.offset.set(517/1280,1-595/889);t.needsUpdate=true;return t;},[source]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <group position={[-3.67,1.9,7.1]} rotation={[0,Math.PI/2,0]}>
    <Box position={[0,0,0]} size={[1.03,1.03,.09]} colour="#30251e"/>
    <mesh position={[0,0,.05]}><planeGeometry args={[.9,.9]}/><meshStandardMaterial map={texture} roughness={.8}/></mesh>
  </group>;
}

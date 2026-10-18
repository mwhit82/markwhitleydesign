"use client";
import {useVR} from "@/lib/deader/vr-state";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { useGame } from "@/lib/deader/store";
import { cosmetics } from "@/lib/deader/game";
import { bundleOutfit } from "@/lib/deader/cosmetics";
import { GunModel } from "./weapon";
import { Box } from "./environment";
import { Cone } from "./character";

// Physical player pose, independent of CCTV and inspection camera positions.
export const roomPlayerPose = { x: 0, z: 3.2, yaw: 0, walking: false };
const REFLECTION_LAYER = 2;

export function ReflectedPlayer() {
  const vr=useVR(s=>s.active);
  const armed=useGame(s=>s.room.weapon.collected);
  const group = useRef<THREE.Group>(null);
  const [walking, setWalking] = useState(false);
  const colour = useGame(s => cosmetics.find(c => c.id === s.save.equipped)!.colour);
  const savedOutfit = useGame(s => s.save.outfit);
  const previewBundle=useGame(s=>s.room.previewBundle);
  const outfit=useMemo(()=>previewBundle?bundleOutfit(savedOutfit,previewBundle):savedOutfit,[savedOutfit,previewBundle]);
  const paused = useGame(s => !!s.panel || !s.focused || !!s.suspension);
  useLayoutEffect(() => {
    // Never draw a duplicate body in the first-person view or CCTV.
    group.current?.traverse(object => { object.layers.set(REFLECTION_LAYER); });
  }, [outfit]);
  useFrame(() => {
    if (!group.current) return;
    group.current.traverse(object=>object.layers.set(REFLECTION_LAYER));
    group.current.position.set(roomPlayerPose.x, 0, roomPlayerPose.z);
    group.current.rotation.y = roomPlayerPose.yaw + Math.PI;
    if (walking !== roomPlayerPose.walking) setWalking(roomPlayerPose.walking);
  });
  return <group ref={group}><pointLight position={[0,1.8,1.2]} intensity={1.5} distance={3} color="#ffe0b5"/><Cone colour={colour} outfit={outfit} walking={walking} paused={paused} armed={armed||vr}/>
    {armed&&!vr&&<group position={[.14,.88,.40]} rotation={[0,Math.PI,0]} scale={.65} userData={{ignoreBullet:true}}>
      <GunModel/>
      <mesh position={[0,-.17,.12]} scale={[.045,.075,.055]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#17191c" roughness={.65}/></mesh>
      <mesh position={[-.055,-.09,-.06]} scale={[.055,.042,.075]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#17191c" roughness={.65}/></mesh>
      <Box position={[.04,-.25,.28]} size={[.065,.085,.4]} colour="#17191c" rotation={[-.4,-.15,0]}/>
      <Box position={[-.15,-.22,.17]} size={[.065,.075,.42]} colour="#17191c" rotation={[-.4,-.55,0]}/>
    </group>}</group>;
}

export function PlayerMirror() {
  const quality = useGame(s => s.save.settings.quality);
  const mirror = useMemo(() => {
    const size = quality === "low" ? 256 : 512;
    const surface = new Reflector(new THREE.PlaneGeometry(.97, 1.87), {
      textureWidth: size, textureHeight: size, multisample: 0,
      color: "#b4ada0", clipBias: .003,
    });
    surface.getRenderTarget().texture.type = THREE.UnsignedByteType;
    const renderReflection = surface.onBeforeRender;
    let lastFrame = -Infinity;
    surface.onBeforeRender = function (...args) {
      if(args[2].userData.loungeInset)return;
      const s = useGame.getState();
      const now = performance.now();
      if (s.panel || !s.focused || s.suspension || s.room.view !== "explore" ||
          now - lastFrame < 1000 / (useVR.getState().active ? 10 : quality === "low" ? 12 : 24)) return;
      lastFrame = now;
      surface.getReflectionCamera(args[2]).layers.enable(REFLECTION_LAYER);
      // The camera-relative weapon must not float above the physical reflected body.
      const hidden:THREE.Object3D[]=[];
      args[1].traverse(object=>{if(object.visible&&object.userData.firstPersonWeapon){hidden.push(object);object.visible=false;}});
      try{renderReflection.apply(surface,args);}finally{hidden.forEach(object=>object.visible=true);}
    };
    return surface;
  }, [quality]);
  useEffect(() => () => { mirror.geometry.dispose(); mirror.dispose(); }, [mirror]);
  return <primitive object={mirror} position={[0, 0, .071]} />;
}

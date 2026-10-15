"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { useGame } from "@/lib/deader/store";
import { cosmetics } from "@/lib/deader/game";
import { Cone } from "./character";

// Physical player pose, independent of CCTV and inspection camera positions.
export const roomPlayerPose = { x: 0, z: 3.2, yaw: 0, walking: false };
const REFLECTION_LAYER = 2;

export function ReflectedPlayer() {
  const group = useRef<THREE.Group>(null);
  const [walking, setWalking] = useState(false);
  const colour = useGame(s => cosmetics.find(c => c.id === s.save.equipped)!.colour);
  const outfit = useGame(s => s.save.outfit);
  const paused = useGame(s => !!s.panel || !s.focused || !!s.suspension);
  useLayoutEffect(() => {
    // Never draw a duplicate body in the first-person view or CCTV.
    group.current?.traverse(object => { object.layers.set(REFLECTION_LAYER); });
  }, [outfit]);
  useFrame(() => {
    if (!group.current) return;
    group.current.position.set(roomPlayerPose.x, 0, roomPlayerPose.z);
    group.current.rotation.y = roomPlayerPose.yaw + Math.PI;
    if (walking !== roomPlayerPose.walking) setWalking(roomPlayerPose.walking);
  });
  return <group ref={group}><Cone colour={colour} outfit={outfit} walking={walking} paused={paused} /></group>;
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
      const s = useGame.getState();
      const now = performance.now();
      if (s.panel || !s.focused || s.suspension || s.room.view !== "explore" ||
          now - lastFrame < 1000 / (quality === "low" ? 12 : 24)) return;
      lastFrame = now;
      surface.getReflectionCamera(args[2]).layers.enable(REFLECTION_LAYER);
      renderReflection.apply(surface, args);
    };
    return surface;
  }, [quality]);
  useEffect(() => () => { mirror.geometry.dispose(); mirror.dispose(); }, [mirror]);
  return <primitive object={mirror} position={[0, 0, .071]} />;
}

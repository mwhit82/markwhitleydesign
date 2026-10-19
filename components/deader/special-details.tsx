"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/deader/store";
import type { Outfit } from "@/lib/deader/cosmetics";
import { Sign } from "./environment";
/** Twelve reusable fragments, with no lights, transparency or per-frame allocation. */
export function GlitchBits({
  paused = false,
  muted = false,
}: {
  paused?: boolean;
  muted?: boolean;
}) {
  const group = useRef<THREE.Group>(null),
    time = useRef(0);
  useFrame((_, dt) => {
    const s = useGame.getState();
    if (!group.current) return;
    const reduced =
      s.save.settings.reducedMotion ||
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    group.current.visible = s.save.settings.effects && !reduced;
    if (paused || !s.focused) return;
    time.current += Math.min(dt, 0.05);
    group.current.children.forEach((b, i) => {
      const t = time.current * 0.35 + i * 0.7;
      b.position.set(
        0.52 + Math.sin(t * 1.3 + i) * 0.12,
        0.35 + (i % 5) * 0.21 + Math.sin(t) * 0.07,
        Math.cos(i * 4 + t) * 0.22,
      );
      b.rotation.z = Math.sin(t) * 0.3;
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.035 + (i % 3) * 0.015, 0.045, 0.035]} />
          <meshStandardMaterial
            color={
              muted
                ? i % 3
                  ? "#191b1c"
                  : "#7a7a73"
                : ["#ab343d", "#33a9ae", "#5eaa45", "#242a2e"][i % 4]
            }
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}
export function SpecialDetails({
  outfit,
  armed = false,
  paused = false,
  wear,
}: {
  wear?: {map:THREE.Texture;relief:THREE.Texture};
  outfit?: Outfit;
  armed?: boolean;
  paused?: boolean;
}) {
  return (
    <group>
      {outfit?.effect === "glitch-particles" && <GlitchBits paused={paused} />}
      {outfit?.hat === "headphones" && (
        <group position={[0, 1.1, 0]}>
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[0.29, 0.033, 6, 20, Math.PI]} />
            <meshStandardMaterial map={wear?.map} bumpMap={wear?.relief} bumpScale={.005} color="#17191a" roughness={0.7} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.29, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.1, 0.25, 0.16]} />
                <meshStandardMaterial map={wear?.map} bumpMap={wear?.relief} bumpScale={.005} color="#151719" roughness={0.65} />
              </mesh>
              <mesh position={[side * 0.055, 0, 0]}>
                <boxGeometry args={[0.025, 0.19, 0.12]} />
                <meshStandardMaterial map={wear?.map} bumpMap={wear?.relief} bumpScale={.005} color="#d1ac25" roughness={0.65} />
              </mesh>
            </group>
          ))}
        </group>
      )}
      {outfit?.hand === "mystery-prop" && !armed && (
        <group position={[0.52, 0.55, 0.1]} rotation={[0, -0.12, -0.12]}>
          <mesh>
            <boxGeometry args={[0.29, 0.37, 0.08]} />
            <meshStandardMaterial map={wear?.map} bumpMap={wear?.relief} bumpScale={.005} color="#161719" roughness={0.7} />
          </mesh>
          <Sign
            fontSize={200}
            text="?"
            position={[0, 0, 0.044]}
            width={0.24}
            height={0.31}
            background="#d6b526"
            colour="#171719"
          />
        </group>
      )}
    </group>
  );
}

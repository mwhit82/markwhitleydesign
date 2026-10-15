"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { characterPose, type AnimationState } from "@/lib/deader/presentation";
import { useGame } from "@/lib/deader/store";
import type { Outfit } from "@/lib/deader/cosmetics";
import { createCharacterWear } from "./character-wear";
export function Cone({
  colour = "#ffc928",
  walking = false,
  animation,
  animationKey,
  backpack = false,
  outfit,
  selfie = false,
  appearance = "ordinary",
  paused = false,
  ...props
}: {
  colour?: string;
  walking?: boolean;
  animation?: AnimationState;
  animationKey?: string | number;
  backpack?: boolean;
  outfit?: Outfit;
  selfie?: boolean;
  appearance?: "ordinary" | "third-eye" | "wide-mouth";
  paused?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  const motion = useRef(0),
    systemReduced = useRef(false);
  const arm = useRef<THREE.Mesh>(null),
    mouth = useRef<THREE.Mesh>(null);
  useEffect(() => {
    motion.current = 0;
  }, [animation, animationKey]);
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      systemReduced.current = q.matches;
    };
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  const body = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null),
    right = useRef<THREE.Group>(null);
  const wear = useMemo(createCharacterWear, []);
  useEffect(
    () => () => {
      wear.map.dispose();
      wear.relief.dispose();
    },
    [wear],
  );
  const points = useMemo(
    () => [
      new THREE.Vector2(0, 0.23),
      new THREE.Vector2(0.46, 0.23),
      new THREE.Vector2(0.49, 0.27),
      new THREE.Vector2(0.48, 0.34),
      new THREE.Vector2(0.09, 1.45),
      new THREE.Vector2(0.055, 1.51),
      new THREE.Vector2(0, 1.53),
    ],
    [],
  );
  useFrame((_, dt) => {
    if (paused || !useGame.getState().focused) return;
    motion.current += Math.min(dt, 0.05);
    const t = motion.current,
      reduced =
        systemReduced.current || useGame.getState().save.settings.reducedMotion;
    const state = animation ?? (walking ? "walk" : "idle");
    const pose = characterPose(
      (state === "knock" || state === "talk") && t > 2 ? "idle" : state,
      t,
      reduced,
    );
    if (body.current) {
      body.current.position.y = pose.bob;
      body.current.rotation.z = pose.tilt;
    }
    if (arm.current) arm.current.rotation.x = pose.arm;
    if (mouth.current)
      mouth.current.scale.y =
        (appearance === "wide-mouth" ? 1.3 : 0.38) * pose.jaw;
    [left.current, right.current].forEach((leg, i) => {
      if (leg)
        leg.rotation.x = THREE.MathUtils.damp(
          leg.rotation.x,
          walking && !reduced ? Math.sin(t * 12 + i * Math.PI) * 0.55 : 0,
          12,
          dt,
        );
    });
  });
  return (
    <group {...props}>
      {[left, right].map((ref, i) => (
        <group key={i} ref={ref} position={[i ? 0.23 : -0.23, 0.3, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.045, 0.22, 3, 6]} />
            <meshStandardMaterial color="#11100f" roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.28, 0.055]} scale={[1, 0.55, 1.7]}>
            <sphereGeometry args={[0.09, 10, 6]} />
            <meshStandardMaterial color="#11100f" />
          </mesh>
        </group>
      ))}
      <group ref={body}>
        <mesh castShadow>
          <latheGeometry args={[points, 40]} />
          <meshStandardMaterial
            color={colour}
            map={wear.map}
            bumpMap={wear.relief}
            bumpScale={0.008}
            roughness={0.64}
            roughnessMap={wear.relief}
            metalness={0.08}
          />
        </mesh>
        {[-0.13, 0.13].map((x) => (
          <mesh
            key={x}
            position={[x, 0.99, 0.235]}
            rotation={[-0.33, 0, 0]}
            scale={[0.65, 1, 0.4]}
          >
            <sphereGeometry args={[0.052, 12, 8]} />
            <meshStandardMaterial color="#12110d" />
          </mesh>
        ))}
        {appearance === "third-eye" && (
          <mesh
            position={[0, 1.16, 0.188]}
            rotation={[-0.33, 0, 0]}
            scale={[0.8, 1, 0.4]}
          >
            <sphereGeometry args={[0.063, 12, 8]} />
            <meshStandardMaterial color="#12110d" />
          </mesh>
        )}
        <mesh
          ref={mouth}
          position={[0, 0.77, 0.329]}
          rotation={[-0.3, 0, 0]}
          scale={
            appearance === "wide-mouth" ? [3, 1.3, 0.4] : [1.5, 0.38, 0.25]
          }
        >
          <sphereGeometry args={[0.08, 12, 8]} />
          <meshStandardMaterial color="#16130e" />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            ref={side === -1 ? arm : undefined}
            position={[side * 0.43, 0.53, 0]}
            rotation={[0, 0, side * 0.23]}
          >
            <capsuleGeometry args={[0.045, 0.48, 3, 8]} />
            <meshStandardMaterial color="#11100f" />
          </mesh>
        ))}
        {outfit?.hat && (
          <group position={[0, 1.38, 0]}>
            <mesh>
              <cylinderGeometry args={[0.11, 0.22, 0.32, 16]} />
              <meshStandardMaterial
                color={outfit.hat === "tin-hat" ? "#98978b" : "#687249"}
                map={wear.map}
                roughness={0.8}
                metalness={outfit.hat === "tin-hat" ? 0.45 : 0}
              />
            </mesh>
            <mesh
              position={[0, -0.12, outfit.hat === "tin-hat" ? 0 : 0.12]}
              scale={[1, 0.16, 1]}
            >
              <sphereGeometry args={[0.29, 16, 8]} />
              <meshStandardMaterial
                color={outfit.hat === "tin-hat" ? "#77796f" : "#424b2e"}
                map={wear.map}
                roughness={0.8}
              />
            </mesh>
          </group>
        )}
        {outfit?.glasses && (
          <group position={[0, 0.99, 0.27]} rotation={[-0.33, 0, 0]}>
            {[-0.13, 0.13].map((x) => (
              <mesh key={x} position={[x, 0, 0]}>
                <torusGeometry args={[0.085, 0.012, 6, 16]} />
                <meshStandardMaterial
                  color="#bbaa7a"
                  metalness={0.5}
                  roughness={0.6}
                />
              </mesh>
            ))}
            <mesh>
              <boxGeometry args={[0.1, 0.014, 0.014]} />
              <meshStandardMaterial color="#bbaa7a" />
            </mesh>
          </group>
        )}
        {(backpack || outfit?.backpack) && (
          <mesh position={[0, 0.65, -0.3]}>
            <boxGeometry args={[0.55, 0.63, 0.26]} />
            <meshStandardMaterial
              color="#776044"
              map={wear.map}
              bumpMap={wear.relief}
              bumpScale={0.004}
              roughness={0.9}
            />
          </mesh>
        )}
        {selfie && (
          <group position={[-0.45, 0.65, 0.05]} rotation={[0.2, 0, 0.65]}>
            <mesh position={[0, 0.4, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 0.85, 8]} />
              <meshStandardMaterial
                color="#444"
                metalness={0.8}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, 0.88, 0]}>
              <boxGeometry args={[0.22, 0.32, 0.045]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

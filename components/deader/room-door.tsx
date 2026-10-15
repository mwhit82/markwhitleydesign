"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Box } from "./environment";
import type { RoomMaterials } from "./room-materials";
import { useGame } from "@/lib/deader/store";
import { roomAudio } from "@/lib/deader/audio/room-audio";

export function RoomDoor({ materials: m }: { materials: RoomMaterials }) {
  const leaf = useRef<THREE.Group>(null),
    chain = useRef<THREE.Group>(null),
    knob = useRef<THREE.Group>(null);
  const amount = useRef(0);
  const { scene, gl } = useThree();
  const door = useGame((s) => s.room.door);
  useEffect(() => {
    if (door === "OPENING") roomAudio.play("open");
    if (door === "CLOSING") roomAudio.play("close");
  }, [door]);
  useFrame((_, dt) => {
    const s = useGame.getState();
    if (s.panel || (!s.focused || !!s.suspension)) return;
    const opening = s.room.door === "OPENING" || s.room.door === "OPEN";
    const before = amount.current;
    amount.current = THREE.MathUtils.clamp(
      before + ((opening ? 1 : -1) * Math.min(dt, 0.05)) / 1.3,
      0,
      1,
    );
    const t = amount.current,
      eased = t * t * (3 - 2 * t);
    if (leaf.current) leaf.current.rotation.y = eased * 1.45;
    if (chain.current) chain.current.rotation.z = eased * 1.35;
    if (knob.current) knob.current.rotation.z = -Math.sin(t * Math.PI) * 0.65;
    if (before !== t) {
      gl.shadowMap.needsUpdate = true;
      scene.traverse((o) => {
        if (o instanceof THREE.SpotLight) o.shadow.needsUpdate = true;
      });
    }
    if (t === 1 && s.room.door === "OPENING") s.doorEvent({ type: "opened" });
    if (
      t === 0 &&
      s.room.door === "CLOSING" &&
      s.room.night?.status !== "completed"
    )
      s.doorEvent({ type: "closed" });
  });
  return (
    <group userData={{ interaction: "Door" }}>
      <mesh
        position={[0.25, 1.4, -3.25]}
        visible={false}
        userData={{ interactionProxy: true }}
      >
        <planeGeometry args={[1.74, 2.76]} />
        <meshBasicMaterial />
      </mesh>
      {[-0.72, 1.22].map((x) => (
        <Box
          key={x}
          position={[x, 1.48, -3.43]}
          size={[0.15, 2.96, 0.18]}
          material={m.wood}
        />
      ))}
      <Box
        position={[0.25, 2.93, -3.43]}
        size={[2.1, 0.17, 0.18]}
        material={m.wood}
      />
      <group ref={leaf} position={[-0.62, 0, -3.49]}>
        <Box
          position={[0.87, 1.4, 0]}
          size={[1.74, 2.76, 0.13]}
          material={m.wood}
        />
        {[0.4, 1.32].map((x) =>
          [0.65, 1.92].map((y, i) => (
            <group key={`${x}-${y}`}>
              <Box
                position={[x, y, 0.085]}
                size={[0.69, i ? 1.22 : 0.83, 0.05]}
                material={m.dark}
              />
              <Box
                position={[x, y, 0.12]}
                size={[0.59, i ? 1.1 : 0.71, 0.055]}
                material={m.wood}
              />
            </group>
          )),
        )}
        {[0.5, 2.4].map((y) => (
          <Box
            key={y}
            position={[0.04, y, 0.14]}
            size={[0.09, 0.19, 0.025]}
            material={m.metal}
          />
        ))}
        <group ref={knob} position={[1.48, 1.23, 0.18]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.brass}>
            <cylinderGeometry args={[0.12, 0.12, 0.045, 20]} />
          </mesh>
          <mesh position={[0, 0, 0.12]} material={m.brass} castShadow>
            <sphereGeometry args={[0.13, 24, 16]} />
          </mesh>
          <Box
            position={[0, 0.06, 0.24]}
            size={[0.025, 0.08, 0.01]}
            material={m.dark}
          />
        </group>
        <mesh position={[0.87, 1.63, 0.17]} material={m.brass}>
          <torusGeometry args={[0.045, 0.018, 8, 16]} />
        </mesh>
        <mesh position={[0.87, 1.63, 0.17]} material={m.dark}>
          <circleGeometry args={[0.028, 16]} />
        </mesh>
      </group>
      <Box
        position={[1.69, 1.34, -3.49]}
        size={[0.16, 0.28, 0.06]}
        material={m.metal}
      />
      <group ref={chain} position={[1.66, 1.34, -3.406]}>
        {Array.from({ length: 13 }, (_, i) => (
          <mesh
            key={i}
            position={[
              -0.72 + i * 0.06,
              -0.11 - Math.sin((i / 12) * Math.PI) * 0.17 + i * 0.009,
              0.216 - i * 0.018,
            ]}
            rotation={[i % 2 ? Math.PI / 2 : 0, 0, 0.2]}
            scale={[1.3, 0.8, 1]}
            material={m.metal}
            castShadow
          >
            <torusGeometry args={[0.045, 0.012, 6, 12]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

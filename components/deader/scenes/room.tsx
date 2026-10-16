"use client";
import { useGame } from "@/lib/deader/store";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Box, Sign } from "../environment";
import { Visitors } from "../visitors";
import { Lounge } from "../lounge";
import { ScareFace } from "../scare-face";
import { RoomTV } from "../room-tv";
import { RoomController } from "../room-controller";
import { PlayerMirror, ReflectedPlayer } from "../player-reflection";
import { RoomDoor } from "../room-door";
import { Surveillance } from "../surveillance";
import { RoomAtmosphere, RoomReflection } from "../room-atmosphere";
import { useRoomMaterials, type RoomMaterials } from "../room-materials";

function Donut({ materials: m }: { materials: RoomMaterials }) {
  const fish = useRef<THREE.Group>(null);
  const time = useRef(0);
  const destination = useRef(new THREE.Vector3());
  useFrame(({ camera }, dt) => {
    const s = useGame.getState(),
      seq = s.room.survival;
    if (!fish.current || s.panel || (!s.focused || !!s.suspension)) return;
    time.current += Math.min(dt, 0.05);
    const trust = s.room.encounters.trust,
      t = time.current;
    const reduced =
      s.save.settings.reducedMotion ||
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    fish.current.scale.setScalar(1);
    fish.current.position.set(
      Math.sin(t * (trust <= 1 ? 2.8 : 0.6)) * (reduced ? 0.025 : 0.12),
      0,
      0,
    );
    fish.current.rotation.set(
      0,
      trust === 3
        ? Math.sin(t * 0.5) * 0.6
        : 1.1 + Math.sin(t * (trust === 1 ? 3 : 0.8)) * (reduced ? 0.05 : 0.3),
      trust <= 1 && !reduced ? Math.sin(t * 5) * 0.12 : 0,
    );
    if (
      s.room.night?.status === "completed" &&
      s.room.night.number === 3 &&
      s.room.night.endingSeconds >= 8
    )
      fish.current.rotation.z = 0.35;
    if (seq.phase === "donut") {
      const jump = Math.max(0, Math.min(1, (seq.elapsed - 1.3) / 1.2));
      if (!reduced && !s.save.settings.gentleScares) {
        camera.getWorldDirection(destination.current);
        destination.current.multiplyScalar(0.6).add(camera.position);
        destination.current.y -= 0.15;
        fish.current.parent!.worldToLocal(destination.current);
        fish.current.position.lerp(destination.current, jump * jump);
        fish.current.scale.setScalar(1 + jump * 2);
      }
    }
    fish.current.visible = !["blackout", "gameover"].includes(seq.phase);
  });
  return (
    <group position={[2.65, 1.54, -0.3]} userData={{ interaction: "Donut" }}>
      <mesh scale={[1, 0.9, 1]} material={m.glass}>
        <sphereGeometry args={[0.44, 32, 20, 0, Math.PI * 2, 0.72, 2.42]} />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.38, 0.3, 0.38, 24]} />
        <meshStandardMaterial
          color="#70866a"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.29, 0.023, 8, 32]} />
        <meshStandardMaterial
          color="#d6d6b7"
          transparent
          opacity={0.45}
          roughness={0.22}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.38, 24]} />
        <meshStandardMaterial
          color="#c7b87d"
          transparent
          opacity={0.13}
          roughness={0.2}
          depthWrite={false}
        />
      </mesh>
      <group ref={fish} rotation={[0, -0.4, 0]}>
        <mesh scale={[1.5, 1, 0.7]}>
          <sphereGeometry args={[0.13, 20, 12]} />
          <meshStandardMaterial
            color="#eaa323"
            roughness={0.35}
            metalness={0.12}
          />
        </mesh>
        <mesh position={[-0.23, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.12, 0.19, 3]} />
          <meshStandardMaterial color="#d37410" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.12, 0]} scale={[1, 1, 0.25]}>
          <coneGeometry args={[0.07, 0.1, 3]} />
          <meshStandardMaterial color="#d37410" />
        </mesh>
        <mesh position={[0.12, 0.04, 0.075]}>
          <sphereGeometry args={[0.024, 10, 6]} />
          <meshStandardMaterial color="#15120c" roughness={0.2} />
        </mesh>
        <mesh position={[0.127, 0.048, 0.092]}>
          <sphereGeometry args={[0.007, 6, 4]} />
          <meshBasicMaterial color="#fff0c1" />
        </mesh>
      </group>
      {Array.from({ length: 22 }, (_, i) => (
        <mesh
          key={i}
          position={[
            Math.sin(i * 2.4) * (0.16 + (i % 3) * 0.035),
            -0.33,
            Math.cos(i * 2.4) * (0.16 + (i % 3) * 0.035),
          ]}
          scale={[1, 0.65, 1]}
        >
          <sphereGeometry args={[0.045, 6, 4]} />
          <meshStandardMaterial color={i % 2 ? "#4b5140" : "#837455"} />
        </mesh>
      ))}
    </group>
  );
}
export default function Room() {
  const m = useRoomMaterials();
  return (
    <>
      <RoomAtmosphere materials={m} />
      <RoomReflection materials={m} />
      <RoomController />
      <ReflectedPlayer />
      <Visitors />
      <RoomDoor materials={m} />
      <Surveillance materials={m} />
      <group
        position={[-1.7, 0, -2.88]}
        rotation={[-0.12, 0, 0]}
        userData={{ interaction: "Vent" }}
      >
        {[-0.35, 0.35].map((x) => (
          <Box
            key={x}
            position={[x, 1.5, 0]}
            size={[0.08, 3, 0.09]}
            material={m.metal}
          />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i}>
            <Box
              position={[0, 0.22 + i * 0.36, 0]}
              size={[0.79, 0.065, 0.12]}
              material={m.wood}
            />
            {[-0.35, 0.35].map((x) => (
              <mesh
                key={x}
                position={[x, 0.22 + i * 0.36, 0.055]}
                material={m.brass}
              >
                <sphereGeometry args={[0.024, 6, 4]} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      <Box
        position={[-1.7, 3.22, -2.6]}
        size={[1.25, 0.12, 1.05]}
        material={m.metal}
      />
      <Box
        position={[-1.7, 3.14, -2.6]}
        size={[1.05, 0.02, 0.86]}
        material={m.dark}
      />
      {Array.from({ length: 7 }, (_, i) => (
        <Box
          key={i}
          position={[-2.12 + i * 0.14, 3.115, -2.6]}
          size={[0.04, 0.035, 0.86]}
          material={m.metal}
        />
      ))}
      <group
        position={[-3.64, 1.75, -0.75]}
        rotation={[0, Math.PI / 2, -0.025]}
      >
        <Box position={[0, 0, 0]} size={[1.16, 2.06, 0.12]} material={m.wood} />
        <PlayerMirror />
        {[-0.52, 0.52].map((x) => (
          <Box
            key={x}
            position={[x, 0, 0.08]}
            size={[0.06, 1.95, 0.055]}
            material={m.brass}
          />
        ))}
        {[-0.96, 0.96].map((y) => (
          <Box
            key={y}
            position={[0, y, 0.08]}
            size={[1.08, 0.06, 0.055]}
            material={m.brass}
          />
        ))}
      </group>
      {/* Open-legged desk rather than a solid block. Keep its existing collision footprint. */}
      {[-1.35, 0.45].map((z) =>
        [2.3, 3.25].map((x) => (
          <Box
            key={`${x}-${z}`}
            position={[x, 0.57, z]}
            size={[0.12, 1.14, 0.12]}
            material={m.wood}
          />
        )),
      )}
      <Box
        position={[2.8, 1.16, -0.4]}
        size={[1.45, 0.12, 2.55]}
        material={m.wood}
      />
      <Box
        position={[2.8, 0.94, -0.4]}
        size={[1.2, 0.3, 2.3]}
        material={m.wood}
      />
      <Box
        position={[2.15, 0.94, -0.4]}
        size={[0.045, 0.22, 1.2]}
        material={m.dark}
      />
      <Donut materials={m} />
      <RoomTV />
      <Lounge materials={m}/>
      <ScareFace/>
      <Box
        position={[-2.1, 0.38, 1.25]}
        size={[1.6, 0.76, 1.2]}
        material={m.wood}
      />
      <Box
        position={[-2.1, 0.8, 1.25]}
        size={[1.7, 0.08, 1.3]}
        material={m.wood}
      />
      <group
        position={[-2.1, 1.22, 1.05]}
        rotation={[-0.12, 0, 0]}
        userData={{ interaction: "CCTV" }}
      >
        <Box position={[0, 0, 0]} size={[1.23, 0.88, 0.55]} material={m.dark} />
        <Sign
          text={"CAM 01 — OFFICE\n[E] CONNECT"}
          position={[-0.04, 0.025, 0.282]}
          width={1.02}
          height={0.65}
          background="#101c17"
          colour="#94a68e"
        />
        {[0.28, 0.18].map((y) => (
          <mesh
            key={y}
            position={[0.56, -y, 0.295]}
            rotation={[Math.PI / 2, 0, 0]}
            material={m.metal}
          >
            <cylinderGeometry args={[0.025, 0.025, 0.04, 8]} />
          </mesh>
        ))}
        <mesh position={[-0.48, -0.37, 0.29]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshBasicMaterial color="#8daf61" />
        </mesh>
      </group>
      <pointLight
        position={[-2.1, 1.3, 1.6]}
        color="#8caf9a"
        intensity={1.6}
        distance={3}
      />
    </>
  );
}

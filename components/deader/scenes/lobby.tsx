"use client";
import { useVR } from "@/lib/deader/vr-state";
import { HourlyDisplay } from "../hourly-shop";
import { Sidekick } from "../sidekick";
import { Box, Sign } from "../environment";
import { Cone } from "../character";
import { Controller } from "../controllers";
import { useRoomMaterials } from "../room-materials";
import { LobbyAtmosphere } from "../lobby-atmosphere";
export default function Lobby() {
  const m = useRoomMaterials();
  const vr = useVR((s) => s.active);
  return (
    <>
      <LobbyAtmosphere materials={m} />
      {!vr && <Controller />}
      <Sidekick lobby />
      <HourlyDisplay/>
      <group
        position={[2.2, 0, -3.4]}
        userData={{ vrInteraction: "Learn to play", vrAim: [0, 1.35, 0] }}
      >
        <Box
          position={[0, 0.06, 0]}
          size={[0.8, 0.12, 0.65]}
          material={m.metal}
        />
        <Box
          position={[0, 0.64, 0]}
          size={[0.09, 1.2, 0.09]}
          material={m.metal}
        />
        <Box
          position={[0, 1.35, 0]}
          size={[0.85, 0.62, 0.08]}
          material={m.dark}
        />
        <Sign
          text={"LEARN TO PLAY\nGUIDED PRACTICE"}
          position={[0, 1.36, 0.052]}
          width={0.73}
          height={0.49}
          background="#152329"
          colour="#ffe4a0"
        />
      </group>
      <Sign
        aged
        text={"THE ANOMALOUS\nAFTER HOURS CLUB"}
        position={[0, 3.15, -4.85]}
        width={4.7}
        height={1}
      />
      <group userData={{ vrInteraction: "Start", vrAim: [0.55, 1.1, -4.5] }}>
        <Box
          position={[0, 1.35, -4.78]}
          size={[1.9, 2.7, 0.16]}
          material={m.metal}
        />
        <Box
          position={[0, 1.3, -4.65]}
          size={[1.55, 2.45, 0.1]}
          material={m.wood}
        />
        <Sign
          aged
          text="START"
          position={[0, 1.8, -4.57]}
          width={1.25}
          height={0.45}
          colour="#b4ed55"
        />
        <mesh position={[0.55, 1.1, -4.5]}>
          <sphereGeometry args={[0.09, 12, 8]} />
          <primitive object={m.brass} attach="material" />
        </mesh>
      </group>
      <group userData={{ vrInteraction: "Shop", vrAim: [-3.9, 0.55, -1] }}>
        <Box
          position={[-3.9, 0.55, -1]}
          size={[1.4, 1.1, 2.8]}
          material={m.wood}
        />
        <Box
          position={[-3.9, 1.14, -1]}
          size={[1.55, 0.12, 2.9]}
          material={m.wood}
        />
        <Sign
          aged
          text={"SUPPLY SHOP\nCOLOURS + SIDEKICKS"}
          position={[-3.85, 2.6, -2.5]}
          width={2}
          height={0.75}
        />
        {["#ffc928", "#8bdf26", "#f78fb9"].map((colour, i) => (
          <Cone
            key={colour}
            colour={colour}
            scale={0.45}
            position={[-3.9, 1.2, -1.9 + i * 0.8]}
            rotation={[0, 0.8, 0]}
          />
        ))}
      </group>
      <group userData={{ vrInteraction: "Customise", vrAim: [3.9, 0.3, -1] }}>
        <Box
          position={[3.9, 0.3, -1]}
          size={[1.4, 0.6, 2.8]}
          material={m.wood}
        />
        <Box
          position={[4.75, 1.9, -1]}
          size={[0.08, 2.7, 2]}
          material={m.mirror}
        />
        <Sign
          aged
          text={"DRESSING ROOM\nMAKE IT PERSONAL"}
          position={[3.7, 2.6, -2.5]}
          width={2.1}
          height={0.75}
        />
        <Cone
          colour="#8bdf26"
          position={[3.9, 0.62, -1]}
          rotation={[0, -0.6, 0]}
        />
      </group>
      <Sign
        aged
        text={"WELCOME, NIGHT SHIFT.\nTRY TO STAY YOURSELF."}
        position={[-2.6, 1.9, -4.82]}
        width={1.8}
        height={0.85}
        background="#736345"
        colour="#1b1914"
      />
      {/* Raised panelling, worn metal trim and hardware stay inside existing collision footprints. */}
      {[-0.68, 0.68].map((x) => (
        <Box
          key={x}
          position={[x, 1.3, -4.56]}
          size={[0.07, 2.4, 0.07]}
          material={m.wood}
        />
      ))}
      {[0.25, 1.25, 2.4].map((y) => (
        <Box
          key={y}
          position={[0, y, -4.56]}
          size={[1.4, 0.07, 0.07]}
          material={m.wood}
        />
      ))}
      {[0.55, 2.05].map((y) => (
        <Box
          key={y}
          position={[-0.73, y, -4.51]}
          size={[0.14, 0.22, 0.05]}
          material={m.metal}
        />
      ))}
      {[-1.95, -1, -0.05].map((z) => (
        <group key={z}>
          <Box
            position={[-3.18, 0.55, z]}
            size={[0.035, 0.8, 0.78]}
            material={m.dark}
          />
          <Box
            position={[-3.15, 0.55, z]}
            size={[0.025, 0.68, 0.65]}
            material={m.wood}
          />
          <Box
            position={[-3.12, 0.8, z]}
            size={[0.04, 0.035, 0.22]}
            material={m.brass}
          />
        </group>
      ))}
      {[-2.04, 0.04].map((z) => (
        <Box
          key={z}
          position={[4.68, 1.9, z]}
          size={[0.14, 2.85, 0.12]}
          material={m.wood}
        />
      ))}
      {[0.5, 3.3].map((y) => (
        <Box
          key={y}
          position={[4.68, y, -1]}
          size={[0.14, 0.12, 2.2]}
          material={m.wood}
        />
      ))}
      {[-3.85, 3.7].map((x) => (
        <group key={x}>
          <Box
            position={[x, 3.13, -2.5]}
            size={[1.8, 0.13, 0.27]}
            material={m.metal}
          />
          <mesh position={[x, 3.06, -2.5]}>
            <boxGeometry args={[1.5, 0.025, 0.17]} />
            <meshStandardMaterial
              color="#ffdfa0"
              emissive="#ffca88"
              emissiveIntensity={2}
            />
          </mesh>
        </group>
      ))}
      <Box
        position={[0, 0.006, 0]}
        size={[2.2, 0.025, 5.6]}
        material={m.dark}
      />
      {[-1.02, 1.02].map((x) => (
        <Box
          key={x}
          position={[x, 0.021, 0]}
          size={[0.035, 0.008, 5.5]}
          material={m.wood}
        />
      ))}
      <pointLight
        position={[-3.4, 2.7, -1]}
        color="#ffc278"
        intensity={9}
        distance={5}
      />
      <pointLight
        position={[3.4, 2.7, -1]}
        color="#a7c77e"
        intensity={8}
        distance={5}
      />
    </>
  );
}

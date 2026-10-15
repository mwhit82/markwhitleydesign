"use client";
import { Box, Sign } from "./environment";
import type { RoomMaterials } from "./room-materials";
/** Non-playable exterior set, shared by peephole and CCTV. No separate renderer. */
export function Surveillance({ materials: m }: { materials: RoomMaterials }) {
  return (
    <>
      <Box
        position={[0.25, -0.12, -5.7]}
        size={[5, 0.2, 4]}
        material={m.floor}
      />
      <Box
        position={[-2.35, 1.6, -7.4]}
        size={[0.2, 3.2, 7.4]}
        material={m.plaster}
      />
      <Box
        position={[2.85, 1.6, -7.4]}
        size={[0.2, 3.2, 7.4]}
        material={m.plaster}
      />
      <Box
        position={[0.25, 1.6, -11.1]}
        size={[5.4, 3.2, 0.2]}
        material={m.wood}
      />
      <Box
        position={[0.25, 3.25, -7.4]}
        size={[5.4, 0.15, 7.4]}
        material={m.dark}
      />
      {Array.from({ length: 8 }, (_, i) => (
        <Box
          key={i}
          position={[0.25, -0.85 + i * 0.05, -10.5 + i * 0.38]}
          size={[2, 0.2 + i * 0.1, 0.4]}
          material={m.wood}
        />
      ))}
      <Box
        position={[0.25, -1.05, -9.6]}
        size={[5, 0.2, 3]}
        material={m.floor}
      />
      {[-0.85, 1.35].map((x) => (
        <Box
          key={x}
          position={[x, 0.55, -9.2]}
          rotation={[-0.25, 0, 0]}
          size={[0.07, 0.07, 3.5]}
          material={m.metal}
        />
      ))}
      <pointLight
        layers-mask={2}
        position={[0.25, 1, -9]}
        color="#c6c9b9"
        intensity={15}
        distance={5}
      />
      <Sign
        text={"LEVEL 01\nKEEP THE DOOR CLOSED"}
        position={[0.25, 2, -11]}
        width={2.7}
        height={0.6}
      />
      <pointLight
        layers-mask={2}
        position={[0.25, 2.65, -5]}
        color="#d2c49d"
        intensity={14}
        distance={9}
      />
      <pointLight
        layers-mask={2}
        position={[0.25, 2.65, -9.5]}
        color="#9aa89f"
        intensity={9}
        distance={6}
      />
      <mesh position={[0.25, 3.1, -6]}>
        <boxGeometry args={[0.8, 0.04, 0.18]} />
        <meshBasicMaterial color="#c4c4aa" />
      </mesh>
      {/* Narrow sealed ventilation duct above the office ceiling. */}
      {[-2.25, -1.15].map((x) => (
        <Box
          key={x}
          position={[x, 3.7, -5]}
          size={[0.08, 1, 5.5]}
          material={m.metal}
        />
      ))}
      {[3.22, 4.18].map((y) => (
        <Box
          key={y}
          position={[-1.7, y, -5]}
          size={[1.1, 0.08, 5.5]}
          material={m.metal}
        />
      ))}
      <Box
        position={[-1.7, 3.7, -7.7]}
        size={[1.1, 1, 0.1]}
        material={m.dark}
      />
      {[-3, -4, -5, -6, -7].map((z) => (
        <group key={z}>
          <Box
            position={[-1.7, 4.1, z]}
            size={[1, 0.08, 0.05]}
            material={m.dark}
          />
          <Box
            position={[-2.19, 3.7, z]}
            size={[0.06, 0.9, 0.05]}
            material={m.dark}
          />
        </group>
      ))}
      <pointLight
        layers-mask={2}
        position={[-1.7, 3.7, -3]}
        intensity={3}
        distance={6}
        color="#bac9bb"
      />
    </>
  );
}

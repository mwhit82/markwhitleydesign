"use client";
import { useLightFlicker } from "./use-light-flicker";
import { Box } from "./environment";
import { Dust } from "./room-atmosphere";
import type { RoomMaterials } from "./room-materials";

export function LobbyAtmosphere({
  materials: m,
}: {
  materials: RoomMaterials;
}) {
  const flicker = useLightFlicker(110, 0);
  return (
    <>
      <color attach="background" args={["#17120e"]} />
      <fog attach="fog" args={["#211a13", 10, 24]} />
      <ambientLight intensity={0.35} color="#c8b18b" />
      <hemisphereLight args={["#c2b196", "#302018", 0.5]} />
      <spotLight
        ref={flicker.key}
        position={[0, 3.7, 1]}
        target-position={[0, 0, -1]}
        intensity={110}
        color="#ffd39b"
        angle={1.15}
        penumbra={0.8}
        distance={14}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
      />
      <pointLight
        position={[0, 3.3, -3.2]}
        intensity={13}
        distance={7}
        color="#ffbd73"
      />
      <Box position={[0, -0.11, 0]} size={[10, 0.2, 10]} material={m.floor} />
      <Box position={[0, 4, 0]} size={[10, 0.16, 10]} material={m.wood} />
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
          <Box position={[0, 2, -5]} size={[10, 4, 0.2]} material={m.plaster} />
          <Box
            position={[0, 0.48, -4.87]}
            size={[9.8, 0.96, 0.07]}
            material={m.wood}
          />
          {[0.12, 0.97, 3.8].map((y) => (
            <Box
              key={y}
              position={[0, y, -4.8]}
              size={[9.8, 0.1, 0.1]}
              material={m.wood}
            />
          ))}
          {[-4, -2, 0, 2, 4].map((x) => (
            <Box
              key={x}
              position={[x, 0.5, -4.8]}
              size={[0.055, 0.75, 0.07]}
              material={m.wood}
            />
          ))}
        </group>
      ))}
      {[-3.2, 1].map((z) => (
        <group key={z} position={[0, 3.75, z]}>
          <Box
            position={[0, 0.08, 0]}
            size={[1.6, 0.18, 0.5]}
            material={m.metal}
          />
          <mesh position={[0, -0.03, 0]}>
            <boxGeometry args={[1.35, 0.035, 0.32]} />
            <meshStandardMaterial
              ref={z === 1 ? flicker.bulb : undefined}
              color="#ffe2b0"
              emissive="#ffc880"
              emissiveIntensity={3}
            />
          </mesh>
          {[-0.55, 0, 0.55].map((x) => (
            <Box
              key={x}
              position={[x, -0.06, 0]}
              size={[0.025, 0.04, 0.4]}
              material={m.metal}
            />
          ))}
        </group>
      ))}
      <Dust />
    </>
  );
}

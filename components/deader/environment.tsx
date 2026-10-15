"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
export function Box({
  position,
  size,
  colour = "#382b20",
  material,
  ...rest
}: {
  position: [number, number, number];
  size: [number, number, number];
  colour?: string;
  material?: THREE.Material;
  rotation?: [number, number, number];
}) {
  return (
    <mesh
      position={position}
      {...rest}
      material={material}
      receiveShadow
      castShadow
    >
      <boxGeometry args={size} />
      {!material && <meshStandardMaterial color={colour} roughness={0.88} />}
    </mesh>
  );
}
// Canvas labels avoid a remote font dependency and are shared with the future GLB pipeline.
export function Sign({
  text,
  position,
  width = 2,
  height = 0.5,
  colour = "#e7cfa4",
  background = "#201d17",
  rotation,
  aged = false,
}: {
  text: string;
  aged?: boolean;
  position: [number, number, number];
  width?: number;
  height?: number;
  colour?: string;
  background?: string;
  rotation?: [number, number, number];
}) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 5;
    ctx.strokeRect(12, 12, 744, 232);
    ctx.fillStyle = colour;
    ctx.font = "bold 55px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = text.split("\n");
    lines.forEach((line, i) =>
      ctx.fillText(line, 384, 128 + (i - (lines.length - 1) / 2) * 68, 700),
    );
    if (aged) {
      for (let i = 0; i < 240; i++) {
        const x = (i * 137.3) % 768,
          y = (i * 79.7) % 256;
        ctx.fillStyle = i % 3 ? "rgba(15,11,7,.18)" : "rgba(201,184,146,.16)";
        ctx.fillRect(x, y, 1 + (i % 12), 1);
      }
      const edge = ctx.createLinearGradient(0, 0, 0, 256);
      edge.addColorStop(0, "rgba(20,12,4,.4)");
      edge.addColorStop(0.2, "rgba(20,12,4,0)");
      edge.addColorStop(0.75, "rgba(20,12,4,0)");
      edge.addColorStop(1, "rgba(20,12,4,.4)");
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, 768, 256);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, colour, background, aged]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}
export function Shell({ size = 5 }: { size?: number }) {
  return (
    <group>
      <color attach="background" args={["#15100b"]} />
      <fog attach="fog" args={["#15100b", 9, 23]} />
      <ambientLight intensity={0.65} color="#bca888" />
      <hemisphereLight args={["#b4a68d", "#302015", 0.65]} />
      <pointLight
        position={[0, 3.3, 0]}
        color="#ffb65d"
        intensity={32}
        distance={13}
        decay={2}
      />
      <spotLight
        position={[0, 3.7, 2]}
        target-position={[0, 0, -2]}
        color="#ffce89"
        intensity={40}
        angle={1}
        penumbra={0.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.001}
      />
      <Box
        position={[0, -0.12, 0]}
        size={[size * 2, 0.2, size * 2]}
        colour="#3b2a1d"
      />
      {Array.from({ length: Math.floor(size * 4) }, (_, i) => (
        <Box
          key={i}
          position={[-size + i * 0.5, -0.008, 0]}
          size={[0.012, 0.01, size * 2]}
          colour="#17130f"
        />
      ))}
      <Box
        position={[0, 2, -size]}
        size={[size * 2, 4, 0.2]}
        colour="#423322"
      />
      <Box
        position={[-size, 2, 0]}
        size={[0.2, 4, size * 2]}
        colour="#302a20"
      />
      <Box position={[size, 2, 0]} size={[0.2, 4, size * 2]} colour="#302a20" />
      <Box position={[0, 2, size]} size={[size * 2, 4, 0.2]} colour="#302a20" />
      <Box
        position={[0, 4, 0]}
        size={[size * 2, 0.15, size * 2]}
        colour="#201b15"
      />
      <mesh position={[0, 3.8, 0]}>
        <boxGeometry args={[1.1, 0.08, 0.35]} />
        <meshStandardMaterial
          color="#ffe2a6"
          emissive="#ffc279"
          emissiveIntensity={3}
        />
      </mesh>
      <Box
        position={[0, 0.15, -size + 0.15]}
        size={[size * 2, 0.25, 0.1]}
        colour="#1b1712"
      />
    </group>
  );
}

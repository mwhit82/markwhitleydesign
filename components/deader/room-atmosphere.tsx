"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/deader/store";
import { useLightFlicker } from "./use-light-flicker";
import { Box } from "./environment";
import type { RoomMaterials } from "./room-materials";

export function Dust() {
  const effects = useGame(
    (s) => s.save.settings.effects && s.save.settings.quality !== "low",
  );
  const particles = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const p = new Float32Array(48 * 3);
    for (let i = 0; i < 48; i++)
      p.set(
        [
          Math.sin(i * 8.23) * 1.2 - 0.45,
          0.65 + (i / 48) * 2.5,
          Math.cos(i * 3.7) * 1.4 - 0.8,
        ],
        i * 3,
      );
    return p;
  }, []);
  const reduced = useRef(false);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduced.current = query.matches;
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useFrame(({ clock }) => {
    if (
      particles.current &&
      !reduced.current &&
      !useGame.getState().save.settings.reducedMotion &&
      !useGame.getState().panel &&
      useGame.getState().focused
    ) {
      particles.current.rotation.y = Math.sin(clock.elapsedTime * 0.045) * 0.06;
      particles.current.position.y = Math.sin(clock.elapsedTime * 0.13) * 0.05;
    }
  });
  if (!effects) return null;
  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#e8c995"
        size={0.014}
        transparent
        opacity={0.22}
        depthWrite={false}
      />
    </points>
  );
}
function VentShadow() {
  const reduced = useRef(false);
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduced.current = q.matches;
    };
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  const mesh = useRef<THREE.Mesh>(null),
    time = useRef(0);
  const settings = useGame((s) => s.save.settings);
  useFrame((_, dt) => {
    const s = useGame.getState();
    if (!mesh.current) return;
    if (s.panel || (!s.focused || !!s.suspension)) return;
    time.current += Math.min(dt, 0.05);
    const phase = time.current % 75;
    const strength =
      phase > 38 && phase < 46
        ? Math.sin(((phase - 38) / 8) * Math.PI) * 0.08
        : 0;
    (mesh.current.material as THREE.MeshBasicMaterial).opacity =
      reduced.current || settings.reducedMotion ? 0 : strength;
    mesh.current.position.x = -2.1 + Math.sin(time.current * 0.15) * 0.25;
  });
  if (!settings.effects || settings.quality === "low") return null;
  return (
    <mesh ref={mesh} position={[-2.1, 1.8, -3.655]} rotation={[0, 0, 0.2]}>
      <planeGeometry args={[0.22, 2.4]} />
      <meshBasicMaterial
        color="#000000"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}
export function RoomAtmosphere({ materials: m }: { materials: RoomMaterials }) {
  const flicker = useLightFlicker(95, 9);
  return (
    <>
      <color attach="background" args={["#100e0b"]} />
      <fog attach="fog" args={["#17140f", 7, 19]} />
      <ambientLight intensity={0.22} color="#bba585" />
      <hemisphereLight args={["#bcaa8f", "#201911", 0.35]} />
      <spotLight
        ref={flicker.key}
        position={[-0.5, 3.13, -0.8]}
        target-position={[0.2, 0, -2]}
        intensity={95}
        color="#ffd299"
        angle={1.05}
        penumbra={0.85}
        distance={12}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-autoUpdate={false}
        shadow-needsUpdate={true}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
      />
      <pointLight
        ref={flicker.fill}
        position={[-0.5, 2.95, -0.8]}
        intensity={9}
        distance={7}
        color="#ffc47a"
      />
      <pointLight
        position={[2.4, 1.4, -0.4]}
        intensity={3}
        distance={4}
        color="#a7763e"
      />
      <Box position={[0, -0.11, 0]} size={[7.6, 0.2, 7.6]} material={m.floor} />
      <Box
        position={[-2.21, 1.65, -3.8]}
        size={[3.18, 3.3, 0.2]}
        material={m.plaster}
      />
      <Box
        position={[2.46, 1.65, -3.8]}
        size={[2.68, 3.3, 0.2]}
        material={m.plaster}
      />
      <Box
        position={[0.25, 3.075, -3.8]}
        size={[1.74, 0.45, 0.2]}
        material={m.plaster}
      />
      <Box
        position={[-3.8, 1.65, 0]}
        size={[0.2, 3.3, 7.6]}
        material={m.plaster}
      />
      <Box
        position={[3.8, 1.65, 0]}
        size={[0.2, 3.3, 7.6]}
        material={m.plaster}
      />
      <Box
        position={[0, 1.65, 3.8]}
        size={[7.6, 3.3, 0.2]}
        material={m.plaster}
      />
      <Box position={[0, 3.33, 0]} size={[7.6, 0.12, 7.6]} material={m.wood} />
      {[0.14, 3.15].map((y) => (
        <group key={y}>
          <Box
            position={[0, y, -3.67]}
            size={[7.4, 0.13, 0.12]}
            material={m.wood}
          />
          <Box
            position={[-3.67, y, 0]}
            size={[0.12, 0.13, 7.4]}
            material={m.wood}
          />
          <Box
            position={[3.67, y, 0]}
            size={[0.12, 0.13, 7.4]}
            material={m.wood}
          />
          <Box
            position={[0, y, 3.67]}
            size={[7.4, 0.13, 0.12]}
            material={m.wood}
          />
        </group>
      ))}
      <Box
        position={[-0.5, 3.19, -0.8]}
        size={[1.45, 0.15, 0.6]}
        material={m.metal}
      />
      <mesh position={[-0.5, 3.1, -0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.18, 0.36]} />
        <meshStandardMaterial
          ref={flicker.bulb}
          color="#ffe1aa"
          emissive="#ffd79c"
          emissiveIntensity={3}
          side={THREE.DoubleSide}
        />
      </mesh>
      {[-1, -0.5, 0].map((x) => (
        <Box
          key={x}
          position={[x, 3.075, -0.8]}
          size={[0.025, 0.025, 0.48]}
          material={m.metal}
        />
      ))}
      <mesh position={[-0.5, 1.9, -0.8]}>
        <coneGeometry args={[1.65, 2.35, 24, 1, true]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          vertexShader={`varying vec2 beamUv; varying vec3 worldPosition; varying vec3 worldNormal;
            void main(){ beamUv=uv; worldPosition=(modelMatrix*vec4(position,1.)).xyz;
            worldNormal=mat3(modelMatrix)*normal; gl_Position=projectionMatrix*viewMatrix*vec4(worldPosition,1.); }`}
          fragmentShader={`varying vec2 beamUv; varying vec3 worldPosition; varying vec3 worldNormal;
            void main(){ float edge=pow(abs(dot(normalize(worldNormal),normalize(cameraPosition-worldPosition))),3.);
            float fade=smoothstep(0.,.25,beamUv.y)*(1.-smoothstep(.8,1.,beamUv.y));
            gl_FragColor=vec4(1.,.78,.48,edge*fade*.022); }`}
        />
      </mesh>
      <Dust />
      <VentShadow />
    </>
  );
}

// A tiny cubemap is captured once per room entry. No ongoing reflection render pass.
export function RoomReflection({ materials: m }: { materials: RoomMaterials }) {
  const { gl, scene } = useThree();
  const target = useMemo(
    () =>
      new THREE.WebGLCubeRenderTarget(128, {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
      }),
    [],
  );
  const camera = useMemo(() => {
    const camera = new THREE.CubeCamera(0.1, 18, target);
    camera.position.set(-3.45, 1.75, -0.75);
    return camera;
  }, [target]);
  const frames = useRef(0);
  const generator = useMemo(() => new THREE.PMREMGenerator(gl), [gl]);
  const filtered = useRef<THREE.WebGLRenderTarget | null>(null);
  useFrame(() => {
    if (++frames.current !== 3) return;
    m.mirror.visible = false;
    try {
      camera.update(gl, scene);
    } finally {
      m.mirror.visible = true;
    }
    // Own the prefiltered target explicitly: this Three.js release does not attach
    // a disposal listener to automatically filtered render-target cubemaps.
    filtered.current = generator.fromCubemap(target.texture);
    for (const material of [m.mirror, m.glass, m.brass, m.metal]) {
      material.envMap = filtered.current.texture;
      material.needsUpdate = true;
    }
  });
  useEffect(
    () => () => {
      filtered.current?.dispose();
      generator.dispose();
      target.texture.dispose();
      target.dispose();
    },
    [target, generator],
  );
  return null;
}

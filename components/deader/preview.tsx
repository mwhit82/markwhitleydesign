"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useGame } from "@/lib/deader/store";
import { useVR } from "@/lib/deader/vr-state";
import { renderScale } from "@/lib/deader/presentation";
import type { Outfit } from "@/lib/deader/cosmetics";
import type { PetId } from "@/lib/deader/pets";
import { PetModel } from "./sidekick";
import { Cone } from "./character";
import styles from "./game.module.css";
export function Preview({
  colour,
  outfit,
  pet = false,
  petId,
}: {
  colour: string;
  outfit: Outfit;
  pet?: boolean;
  petId?: PetId;
}) {
  const scale = useGame((s) => renderScale(s.save.settings));
  const vr = useVR((s) => s.active);
  return (
    <div
      data-vr-preview={JSON.stringify({ colour, outfit, pet, petId })}
      className={styles.preview}
      aria-label="Rotating 3D outfit preview"
    >
      {!vr && (
        <Canvas
          dpr={[0.75, scale]}
          camera={{ position: [0, 1.2, 3.2], fov: 38 }}
        >
          <ambientLight intensity={1.5} />
          <directionalLight position={[3, 5, 4]} intensity={3} />
          <pointLight position={[-3, 2, -2]} intensity={12} color="#b6caba" />
          {pet ? (
            <PetModel id={petId} colour={colour} />
          ) : (
            <Cone colour={colour} outfit={outfit} />
          )}
          <OrbitControls
            target={[0, 0.8, 0]}
            autoRotate
            autoRotateSpeed={2}
            enablePan={false}
            enableZoom={false}
          />
        </Canvas>
      )}
    </div>
  );
}

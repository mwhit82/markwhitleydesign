"use client";
import { useGame } from "@/lib/deader/store";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MeshStandardMaterial, PointLight, SpotLight } from "three";

// A single brief voltage dip, with a long irregular gap. No extra render passes.
export function useLightFlicker(keyIntensity: number, fillIntensity: number) {
  const key = useRef<SpotLight>(null);
  const fill = useRef<PointLight>(null);
  const bulb = useRef<MeshStandardMaterial>(null);
  const reduced = useRef(true);
  const timer = useRef(6);
  const duration = 0.42;
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduced.current = query.matches;
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useFrame((_, dt) => {
    let brightness = 1;
    const s = useGame.getState();
    if (
      !reduced.current &&
      !s.save.settings.reducedFlashes &&
      !s.save.settings.reducedMotion &&
      !document.hidden &&
      !s.panel &&
      s.focused
    ) {
      timer.current -= Math.min(dt, 0.05);
      if (timer.current <= -duration) timer.current = 8 + Math.random() * 12;
      if (timer.current < 0) {
        brightness =
          1 - 0.38 * Math.sin((-timer.current / duration) * Math.PI) ** 2;
      }
    }
    const sequence = s.room.survival;
    if (
      s.scene === "room" &&
      ["tension", "lunge", "recovery"].includes(sequence.phase) &&
      !reduced.current &&
      !s.save.settings.reducedFlashes &&
      !s.save.settings.reducedMotion &&
      !s.save.settings.gentleScares
    ) {
      // One smooth dip/recovery, never a strobe or an increase above normal light.
      const envelope =
        sequence.phase === "tension"
          ? Math.min(1, sequence.elapsed / 1.1)
          : sequence.phase === "lunge"
            ? 1
            : Math.max(0, 1 - sequence.elapsed / 1.5);
      brightness = Math.min(brightness, 1 - envelope * 0.22);
    }
    if (key.current) key.current.intensity = keyIntensity * brightness;
    if (fill.current) fill.current.intensity = fillIntensity * brightness;
    if (bulb.current) bulb.current.emissiveIntensity = 3 * brightness;
  });
  return { key, fill, bulb };
}

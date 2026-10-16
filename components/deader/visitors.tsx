"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/deader/store";
import { visitorById, approachProgress } from "@/lib/deader/visitors";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { scareVariant, attackAmount } from "@/lib/deader/presentation";
import { Cone } from "./character";

export function Visitors() {
  const active = useGame((s) => s.room.encounters.active);
  const paused = useGame(
    (s) => !!s.panel || (!s.focused || !!s.suspension),
  );
  const survival = useGame((s) => s.room.survival);
  const group = useRef<THREE.Group>(null),
    lastStep = useRef(-1);
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
  const { scene, gl, camera } = useThree();
  const destination = useRef(new THREE.Vector3());
  const lungeTarget = useRef(new THREE.Vector3());
  const positioned = useRef<string | null>(null);
  useEffect(() => {
    // Simulation cadence is independent of CCTV's capped render rate.
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (!document.hidden)
        useGame.getState().tickVisitors((now - last) / 1000);
      last = now;
    }, 100);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    lastStep.current = -1;
    gl.shadowMap.needsUpdate = true;
    scene.traverse((o) => {
      if (o instanceof THREE.SpotLight) o.shadow.needsUpdate = true;
    });
  }, [active?.id, gl, scene]);
  useEffect(() => {
    if (active?.phase === "waiting") roomAudio.play("knock");
  }, [active?.phase, active?.id]);
  useFrame((_, dt) => {
    const s = useGame.getState(),
      e = s.room.encounters.active;
    if (!e || !group.current) return;
    const v = visitorById(e.visitor),
      p = e.phase === "approaching" ? approachProgress(e) : 1;
    let z = THREE.MathUtils.lerp(-10.5, -5.9, p),
      y = Math.min(0, -0.75 + p * 1.5);
    let yaw = 0;
    if (e.phase === "departing") {
      const t = Math.min(1, e.elapsed / 4);
      z =
        e.decision === "admit"
          ? THREE.MathUtils.lerp(-5.9, -2.6, t)
          : THREE.MathUtils.lerp(-5.9, -10.5, t);
      y = e.decision === "admit" ? 0 : Math.min(0, -0.75 + (1 - t) * 1.5);
      yaw = e.decision !== "admit" ? Math.PI : 0;
    }
    destination.current.set(0.25, y, z);
    const seq = s.room.survival;
    if (seq.phase !== "idle" && seq.kind === "anomaly") {
      destination.current.set(0.25, 0, s.room.door === "OPEN" ? -3.9 : -5.9);
      if (
        (seq.phase === "lunge" || seq.phase === "recovery") &&
        !s.save.settings.gentleScares &&
        !s.save.settings.reducedMotion &&
        !reduced.current
      ) {
        const t =
          seq.phase === "lunge"
            ? Math.min(1, seq.elapsed / 0.65)
            : Math.max(0, 1 - seq.elapsed / 1.5);
        camera.getWorldDirection(lungeTarget.current);
        lungeTarget.current.multiplyScalar(0.85).add(camera.position);
        lungeTarget.current.y = 0.65;
        destination.current.lerp(
          lungeTarget.current,
          attackAmount(scareVariant(e.visitor), t * 0.65),
        );
      }
    }
    if (seq.phase !== "idle" && seq.kind === "mistake") {
      const departure =
        seq.phase === "tension" ? seq.elapsed : 1.1 + seq.elapsed;
      destination.current.z = THREE.MathUtils.lerp(
        -5.9,
        -10.5,
        Math.min(1, departure / 2.6),
      );
    }
    if (seq.kind === "anomaly" && seq.phase !== "idle")
      yaw = Math.atan2(
        camera.position.x - destination.current.x,
        camera.position.z - destination.current.z,
      );
    if (positioned.current !== e.id) {
      group.current.position.copy(destination.current);
      positioned.current = e.id;
    } else if (!paused)
      group.current.position.lerp(
        destination.current,
        1 - Math.exp(-Math.min(dt, 0.1) * 18),
      );
    group.current.rotation.set(
      0,
      yaw,
      v.movement === "sway" &&
        !reduced.current &&
        !s.save.settings.reducedMotion
        ? Math.sin(e.elapsed * 3) * 0.17
        : 0,
    );
    const step = Math.floor(p * 18);
    if (!paused && e.phase === "approaching" && step !== lastStep.current) {
      roomAudio.play("step");
      lastStep.current = step;
    }
    if (!paused && e.phase === "departing" && e.decision === "admit") {
      gl.shadowMap.needsUpdate = true;
      scene.traverse((o) => {
        if (o instanceof THREE.SpotLight) o.shadow.needsUpdate = true;
      });
    }
  });
  if (!active) return null;
  const v = visitorById(active.visitor);
  const walking =
    !paused &&
    (active.phase === "departing" ||
      (active.phase === "approaching" &&
        (v.movement !== "stop-start" ||
          ((active.elapsed / 22) * 8) % 1 < 0.5)));
  return (
    <group ref={group}>
      <Cone
        animation={
          survival.phase === "lunge"
            ? "attack"
            : survival.phase === "recovery"
              ? "react"
              : walking
                ? active.decision !== "admit"
                  ? "turn"
                  : "walk"
                : active.asked.length
                  ? "talk"
                  : active.phase === "waiting"
                    ? "knock"
                    : v.movement === "sway"
                      ? "suspicious"
                      : "idle"
        }
        animationKey={`${active.id}:${active.asked.length}`}
        colour={v.colour}
        appearance={v.appearance}
        walking={walking}
        paused={paused}
      />
    </group>
  );
}

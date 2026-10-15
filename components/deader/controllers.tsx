"use client";
import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gameInput } from "@/lib/deader/input";
import { useGame } from "@/lib/deader/store";
import { cosmetics, move, LOBBY_OBSTACLES } from "@/lib/deader/game";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { Cone } from "./character";

/** Lobby input and follow camera; first-person room controls live separately. */
export function Controller() {
  const { camera } = useThree();
  const player = useRef<THREE.Group>(null);
  const pos = useRef({ x: 0, z: 0.8 });
  const keys = useRef(gameInput.keys);
  const [walking, setWalking] = useState(false);
  const paused = useGame((s) => !!s.panel || (!s.focused || !!s.suspension));
  const stride = useRef(0);
  const outfit = useGame((s) => s.save.outfit);
  const colour = useGame(
    (s) => cosmetics.find((c) => c.id === s.save.equipped)!.colour,
  );
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const s = useGame.getState();
      if (/^(KeyW|KeyA|KeyS|KeyD|Arrow)/.test(e.code) && !s.panel)
        e.preventDefault();
      keys.current.add(e.code);
      if (e.code === "KeyE" && !e.repeat && s.prompt && !s.panel && s.focused && !s.suspension)
        s.open(
          s.prompt === "Shop"
            ? "shop"
            : s.prompt === "Customise"
              ? "wardrobe"
              : "start",
        );
      if (e.code === "Escape" && !e.repeat) s.escape();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => {
      gameInput.reset();
      useGame.setState({ focused: false });
    };
    const focus = () => useGame.setState({ focused: true });
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
    };
  }, []);
  const target = useRef(new THREE.Vector3()),
    eye = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const s = useGame.getState(),
      enabled = !s.panel && s.focused && !s.suspension;
    if (!enabled) gameInput.reset();
    const { x, z } = enabled ? gameInput.movement() : { x: 0, z: 0 };
    const old = pos.current;
    pos.current = move(pos.current, x, z, dt, 5, LOBBY_OBSTACLES);
    stride.current += Math.hypot(pos.current.x - old.x, pos.current.z - old.z);
    if (stride.current > 1) {
      roomAudio.play("plastic");
      stride.current = 0;
    }
    const p = pos.current;
    if (walking !== !!(x || z)) setWalking(!!(x || z));
    if (player.current) {
      player.current.position.set(p.x, 0, p.z);
      if (x || z) {
        const a = Math.atan2(x, z) - player.current.rotation.y;
        player.current.rotation.y +=
          Math.atan2(Math.sin(a), Math.cos(a)) * Math.min(1, dt * 12);
      }
    }
    eye.current.set(
      THREE.MathUtils.clamp(p.x, -4.6, 4.6),
      2.5,
      Math.min(4.65, p.z + 3.8),
    );
    camera.position.lerp(eye.current, 1 - Math.exp(-dt * 7));
    target.current.set(p.x, 1.35, p.z - 0.5);
    camera.lookAt(target.current);
    // Reset FOV after room inspection/CCTV before returning to the lobby.
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== 55) {
      camera.fov = 55;
      camera.updateProjectionMatrix();
    }
    const prompt =
      Math.hypot(p.x + 3.9, p.z + 1) < 2
        ? "Shop"
        : Math.hypot(p.x - 3.9, p.z + 1) < 2
          ? "Customise"
          : Math.hypot(p.x, p.z + 3.7) < 2
            ? "Start"
            : null;
    if (s.prompt !== prompt) useGame.setState({ prompt });
  });
  return (
    <group ref={player}>
      <Cone colour={colour} walking={walking} outfit={outfit} paused={paused} />
    </group>
  );
}

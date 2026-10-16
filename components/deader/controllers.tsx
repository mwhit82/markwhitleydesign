"use client";
import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gameInput } from "@/lib/deader/input";
import { useGame } from "@/lib/deader/store";
import { cosmetics, move, LOBBY_OBSTACLES } from "@/lib/deader/game";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { Cone } from "./character";

export const lobbyPlayerPose = {x:0,z:.8,yaw:0,walking:false};

function isSidekick(object:THREE.Object3D):boolean { for(let o:THREE.Object3D|null=object;o;o=o.parent)if(o.userData.sidekick)return true;return false; }

/** Lobby input and follow camera; first-person room controls live separately. */
export function Controller() {
  const { camera, gl, scene } = useThree();
  const orbit = useRef({yaw:0,pitch:.3});
  const dragging = useRef(false);
  const ray = useRef(new THREE.Raycaster());
  const player = useRef<THREE.Group>(null);
  const pos = useRef({ x: 0, z: 0.8 });
  const [walking, setWalking] = useState(false);
  const paused = useGame((s) => !!s.panel || (!s.focused || !!s.suspension));
  const stride = useRef(0);
  const lookPractice = useRef(0);
  const outfit = useGame((s) => s.save.outfit);
  const colour = useGame(
    (s) => cosmetics.find((c) => c.id === s.save.equipped)!.colour,
  );
  useEffect(() => {
    const mouseDown = (e: MouseEvent) => { const s=useGame.getState(); if(e.button===0&&!s.touchActive&&!s.panel&&!s.suspension)dragging.current=true; };
    const mouseUp = () => {dragging.current=false;};
    const mouseMove = (e: MouseEvent) => {const s=useGame.getState();if(!dragging.current||s.touchActive||s.panel||s.suspension||!s.focused)return;lookPractice.current+=Math.abs(e.movementX)+Math.abs(e.movementY);if(lookPractice.current>15)s.tutorialAdvance("look");orbit.current.yaw-=e.movementX*.005*s.save.settings.sensitivity;orbit.current.pitch=THREE.MathUtils.clamp(orbit.current.pitch+e.movementY*.005*s.save.settings.sensitivity,.1,.85);};
    gl.domElement.addEventListener('mousedown',mouseDown);window.addEventListener('mouseup',mouseUp);window.addEventListener('mousemove',mouseMove);
    const unsubscribe=useGame.subscribe((s,p)=>{if(s.panel!==p.panel||s.suspension!==p.suspension){dragging.current=false;gameInput.reset();}});
    const down = (e: KeyboardEvent) => {
      const s = useGame.getState();
      if (/^(KeyW|KeyA|KeyS|KeyD|Arrow)/.test(e.code) && !s.panel)
        e.preventDefault();
      gameInput.keyDown(e.code, e.repeat, !s.panel && !s.suspension && s.focused);
      if (e.code === "KeyE" && !e.repeat && s.prompt && !s.panel && s.focused && !s.suspension)
        s.interactLobby();
      if (e.code === "Escape" && !e.repeat) s.escape();
    };
    const up = (e: KeyboardEvent) => gameInput.keyUp(e.code);
    const blur = () => {
      gameInput.reset(); dragging.current=false;
      useGame.setState({ focused: false });
    };
    const focus = () => useGame.setState({ focused: true });
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    return () => {
      unsubscribe(); gl.domElement.removeEventListener("mousedown",mouseDown);window.removeEventListener("mouseup",mouseUp);window.removeEventListener("mousemove",mouseMove);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
    };
  }, [gl]);
  const target = useRef(new THREE.Vector3()),
    eye = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const s = useGame.getState(),
      enabled = !s.panel && s.focused && !s.suspension;
    if (!enabled) gameInput.reset();
    const { x, z } = enabled ? gameInput.movement() : { x: 0, z: 0 };
    const swipe=gameInput.consumeLook();
    orbit.current.yaw-=swipe.x*.005*s.save.settings.touchSensitivity;
    orbit.current.pitch=THREE.MathUtils.clamp(orbit.current.pitch+swipe.y*.005*s.save.settings.touchSensitivity,.1,.85);
    const yaw=orbit.current.yaw;
    const worldX=x*Math.cos(yaw)+z*Math.sin(yaw),worldZ=-x*Math.sin(yaw)+z*Math.cos(yaw);
    const old = pos.current;
    pos.current = move(pos.current, worldX, worldZ, dt, 5, LOBBY_OBSTACLES);
    stride.current += Math.hypot(pos.current.x - old.x, pos.current.z - old.z);
    if (stride.current > 1) {
      roomAudio.play("plastic");
      stride.current = 0;
    }
    const p = pos.current;
    Object.assign(lobbyPlayerPose,{x:p.x,z:p.z,yaw:player.current?.rotation.y??0,walking:!!(x||z)});
    if(Math.hypot(p.x-old.x,p.z-old.z)>.005)s.tutorialAdvance("move");
    if(s.tutorial==="look") { lookPractice.current+=Math.abs(swipe.x)+Math.abs(swipe.y); if(lookPractice.current>15)s.tutorialAdvance("look"); } else lookPractice.current=0;
    if (walking !== !!(x || z)) setWalking(!!(x || z));
    if (player.current) {
      player.current.position.set(p.x, 0, p.z);
      if (x || z) {
        const a = Math.atan2(worldX, worldZ) - player.current.rotation.y;
        player.current.rotation.y +=
          Math.atan2(Math.sin(a), Math.cos(a)) * Math.min(1, dt * 12);
      }
    }
    target.current.set(p.x,1.15,p.z);
    eye.current.set(p.x+Math.sin(yaw)*3.8*Math.cos(orbit.current.pitch),1.15+Math.sin(orbit.current.pitch)*3.8,p.z+Math.cos(yaw)*3.8*Math.cos(orbit.current.pitch));
    eye.current.x=THREE.MathUtils.clamp(eye.current.x,-4.65,4.65);
    eye.current.z=THREE.MathUtils.clamp(eye.current.z,-4.65,4.65);
    const direction=eye.current.clone().sub(target.current),distance=direction.length();
    ray.current.set(target.current,direction.normalize());ray.current.far=distance;
    const hit=ray.current.intersectObjects(scene.children,true).find(h=>h.object instanceof THREE.Mesh&&!h.object.material.transparent&&!player.current?.getObjectById(h.object.id)&&!isSidekick(h.object));
    if(hit)eye.current.copy(target.current).addScaledVector(direction,Math.max(.5,hit.distance-.2));
    camera.position.copy(eye.current);
    camera.lookAt(target.current);
    // Reset FOV after room inspection/CCTV before returning to the lobby.
    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = s.touchActive && camera.aspect < 1 ? 77 : 55;
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
    const prompt =
      Math.hypot(p.x-2.2,p.z+3.4)<1.7 ? "Learn to play" :
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

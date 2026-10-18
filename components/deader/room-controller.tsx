"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { moveInRooms } from "@/lib/deader/lounge";
import { TV_POSITION, LOUNGE_TV_POSITION } from "@/lib/deader/tv";
import { gameInput } from "@/lib/deader/input";
import { useGame } from "@/lib/deader/store";

import { FEEDS, type RoomView } from "@/lib/deader/room";
import { renderScale } from "@/lib/deader/presentation";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { roomPlayerPose } from "./player-reflection";

const targets: Record<string, RoomView> = {
  "Watch TV": "tv",
  "Watch lounge TV": "lounge-tv",
  Door: "door",
  "CCTV": "console",
  Donut: "donut",
  Vent: "vent",
};
export function interactRoom() {
  const s = useGame.getState();
  if (
    s.panel ||
    (!s.focused || !!s.suspension) ||
    s.room.survival.phase !== "idle" ||
    s.room.night?.status === "completed" || !!s.room.judgement ||
    s.room.view !== "explore" ||
    !s.prompt
  )
    return;
  if(s.prompt==="Take gun"){s.collectWeapon();return;}
  if(s.prompt==="Put gun back"){s.returnWeapon();return;}
  const view = targets[s.prompt];
  if (view) {
    roomAudio.unlock();
    roomAudio.play("switch");
    s.roomView(view);
    // Inspect first on both keyboard and touch; stepping back reveals door actions.
    if (view === "door") useGame.getState().doorEvent({ type: "inspect" });
  }
}
export function RoomController() {
  const { camera, gl, scene, setFrameloop, setDpr, invalidate } = useThree();
  const view = useGame((s) => s.room.view);
  const resolution = useGame((s) => s.save.settings.resolution);
  const quality = useGame((s) => s.save.settings.quality);
  const mirrorCheck=process.env.NODE_ENV==='development'&&useGame.getState().room.night?.duration===60&&useGame.getState().rehearsal==='armed-mirror';
  const pos = useRef(mirrorCheck?{x:-2,z:-.75}:{ x: 0, z: 3.2 });
  const angles = useRef({ yaw: mirrorCheck?Math.PI/2:0, pitch: mirrorCheck?-.12:0 });
  const dragging = useRef(false);
  const clickStart = useRef<{x:number;y:number}|null>(null);
  const reduced = useRef(false);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const centre = useMemo(() => new THREE.Vector2(), []);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const rotation = useMemo(() => new THREE.Quaternion(), []);
  const dummy = useMemo(() => new THREE.PerspectiveCamera(), []);
  const lastView = useRef(view);
  const motionTime = useRef(0),
    stepDistance = useRef(0);
  useEffect(() => {
    // The selected feed uses the existing renderer, at 15 Hz and <= 720px wide.
    if (view !== "cctv" && view !== "arcade") return;
    setDpr(Math.min(1, 720 / Math.max(gl.domElement.clientWidth, 1)));
    setFrameloop("demand");
    const id = window.setInterval(() => invalidate(), 1000 / 15);
    return () => {
      clearInterval(id);
      setDpr(
        Math.min(
          devicePixelRatio,
          renderScale(useGame.getState().save.settings),
        ),
      );
      setFrameloop("always");
    };
  }, [view, quality, resolution, setDpr, setFrameloop, invalidate, gl]);
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => {
      reduced.current = q.matches;
    };
    preference();
    q.addEventListener("change", preference);
    const blur = () => {
      gameInput.reset();
      dragging.current = false;
      roomAudio.silence();
      useGame.setState({ focused: false });
    };
    const focus = () => useGame.setState({ focused: true });
    const visibility = () => (document.hidden ? blur() : focus());
    const down = (e: KeyboardEvent) => {
      const s = useGame.getState();
      if (
        (e.target as HTMLElement)?.matches("input,select,textarea") &&
        e.code !== "Escape"
      )
        return;
      if (
        /^(KeyW|KeyA|KeyS|KeyD|Arrow)/.test(e.code) &&
        s.room.view === "explore" &&
        !s.panel
      )
        e.preventDefault();
      gameInput.keyDown(e.code, e.repeat, !s.panel && !s.suspension && s.focused && s.room.view === "explore");
      if (e.code === "KeyE" && !e.repeat) interactRoom();
      if (e.code === "Escape" && !e.repeat) s.escape();
    };
    const up = (e: KeyboardEvent) => gameInput.keyUp(e.code);
    const mouse = (e: MouseEvent) => {
      const s = useGame.getState();
      if (
        s.touchActive || s.panel ||
        s.room.view !== "explore" ||
        s.room.survival.phase !== "idle" ||
        s.room.night?.status === "completed" || !!s.room.judgement ||
        (!s.focused || !!s.suspension) ||
        !(document.pointerLockElement === gl.domElement || dragging.current)
      )
        return;
      angles.current.yaw =
        THREE.MathUtils.euclideanModulo(
          angles.current.yaw -
            e.movementX * 0.0025 * s.save.settings.sensitivity +
            Math.PI,
          Math.PI * 2,
        ) - Math.PI;
      angles.current.pitch = THREE.MathUtils.clamp(
        angles.current.pitch -
          e.movementY * 0.0025 * s.save.settings.sensitivity,
        -1.15,
        1.15,
      );
    };
    const press = (e: MouseEvent) => {
      const s = useGame.getState();
      if (
        s.touchActive || s.suspension ||
        e.button !== 0 ||
        s.panel ||
        s.room.view !== "explore" ||
        s.room.survival.phase !== "idle" ||
        s.room.night?.status === "completed" || !!s.room.judgement
      )
        return;
      roomAudio.unlock();
      if(s.room.weapon.collected && document.pointerLockElement===gl.domElement){window.dispatchEvent(new Event("anomalous-fire"));return;}
      if (s.prompt) {
        interactRoom();
        return;
      }
      dragging.current = true;
      clickStart.current={x:e.clientX,y:e.clientY};
      try {
        gl.domElement.requestPointerLock?.()?.catch(() => {});
      } catch {}
    };
    const unsubscribe = useGame.subscribe((state, previous) => {
      if (state.room.view !== previous.room.view || state.panel !== previous.panel || state.suspension !== previous.suspension) { dragging.current = false; gameInput.reset(); }
    });
    let wasLocked = false;
    const lockChange = () => {
      const locked = document.pointerLockElement === gl.domElement;
      const s = useGame.getState();
      if (
        wasLocked &&
        !locked &&
        !s.panel &&
        s.room.view === "explore" &&
        s.room.survival.phase === "idle" &&
        s.room.night?.status !== "completed" && !s.room.judgement
      )
        s.open("pause");
      wasLocked = locked;
    };
    document.addEventListener("pointerlockchange", lockChange);
    const release = (e:MouseEvent) => {
      if(dragging.current&&clickStart.current&&Math.hypot(e.clientX-clickStart.current.x,e.clientY-clickStart.current.y)<5&&!document.pointerLockElement)window.dispatchEvent(new Event("anomalous-fire"));
      clickStart.current=null;dragging.current=false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", mouse);
    window.addEventListener("mouseup", release);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visibility);
    gl.domElement.addEventListener("mousedown", press);
    return () => {
      unsubscribe();
      document.removeEventListener("pointerlockchange", lockChange);
      q.removeEventListener("change", preference);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", mouse);
      window.removeEventListener("mouseup", release);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", visibility);
      gl.domElement.removeEventListener("mousedown", press);
      if (document.pointerLockElement) document.exitPointerLock();
      camera.layers.disable(1);
      roomAudio.silence();
    };
  }, [gl, camera]);
  useFrame((_, dt) => {
    const s = useGame.getState();
    const r = s.room;
    if (s.panel || (!s.focused || !!s.suspension)) {
      gameInput.reset();
      return;
    }
    const enabled =
      !s.panel &&
      r.view === "explore" &&
      s.focused && !s.suspension &&
      !r.judgement &&
      r.survival.phase === "idle" &&
      r.night?.status !== "completed";
    if (!enabled) gameInput.reset();
    const { x, z } = enabled ? gameInput.movement() : { x: 0, z: 0 };
    const a = angles.current;
    const touchLook = gameInput.consumeLook();
    if (enabled) {
      a.yaw = THREE.MathUtils.euclideanModulo(a.yaw - touchLook.x * 0.005 * s.save.settings.touchSensitivity + Math.PI, Math.PI * 2) - Math.PI;
      a.pitch = THREE.MathUtils.clamp(a.pitch - touchLook.y * 0.005 * s.save.settings.touchSensitivity, -1.15, 1.15);
    }
    const beforeX = pos.current.x,
      beforeZ = pos.current.z;
    pos.current = moveInRooms(
      pos.current,
      x * Math.cos(a.yaw) + z * Math.sin(a.yaw),
      -x * Math.sin(a.yaw) + z * Math.cos(a.yaw),
      dt,
      r.door === "OPEN",
    );
    const travelled = Math.hypot(
      pos.current.x - beforeX,
      pos.current.z - beforeZ,
    );
    Object.assign(roomPlayerPose, { x: pos.current.x, z: pos.current.z, yaw: a.yaw, walking: enabled && travelled > .0001 });
    stepDistance.current += travelled;
    if (stepDistance.current > 0.95) {
      roomAudio.play("step");
      stepDistance.current = 0;
    }
    motionTime.current += Math.min(dt, 0.05);
    // Exterior practicals illuminate surveillance views without washing out the office.
    if (r.view === "inspect" || (r.view === "cctv" && r.feed > 0))
      camera.layers.enable(1);
    else camera.layers.disable(1);
    let fov = 55;
    if (
      r.survival.phase !== "idle" &&
      r.survival.kind === "anomaly" &&
      ["tension", "lunge", "recovery"].includes(r.survival.phase)
    ) {
      eye.set(pos.current.x, 1.6, pos.current.z);
      dummy.position.copy(eye);
      dummy.lookAt(0.25, 1, -3.8);
      rotation.copy(dummy.quaternion);
      if (
        r.survival.phase === "lunge" &&
        !reduced.current &&
        !s.save.settings.reducedMotion &&
        !s.save.settings.gentleScares
      ) {
        eye.x += Math.sin(r.survival.elapsed * 37) * 0.025;
        eye.y += Math.sin(r.survival.elapsed * 29) * 0.015;
      }
    } else if (["donut", "blackout", "gameover"].includes(r.survival.phase)) {
      eye.set(pos.current.x, 1.6, pos.current.z);
      dummy.position.copy(eye);
      dummy.lookAt(2.65, 1.54, -0.3);
      rotation.copy(dummy.quaternion);
    } else if (
      r.night?.status === "completed" &&
      r.night.number === 3 &&
      r.night.endingSeconds >= 8
    ) {
      eye.set(pos.current.x, 1.6, pos.current.z);
      dummy.position.copy(eye);
      dummy.lookAt(2.65, 1.54, -0.3);
      rotation.copy(dummy.quaternion);
    } else if (r.view === "tv" || r.view === "lounge-tv") {
      const lounge = r.view === "lounge-tv";
      eye.set(lounge ? 0 : 1.4, 1.8, lounge ? 8.6 : -.65);
      dummy.position.copy(eye);
      dummy.lookAt(new THREE.Vector3(...(lounge ? LOUNGE_TV_POSITION : TV_POSITION)));
      rotation.copy(dummy.quaternion);
      fov = 55;
    } else if (r.view === "cctv") {
      const feed = FEEDS[r.feed];
      eye.fromArray(feed.position);
      look.fromArray(feed.target);
      dummy.position.copy(eye);
      dummy.lookAt(look);
      rotation.copy(dummy.quaternion);
      fov = 62;
    } else if (r.view === "inspect") {
      eye.set(0.25, 1.63, -3.94);
      dummy.position.copy(eye);
      dummy.lookAt(0.25, 0.85, -6);
      rotation.copy(dummy.quaternion);
      fov = 40;
    } else {
      eye.set(pos.current.x, 1.6, pos.current.z);
      if (
        enabled &&
        s.save.settings.effects &&
        !reduced.current &&
        !s.save.settings.reducedMotion
      )
        eye.y +=
          Math.sin(motionTime.current * (travelled > 0 ? 8 : 1.6)) *
          (travelled > 0 ? 0.008 : 0.003);
      rotation.setFromEuler(new THREE.Euler(a.pitch, a.yaw, 0, "YXZ"));
    }
    const snap =
      reduced.current ||
      s.save.settings.reducedMotion ||
      r.view === "cctv" ||
      lastView.current === "cctv";
    const alpha = snap ? 1 : 1 - Math.exp(-Math.min(dt, 0.05) * 12);
    camera.position.lerp(eye, alpha);
    // Direct finger tracking avoids the delayed, floating feel of mouse-style smoothing.
    const directTouchLook = s.touchActive && enabled && lastView.current === "explore";
    camera.quaternion.slerp(rotation, directTouchLook ? 1 : alpha);
    if (camera instanceof THREE.PerspectiveCamera) {
      // Keep enough horizontal context for visitor clues on an upright phone.
      if (s.touchActive && camera.aspect < 1) {
        fov = Math.min(85, THREE.MathUtils.radToDeg(2 * Math.atan(
          Math.tan(THREE.MathUtils.degToRad(fov / 2)) / Math.max(.65, camera.aspect),
        )));
      }
      camera.fov = THREE.MathUtils.lerp(camera.fov, fov, alpha);
      camera.updateProjectionMatrix();
    }
    lastView.current = r.view;
    let prompt: string | null = null;
    if (enabled) {
      ray.setFromCamera(centre, camera);
      ray.far = 3.2;
      const hits = ray.intersectObjects(scene.children, true);
      const hit = hits.find(
        (h) =>
          !h.object.userData.firstPersonWeapon &&
          h.object instanceof THREE.Mesh &&
          (h.object.visible || h.object.userData.interactionProxy) &&
          !(
            h.object.material instanceof THREE.Material &&
            h.object.material.transparent
          ),
      );
      let object: THREE.Object3D | null = hit?.object ?? null;
      while (object) {
        if (object.userData.interaction) {
          prompt = object.userData.interaction;
          break;
        }
        object = object.parent;
      }
    }
    if (prompt !== s.prompt) useGame.setState({ prompt });
  }, -1);
  return null;
}

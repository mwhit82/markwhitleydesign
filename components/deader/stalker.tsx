"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/deader/store";
import { useVR } from "@/lib/deader/vr-state";
import {
  stalkerGaze,
  stalkerCueKey,
  STALKER_CAMERA,
  STALKER_ROOM,
} from "@/lib/deader/stalker";
import { feedHealth } from "@/lib/deader/vr-feed";
import { spatial } from "./vr/spatial";
import { createCharacterWear } from "./character-wear";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { roomPlayerPose } from "./player-reflection";

/** One bounded model, visible through the existing cameras; no additional renderer. */
export function Stalker() {
  const root = useRef<THREE.Group>(null),
    body = useRef<THREE.Group>(null),
    last = useRef(""),
    appeared = useRef(new Set<string>()),
    run = useRef<unknown>(null);
  const wear = useMemo(createCharacterWear, []);
  const scratch = useMemo(
    () => ({
      eye: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      normal: new THREE.Vector3(),
      face: new THREE.Vector3(),
      offset: new THREE.Vector3(),
      ray: new THREE.Raycaster(),
      time: 0,
    }),
    [],
  );
  const reduced = useRef(false);
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reduced.current = q.matches;
    };
    sync();
    q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);
  useEffect(
    () => () => {
      wear.map.dispose();
      wear.relief.dispose();
    },
    [wear],
  );
  useFrame(({ camera, gl, scene }, delta) => {
    if (!root.current || !body.current) return;
    const s = useGame.getState(),
      r = s.room,
      k = r.stalker,
      vr = useVR.getState().active;
    const onCamera = k.phase === "camera" || k.phase === "retreat",
      inRoom = k.phase === "room" || k.phase === "dismiss";
    root.current.visible =
      (onCamera || inRoom) && !r.judgement && r.night?.status === "running";
    const reducedMotion = reduced.current || s.save.settings.reducedMotion;
    const anchor = onCamera
      ? STALKER_CAMERA[k.feed]
      : STALKER_ROOM[Math.max(0, k.anchor)];
    root.current.position.fromArray(anchor.p);
    root.current.rotation.set(0, anchor.yaw, 0);
    // A compact silhouette fits the vent; room sightings remain full-size.
    root.current.scale.setScalar(onCamera && k.feed === 1 ? 0.42 : 0.82);
    const layer = onCamera ? 4 : 0;
    root.current.traverse((o) => o.layers.set(layer));
    const retreat =
      k.phase === "retreat" || k.phase === "dismiss"
        ? Math.min(1, k.elapsed / 0.7)
        : 0;
    body.current.rotation.z = anchor.roll;
    body.current.position.set(
      reducedMotion ? 0 : anchor.retreat[0] * retreat,
      reducedMotion ? 0 : anchor.retreat[1] * retreat,
      reducedMotion ? 0 : anchor.retreat[2] * retreat,
    );
    body.current.position.y += reducedMotion
      ? 0
      : Math.sin(k.elapsed * 1.5) * 0.012;
    body.current.scale.setScalar(reducedMotion ? 1 : 1 - retreat * 0.15);
    root.current.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const m = o.material as THREE.MeshStandardMaterial;
        m.opacity = 1 - retreat;
        m.transparent = retreat > 0;
      }
    });
    const cue = `${k.shift}:${k.index}:${k.phase}`;
    if (cue !== last.current) {
      last.current = cue;
      if (k.phase === "retreat" || k.phase === "dismiss")
        roomAudio.stalkerScrape(anchor.p[0], anchor.p[2], roomPlayerPose);
    }
    scratch.time += delta;
    if (scratch.time < 0.1) return;
    scratch.time = 0;
    const active =
      !s.panel &&
      !s.suspension &&
      s.focused &&
      !s.tutorial &&
      !r.judgement &&
      r.night?.status === "running";
    let seen = false,
      gaze = false,
      chosen = -1;
    if (active) {
      seen =
        onCamera &&
        r.view === "cctv" &&
        r.feed === k.feed &&
        (!vr ||
          (!feedHealth.failed &&
            spatial.lastFeed === r.feed &&
            performance.now() - spatial.lastFeedAt < 500));
      if (r.view === "explore") {
        const head = vr ? gl.xr.getCamera() : camera;
        head.getWorldPosition(scratch.eye);
        head.getWorldDirection(scratch.direction);
        chosen = STALKER_ROOM.findIndex((a) => {
          scratch.offset.set(a.p[0], a.p[1] + 0.5, a.p[2]).sub(scratch.eye);
          return (
            scratch.offset.length() >= 2 &&
            (Math.sin(a.yaw)*(scratch.eye.x-a.p[0])+Math.cos(a.yaw)*(scratch.eye.z-a.p[2])) > .2 &&
            scratch.offset.clone().normalize().dot(scratch.direction) <
              Math.cos(Math.PI / 4)
          );
        });
        if (k.phase === "room") {
          root.current.updateMatrixWorld(true);
          scratch.face
            .set(0, 1.02, 0.255)
            .applyMatrix4(body.current.matrixWorld);
          scratch.offset.copy(scratch.face).sub(scratch.eye);
          scratch.ray.set(scratch.eye, scratch.offset.clone().normalize());
          scratch.ray.far = scratch.offset.length();
          const blocked = scratch.ray
            .intersectObjects(scene.children, true)
            .some((hit) => {
              if (!(hit.object instanceof THREE.Mesh)) return false;
              let p: THREE.Object3D | null = hit.object;
              while (p) {
                if (
                  !p.visible ||
                  p === root.current ||
                  p.userData.vrUI ||
                  p.userData.vrHand ||
                  p.userData.firstPersonWeapon ||
                  p.userData.ignoreBullet
                )
                  return false;
                p = p.parent;
              }
              const m = hit.object.material;
              return !(m instanceof THREE.Material && m.transparent);
            });
          scratch.normal.set(0,0,1).transformDirection(body.current.matrixWorld);
          gaze = stalkerGaze(scratch.direction, scratch.offset, !blocked, scratch.normal);
        }
      }
    }
    if (run.current !== s.session) {
      appeared.current.clear();
      run.current = s.session;
    }
    const appearance = stalkerCueKey(k, seen);
    if (active && appearance && !appeared.current.has(appearance)) {
      appeared.current.add(appearance);
      roomAudio.stalkerAppear(
        inRoom
          ? { x: anchor.p[0], z: anchor.p[2], listener: roomPlayerPose }
          : undefined,
      );
    }
    const old = r.stalkerSight;
    if (old.camera !== seen || old.gaze !== gaze || old.anchor !== chosen)
      useGame.setState({
        room: {
          ...useGame.getState().room,
          stalkerSight: { camera: seen, gaze, anchor: chosen },
        },
      });
    if (process.env.NODE_ENV === "development")
      gl.domElement.dataset.stalker = JSON.stringify({
        phase: k.phase,
        feed: k.feed,
        anchor: k.anchor,
        seen,
        gaze,
      });
  });
  return (
    <group ref={root} visible={false} userData={{ shotTarget: "stalker" }}>
      <group ref={body}>
        <mesh position={[0, 0.9, 0]}>
          <coneGeometry args={[0.4, 1.12, 24]} />
          <meshStandardMaterial
            color="#d8b522"
            map={wear.map}
            bumpMap={wear.relief}
            bumpScale={0.013}
            roughness={0.65}
          />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * 0.135, 1.02, 0.21]} scale={[1, 1.2, 0.4]}>
              <sphereGeometry args={[0.1, 12, 8]} />
              <meshStandardMaterial color="#d2cdb2" roughness={0.7} />
            </mesh>
            <mesh position={[side * 0.135, 1.02, 0.255]} scale={[1, 1.2, 0.35]}>
              <sphereGeometry args={[0.071, 12, 8]} />
              <meshStandardMaterial
                color="#a61020"
                emissive="#3a0206"
                roughness={0.5}
              />
            </mesh>
            <mesh
              position={[side * 0.3, 0.65, 0]}
              rotation={[0, 0, side * -0.8]}
            >
              <capsuleGeometry args={[0.035, 0.85, 3, 8]} />
              <meshStandardMaterial color="#11100e" roughness={0.8} />
            </mesh>
            <mesh
              position={[side * 0.16, 0.24, 0]}
              rotation={[0, 0, side * 0.2]}
            >
              <capsuleGeometry args={[0.04, 0.55, 3, 8]} />
              <meshStandardMaterial color="#11100e" roughness={0.8} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.63, 0.3]} scale={[1, 1.6, 0.35]}>
          <sphereGeometry args={[0.19, 12, 8]} />
          <meshStandardMaterial color="#080707" roughness={0.8} />
        </mesh>
        {[-0.11, 0, 0.11].map((x, i) => (
          <mesh key={x} position={[x, 0.65, 0.37]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.055, i === 1 ? 0.28 : 0.22, 8]} />
            <meshStandardMaterial color="#d7d0b6" roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

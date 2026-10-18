"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { XR, XROrigin, createXRStore } from "@react-three/xr";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/deader/store";
import { useVR, vrPose } from "@/lib/deader/vr-state";
import {
  vrAxes,
  vrDelta,
  rotateOrigin,
  validVRFloor,
  validVRTeleport,
} from "@/lib/deader/vr";
import {
  move,
  LOBBY_OBSTACLES,
  ROOM_OBSTACLES,
  ROOM_CLOSED_OBSTACLES,
} from "@/lib/deader/game";
import { moveInRooms, SEATS } from "@/lib/deader/lounge";
import { gameInput } from "@/lib/deader/input";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { roomPlayerPose } from "../player-reflection";
import { lobbyPlayerPose } from "../controllers";
import { interactRoom } from "../room-controller";
import { GunModel } from "../weapon";
import { VRPanel, VRFeed } from "./screens";
export const xrStore = createXRStore({
  controller: false,
  hand: false,
  gaze: false,
  screenInput: false,
  transientPointer: false,
  emulate: false,
  offerSession: false,
  enterGrantedSession: false,
  frameRate: (rates) =>
    Array.from(rates).includes(72)
      ? 72
      : rates.length
        ? Math.min(...Array.from(rates))
        : false,
  foveation: 1,
  frameBufferScaling: 0.8,
});
export const trackedHands = {
  left: new THREE.Matrix4(),
  right: new THREE.Matrix4(),
  leftVisible: false,
  rightVisible: false,
};
function reset() {
  gameInput.reset();
  window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
}
export default function VRRuntime({ children }: { children: ReactNode }) {
  const active = useVR((s) => s.active);
  const { gl } = useThree();
  useEffect(() => {
    useVR.setState({ ready: true });
    let clean = () => {};
    const unsubscribe = xrStore.subscribe((state, previous) => {
      if (state.session === previous.session) return;
      clean();
      reset();
      useVR.setState({ active: !!state.session, error: null });
      if (!state.session) {
        useGame.setState({ focused: true, suspension: "interrupted" });
        return;
      }
      const session = state.session;
      const interrupted = () => {
        reset();
        roomAudio.silence();
        if (session.visibilityState !== "visible")
          useGame.setState({ focused: false, suspension: "interrupted" });
        else useGame.setState({ focused: true });
      };
      const sources = (event: XRInputSourcesChangeEvent) => {
        reset();
        if (event.removed.length)
          useGame.setState({ suspension: "interrupted" });
      };
      session.addEventListener("visibilitychange", interrupted);
      session.addEventListener("inputsourceschange", sources);
      if (document.pointerLockElement) document.exitPointerLock();
      useGame.setState({ focused: true, suspension: null });
      clean = () => {
        session.removeEventListener("visibilitychange", interrupted);
        session.removeEventListener("inputsourceschange", sources);
      };
    });
    return () => {
      clean();
      unsubscribe();
      void xrStore
        .getState()
        .session?.end()
        .catch(() => {});
      useVR.setState({ ready: false, active: false });
    };
  }, [gl]);
  return (
    <XR store={xrStore}>
      {children}
      {active && (
        <>
          <Rig />
          <VRPanel />
          <VRFeed />
        </>
      )}
    </XR>
  );
}
function Rig() {
  const { gl, scene } = useThree();
  const rig = useRef<THREE.Group>(null),
    left = useRef<THREE.Group>(null),
    right = useRef<THREE.Group>(null),
    leftRay = useRef<THREE.Group>(null),
    rightRay = useRef<THREE.Group>(null),
    gun = useRef<THREE.Group>(null),
    fade = useRef<THREE.Mesh>(null),
    marker = useRef<THREE.Mesh>(null);
  const scratch = useRef({
    head: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    q: new THREE.Quaternion(),
    m: new THREE.Matrix4(),
    ray: new THREE.Raycaster(),
    last: "",
    snap: false,
    buttons: new Map<string, boolean>(),
    blocked: true,
    recenter: -1,
    lastPanel: "",
    blockedUntil: 0,
    lookYaw: NaN,
    frames: [] as number[],
  });
  const equipped = useGame((s) => s.room.weapon.collected);
  useEffect(() => {
    const old = gl.shadowMap.enabled;
    gl.shadowMap.enabled = false;
    const interact = () => interactRoom();
    window.addEventListener("anomalous-vr-interact", interact);
    return () => {
      window.removeEventListener("anomalous-vr-interact", interact);
      gl.shadowMap.enabled = old;
      reset();
    };
  }, [gl]);
  useFrame((_, rawDt, frame) => {
    if (!rig.current || !frame) return;
    const a = scratch.current,
      s = useGame.getState(),
      r = s.room,
      prefs = s.save.settings.vr,
      dt = vrDelta(rawDt),
      session = gl.xr.getSession(),
      space = gl.xr.getReferenceSpace();
    if (!session || !space) return;
    const key = s.scene + ":" + r.encounters.runId;
    const camera = gl.xr.getCamera();
    camera.getWorldPosition(a.head);
    camera.getWorldDirection(a.direction);
    if (a.last !== key) {
      rig.current.position.set(0, 0, s.scene === "lobby" ? 0.8 : 3.2);
      rig.current.rotation.set(0, 0, 0);
      a.last = key;
      a.recenter = -1;
      a.blocked = true;
    }
    if (a.recenter !== useVR.getState().recenter) {
      const viewer = frame.getViewerPose(space);
      if (viewer) {
        rig.current.position.y = prefs.seated
          ? 1.6 - viewer.transform.position.y
          : 0;
        a.recenter = useVR.getState().recenter;
      }
    }
    const panelKey = [
      s.panel,
      r.view,
      s.suspension,
      !!r.judgement,
      r.night?.status,
    ].join(":");
    if (a.lastPanel !== panelKey) {
      a.lastPanel = panelKey;
      a.blocked = true;
      reset();
    }
    const paused =
      !!s.panel ||
      !!s.suspension ||
      !s.focused ||
      session.visibilityState !== "visible";
    const canMove =
      !paused &&
      (s.scene === "lobby" ||
        (r.view === "explore" &&
          !r.judgement &&
          r.survival.phase === "idle" &&
          (r.night?.status === "running" || !!s.tutorial)));
    const sources = Array.from(session.inputSources).filter(
      (v) => v.gamepad && v.handedness !== "none",
    );
    const neutral = sources.every(
      (v) =>
        v.gamepad!.axes.every((n) => Math.abs(n) < 0.2) &&
        v.gamepad!.buttons.every((b) => !b.pressed),
    );
    if (neutral) a.blocked = false;
    if (paused) {
      a.blocked = true;
      reset();
    }
    const l = sources.find((v) => v.handedness === "left"),
      rr = sources.find((v) => v.handedness === "right");
    const axes = (v: XRInputSource | undefined) =>
      vrAxes(v?.gamepad?.axes[2] ?? 0, v?.gamepad?.axes[3] ?? 0);
    const walk = canMove && !a.blocked ? axes(l) : { x: 0, z: 0 },
      turn = canMove && !a.blocked ? axes(rr).x : 0;
    const yaw = Math.atan2(-a.direction.x, -a.direction.z);
    let angle = 0;
    if (prefs.turning === "smooth")
      angle = ((-turn * prefs.turnSpeed * Math.PI) / 180) * dt;
    else {
      if (Math.abs(turn) > 0.65 && !a.snap) {
        angle = (-Math.sign(turn) * Math.PI) / 6;
        a.snap = true;
      }
      if (Math.abs(turn) < 0.2) a.snap = false;
    }
    if (angle) {
      const p = rotateOrigin(rig.current.position, a.head, angle);
      rig.current.position.x = p.x;
      rig.current.position.z = p.z;
      rig.current.rotation.y += angle;
    }
    const obstacles =
      s.scene === "lobby"
        ? LOBBY_OBSTACLES
        : [
            ...(r.door === "OPEN" ? ROOM_OBSTACLES : ROOM_CLOSED_OBSTACLES),
            ...SEATS.map((p) => ({ ...p, hx: 0.42, hz: 0.38 })),
          ];
    const valid = (p: { x: number; z: number }) =>
      validVRFloor(p, s.scene, obstacles);
    const advance = (
      p: { x: number; z: number },
      x: number,
      z: number,
      t: number,
    ) =>
      s.scene === "room"
        ? moveInRooms(p, x, z, t, r.door === "OPEN")
        : move(p, x, z, t, 5, LOBBY_OBSTACLES);
    let travelled = 0;
    if (prefs.movement === "smooth" && (walk.x || walk.z)) {
      const next = advance(
        a.head,
        walk.x * Math.cos(yaw) + walk.z * Math.sin(yaw),
        -walk.x * Math.sin(yaw) + walk.z * Math.cos(yaw),
        (dt * prefs.walkSpeed) / 2.7,
      );
      travelled = Math.hypot(next.x - a.head.x, next.z - a.head.z);
      rig.current.position.x += next.x - a.head.x;
      rig.current.position.z += next.z - a.head.z;
    }
    rig.current.updateMatrixWorld(true);
    camera.getWorldPosition(a.head);
    Object.assign(vrPose, {
      x: a.head.x,
      y: a.head.y,
      z: a.head.z,
      yaw,
      walking: travelled > 0.001,
    });
    Object.assign(roomPlayerPose, vrPose);
    Object.assign(lobbyPlayerPose, vrPose);
    if (travelled > 0.001) s.tutorialAdvance("move");
    if (
      s.tutorial === "look" &&
      Number.isFinite(a.lookYaw) &&
      Math.abs(yaw - a.lookYaw) > 0.1
    )
      s.tutorialAdvance("look");
    if (s.tutorial !== "look" || !Number.isFinite(a.lookYaw)) a.lookYaw = yaw;
    if (s.scene === "lobby") {
      const p = a.head,
        prompt =
          Math.hypot(p.x - 2.2, p.z + 3.4) < 1.7
            ? "Learn to play"
            : Math.hypot(p.x + 3.9, p.z + 1) < 2
              ? "Shop"
              : Math.hypot(p.x - 3.9, p.z + 1) < 2
                ? "Customise"
                : Math.hypot(p.x, p.z + 3.7) < 2
                  ? "Start"
                  : null;
      if (prompt !== s.prompt) useGame.setState({ prompt });
    }
    const dominant = prefs.leftHanded ? "left" : "right";
    trackedHands.leftVisible = trackedHands.rightVisible = false;
    let interaction: string | null = null;
    if (marker.current) marker.current.visible = false;
    for (const source of sources) {
      const hand = source.handedness as "left" | "right",
        group = hand === "left" ? left.current : right.current;
      const pose = frame.getPose(
          source.gripSpace ?? source.targetRaySpace,
          space,
        ),
        target = frame.getPose(source.targetRaySpace, space);
      if (!pose || !target || !group) continue;
      a.m.fromArray(pose.transform.matrix).premultiply(rig.current.matrixWorld);
      group.matrix.copy(a.m);
      group.matrix.decompose(group.position, group.quaternion, group.scale);
      group.visible = true;
      trackedHands[hand].copy(a.m);
      trackedHands[hand === "left" ? "leftVisible" : "rightVisible"] = true;
      a.m
        .fromArray(target.transform.matrix)
        .premultiply(rig.current.matrixWorld);
      a.ray.ray.origin.setFromMatrixPosition(a.m);
      a.ray.ray.direction.set(0, 0, -1).transformDirection(a.m);
      a.ray.far = 6;
      const hits = a.ray.intersectObjects(scene.children, true).filter((h) => {
        let o: THREE.Object3D | null = h.object;
        while (o) {
          if (
            (!o.visible && !o.userData.interactionProxy) ||
            o.userData.vrHand ||
            o.userData.ignoreBullet
          )
            return false;
          o = o.parent;
        }
        return h.object instanceof THREE.Mesh;
      });
      const ui = hits.find((h) => h.object.userData.vrAction);
      const pointer = hand === "left" ? leftRay.current : rightRay.current;
      if (pointer) {
        a.m.decompose(pointer.position, pointer.quaternion, pointer.scale);
        pointer.visible = true;
        const distance = ui?.distance ?? hits[0]?.distance ?? 2;
        const beam = pointer.children[0],
          dot = pointer.children[1] as THREE.Mesh;
        beam.position.z = -distance / 2;
        beam.scale.z = distance;
        dot.position.z = -distance;
        dot.visible = !!ui;
        (dot.material as THREE.MeshBasicMaterial).color.set(
          ui ? "#ffffff" : "#81929b",
        );
      }

      const down = (index: number) => {
        const pressed = source.gamepad!.buttons[index]?.pressed ?? false,
          key = hand + index,
          edge = pressed && !a.buttons.get(key);
        a.buttons.set(key, pressed);
        return edge;
      };
      const trigger = down(0),
        grip = down(1),
        primary = down(4),
        menu = down(5);
      if (menu && session.visibilityState === "visible") {
        reset();
        if (s.suspension) useGame.setState({ suspension: null, focused: true });
        else s.escape();
      }
      if ((trigger || primary) && ui && session.visibilityState === "visible") {
        (ui.object.userData.vrAction as () => void)();
        a.blockedUntil = performance.now() + 250;
        continue;
      }
      if (paused || a.blocked) continue;
      if (r.view === "arcade" && hand === dominant) {
        window.dispatchEvent(
          new KeyboardEvent(
            source.gamepad!.buttons[0]?.pressed ||
              source.gamepad!.buttons[4]?.pressed
              ? "keydown"
              : "keyup",
            { code: "Space", repeat: false },
          ),
        );
        continue;
      }
      if (s.scene === "lobby") {
        if ((trigger || grip) && s.prompt) s.interactLobby();
        continue;
      }
      const hit = hits.find((h) => !h.object.userData.vrUI);
      let o: THREE.Object3D | null = hit?.object ?? null;
      if (hit && hit.distance < 2.5)
        while (o) {
          if (o.userData.interaction) {
            interaction = o.userData.interaction;
            break;
          }
          o = o.parent;
        }
      if (
        interaction &&
        hand === dominant &&
        !s.panel &&
        r.view === "explore"
      ) {
        useGame.setState({ prompt: interaction });
        if (
          (interaction === "Take gun" ? grip : trigger || grip) &&
          (!r.weapon.collected || grip || interaction === "Put gun back")
        ) {
          interactRoom();
          a.blockedUntil = performance.now() + 250;
          continue;
        }
      }
      if (hand === dominant && r.weapon.collected && gun.current) {
        gun.current.position.copy(group.position);
        gun.current.quaternion.copy(group.quaternion);
        gun.current.translateZ(-0.04);
        gun.current.rotateX(-0.12 + (r.weapon.cooldown > 0.3 ? 0.08 : 0));
        const support = dominant === "right" ? left.current : right.current;
        if (
          support &&
          support.visible &&
          support.position.distanceTo(group.position) < 0.25
        ) {
          support.position.copy(
            new THREE.Vector3(-0.05, -0.03, -0.08)
              .applyQuaternion(group.quaternion)
              .add(group.position),
          );
          support.quaternion.copy(group.quaternion);
        }
        if (
          trigger &&
          !ui &&
          performance.now() > a.blockedUntil &&
          r.view === "explore"
        ) {
          gun.current.updateMatrixWorld(true);
          a.ray.ray.origin
            .set(0, 0, -0.23)
            .applyMatrix4(gun.current.matrixWorld);
          a.ray.ray.direction
            .set(0, 0, -1)
            .applyQuaternion(gun.current.quaternion);
          a.ray.far = 20;
          const shotOrigin = a.ray.ray.origin.clone();
          // First test from the hand to the muzzle: a barrel poked through a wall cannot bypass it.
          a.ray.ray.origin.copy(group.position);
          a.ray.ray.direction.copy(shotOrigin).sub(group.position).normalize();
          a.ray.far = group.position.distanceTo(shotOrigin);
          const obstructed = a.ray
            .intersectObjects(scene.children, true)
            .some((h) => {
              if (!(h.object instanceof THREE.Mesh)) return false;
              let o: THREE.Object3D | null = h.object;
              while (o) {
                if (
                  !o.visible ||
                  o.userData.ignoreBullet ||
                  o.userData.vrHand ||
                  o.userData.vrUI
                )
                  return false;
                o = o.parent;
              }
              return true;
            });
          a.ray.ray.origin.copy(shotOrigin);
          a.ray.ray.direction
            .set(0, 0, -1)
            .applyQuaternion(gun.current.quaternion);
          a.ray.far = 20;
          const hit = a.ray.intersectObjects(scene.children, true).find((h) => {
            if (!(h.object instanceof THREE.Mesh)) return false;
            let p: THREE.Object3D | null = h.object;
            while (p) {
              if (
                !p.visible ||
                p.userData.ignoreBullet ||
                p.userData.sidekick ||
                p.userData.vrUI ||
                p.userData.vrHand
              )
                return false;
              p = p.parent;
            }
            const m = Array.isArray(h.object.material)
              ? h.object.material[0]
              : h.object.material;
            return !m.transparent;
          });
          let target: string | null = null,
            p: THREE.Object3D | null = hit?.object ?? null;
          while (p) {
            if (p.userData.shotTarget) {
              target = p.userData.shotTarget;
              break;
            }
            p = p.parent;
          }
          if (s.fireWeapon(obstructed ? null : target)) {
            roomAudio.unlock();
            roomAudio.play("shot");
          }
        }
      }
    }
    if (leftRay.current) leftRay.current.visible = trackedHands.leftVisible;
    if (rightRay.current) rightRay.current.visible = trackedHands.rightVisible;
    if (left.current) left.current.visible = trackedHands.leftVisible;
    if (right.current) right.current.visible = trackedHands.rightVisible;
    if (gun.current)
      gun.current.visible =
        equipped &&
        s.scene === "room" &&
        canMove &&
        trackedHands[dominant === "left" ? "leftVisible" : "rightVisible"];
    if (s.scene === "room" && !interaction && s.prompt)
      useGame.setState({ prompt: null });
    // Teleport uses the left controller ray, but only destinations reachable through collision-free floor steps.
    if (
      prefs.movement === "teleport" &&
      canMove &&
      !a.blocked &&
      l &&
      Math.abs(l.gamepad!.axes[3] ?? 0) > 0.5
    ) {
      const pose = frame.getPose(l.targetRaySpace, space);
      if (pose) {
        a.m
          .fromArray(pose.transform.matrix)
          .premultiply(rig.current.matrixWorld);
        const from = new THREE.Vector3().setFromMatrixPosition(a.m),
          dir = new THREE.Vector3(0, 0, -1).transformDirection(a.m);
        const t = -from.y / dir.y;
        if (t > 0 && t < 5) {
          const dest = from.clone().addScaledVector(dir, t);
          if (validVRTeleport(a.head, dest, valid)) {
            if (marker.current) {
              marker.current.visible = true;
              marker.current.position.set(dest.x, 0.03, dest.z);
            }
            if (l.gamepad!.buttons[0]?.pressed) {
              rig.current.position.x += dest.x - a.head.x;
              rig.current.position.z += dest.z - a.head.z;
              a.blocked = true;
            }
          }
        }
      }
    }
    if (fade.current) {
      fade.current.position.copy(a.head);
      camera.getWorldQuaternion(fade.current.quaternion);
      fade.current.translateZ(-0.13);
      const blocked = !validVRFloor(a.head, s.scene, obstacles, 0);
      fade.current.visible =
        blocked ||
        (prefs.vignette &&
          canMove &&
          (travelled > 0.001 || Math.abs(turn) > 0.1));
      const material = fade.current.material as THREE.ShaderMaterial;
      material.uniforms.blocked.value = blocked ? 1 : 0;
    }
    if (process.env.NODE_ENV === "development") {
      a.frames.push(rawDt * 1000);
      if (a.frames.length > 300) a.frames.shift();
      gl.domElement.dataset.vrStats = JSON.stringify({
        frames: a.frames.length,
        p95Ms:
          [...a.frames].sort((x, y) => x - y)[
            Math.floor(a.frames.length * 0.95)
          ] ?? 0,
        meanMs: a.frames.reduce((x, y) => x + y, 0) / a.frames.length,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        calls: gl.info.render.calls,
      });
    }
  }, -1);
  return (
    <>
      <XROrigin ref={rig} />
      {[left, right].map((ref, i) => (
        <group key={i} ref={ref} userData={{ vrHand: true }}>
          <mesh scale={[0.045, 0.035, 0.085]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#22232a" roughness={0.65} />
          </mesh>
        </group>
      ))}
      {[leftRay, rightRay].map((ref, i) => (
        <group key={i} ref={ref} userData={{ ignoreBullet: true, vrUI: true }}>
          <mesh>
            <boxGeometry args={[0.002, 0.002, 1]} />
            <meshBasicMaterial color="#c4d3da" transparent opacity={0.5} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.008, 8, 6]} />
            <meshBasicMaterial color="white" />
          </mesh>
        </group>
      ))}
      <group
        ref={gun}
        visible={false}
        scale={0.8}
        userData={{ ignoreBullet: true, vrHand: true }}
      >
        <GunModel />
      </group>
      <mesh
        ref={marker}
        visible={false}
        rotation={[-Math.PI / 2, 0, 0]}
        userData={{ ignoreBullet: true }}
      >
        <ringGeometry args={[0.14, 0.2, 24]} />
        <meshBasicMaterial color="#c4e1db" side={THREE.DoubleSide} />
      </mesh>
      <mesh
        ref={fade}
        visible={false}
        renderOrder={1000}
        userData={{ ignoreBullet: true }}
      >
        <planeGeometry args={[5, 5]} />
        <shaderMaterial
          transparent
          depthTest={false}
          depthWrite={false}
          uniforms={{ blocked: { value: 0 } }}
          vertexShader="varying vec3 vView; void main(){vec4 p=modelViewMatrix*vec4(position,1.);vView=p.xyz;gl_Position=projectionMatrix*p;}"
          fragmentShader="varying vec3 vView; uniform float blocked; void main(){float edge=smoothstep(.55,1.0,length(vView.xy)/max(.001,-vView.z));gl_FragColor=vec4(0.,0.,0.,max(blocked*.96,edge*.7));}"
        />
      </mesh>
    </>
  );
}

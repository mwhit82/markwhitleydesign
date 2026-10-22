"use client";
import { xrStore } from "./runtime";
import { SPECIAL_IDS, type SpecialId } from "@/lib/deader/special-ids";
import { stalkerDebug, STALKER_ROOM } from "@/lib/deader/stalker";
import { feedHealth } from "@/lib/deader/vr-feed";
import * as THREE from "three";
import { useState, useEffect } from "react";
import { vrTestTargets, vrWorldTargets } from "@/lib/deader/vr-state";
import { XRDevice, metaQuest3 } from "iwer";
import type { Rehearsal } from "@/lib/deader/rehearsal";
import { useGame } from "@/lib/deader/store";
import { useVR } from "@/lib/deader/vr-state";
let device: XRDevice | undefined;
export function installEmulator() {
  if (process.env.NODE_ENV !== "development") return;
  if (!device) {
    device = new XRDevice(metaQuest3);
    device.installRuntime({ forceInstall: true });
    device.position.set(0, 1.6, 0);
  }
  useVR.setState({ enabled: true });
}
/** Explicit local test controls; absent from production. No saved progress is granted. */
export default function VRDev() {
  const [fixture, setFixture] = useState<Rehearsal>("standard");
  const [holdStalker, setHoldStalker] = useState(false);
  useEffect(
    () => () => {
      stalkerDebug.hold = false;
    },
    [],
  );
  const [target, setTarget] = useState("Resume");
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const names: Record<string, string> = {
        "1": "Test night",
        "2": "Test shop",
        "3": "Test pause",
        "4": "Test CCTV",
        "5": "Test lobby",
        "6": "Walk 1 second",
        "7": "Turn half second",
        "8": "Point and trigger",
        "9": "Controller menu",
      };
      if (names[e.key])
        Array.from(
          document.querySelectorAll<HTMLButtonElement>("[data-vr-dev] button"),
        )
          .find((b) => b.textContent === names[e.key])
          ?.click();
      if (e.key === "k") setTarget("VR settings");
      if (e.key === "j") setTarget("Next");
      if (e.key === "u") setTarget("Resume");
      if (e.key === "b") setTarget("Back to lobby");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  if (process.env.NODE_ENV !== "development") return null;
  const tap = (id: string) => {
    device?.controllers.right?.updateButtonValue(id, 1);
    setTimeout(() => device?.controllers.right?.updateButtonValue(id, 0), 120);
  };
  return (
    <details open
      data-vr-dev
      data-vr-exclude
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 100,
        background: "#15191d",
        color: "white",
        padding: 8,
        maxWidth: "100%",
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
      }}
    >
      <summary style={{cursor:"pointer",width:"100%"}}>Local test controls</summary>
      <select aria-label="Special item fixture" onChange={e=>{useGame.setState({specialFixture:(e.target.value||null) as SpecialId|null});useGame.getState().open("special");}}><option value="">Live hourly offer</option>{SPECIAL_IDS.map(id=><option key={id} value={id}>{id}</option>)}</select>
      <button onClick={()=>{useGame.setState({specialFixture:null});useGame.getState().open("special");}}>Test hourly shop</button>
      <button
        onClick={() => {
          const k = useGame.getState().room.stalker,
            a = STALKER_ROOM[k.anchor];
          if (!device || !a) return;
          const point = new THREE.Vector3(0,1.02,.255).applyAxisAngle(new THREE.Vector3(0,0,1),a.roll).multiplyScalar(.82).applyAxisAngle(new THREE.Vector3(0,1,0),a.yaw).add(new THREE.Vector3(...a.p));
          const eye=point.clone().add(new THREE.Vector3(Math.sin(a.yaw)*2,.4,Math.cos(a.yaw)*2));
          xrStore.getState().origin?.worldToLocal(point);
          xrStore.getState().origin?.worldToLocal(eye);
          device.position.set(eye.x,eye.y,eye.z);
          const from = new THREE.Vector3(
            device.position.x,
            device.position.y,
            device.position.z,
          );
          const q = new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().lookAt(from, point, new THREE.Vector3(0, 1, 0)),
          );
          device.quaternion.set(q.x, q.y, q.z, q.w);
        }}
      >
        Inspect Stalker
      </button>

      <button
        onClick={() => {
          stalkerDebug.hold = !holdStalker;
          setHoldStalker(!holdStalker);
        }}
      >
        {holdStalker ? "Release Stalker pose" : "Hold Stalker pose"}
      </button>
      <button
        onClick={() => {
          const canvas = document.querySelector<HTMLCanvasElement>(
            "canvas[data-vr-stats]",
          );
          if (canvas)
            canvas.dataset.vrFeedDisabled =
              canvas.dataset.vrFeedDisabled === "true" ? "false" : "true";
        }}
      >
        Toggle feed rendering
      </button>
      <button
        onClick={() => {
          feedHealth.failed = true;
        }}
      >
        Fail camera feed
      </button>

      <select
        aria-label="VR fixture"
        value={fixture}
        onChange={(e) => setFixture(e.target.value as Rehearsal)}
      >
        {[
          "stalker-room",
          "stalker-follow",
          "stalker-cam-0",
          "stalker-cam-1",
          "stalker-cam-2",
          "stalker-cam-3",
          "stalker-cam-4",
          "stalker-cam-5",
          "standard",
          "scare",
          "armed",
          "armed-mirror",
          "mimic",
          "splitter",
          "glitched",
          "kids",
          "pair",
          "push",
          "judgement-pass",
          "judgement-fail",
          "rainbow",
          "injured",
        ].map((id) => (
          <option key={id}>{id}</option>
        ))}
      </select>
      <input
        aria-label="VR test action"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        style={{ width: 140 }}
      />
      <button
        onClick={() => {
          const row = vrWorldTargets.find(
              (v) => v.text.toLowerCase() === target.toLowerCase(),
            ),
            controller = device?.controllers.right;
          if (!row || !controller) return;
          const point = new THREE.Vector3(...row.position),
            from = new THREE.Vector3(0, 1.4, 0)
              .sub(point)
              .normalize()
              .multiplyScalar(1.2)
              .add(point);
          controller.position.set(from.x, from.y, from.z);
          const q = new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().lookAt(from, point, new THREE.Vector3(0, 1, 0)),
          );
          controller.quaternion.set(q.x, q.y, q.z, q.w);
        }}
      >
        Aim at object
      </button>
      <button onClick={() => tap("trigger")}>Press trigger</button>
      <button
        onClick={() => {
          const row = vrTestTargets.find((v) =>
              v.text.toLowerCase().includes(target.toLowerCase()),
            ),
            controller = device?.controllers.right;
          if (!row || !controller) return;
          controller.position.set(0.25, 1.4, -0.3);
          const q = new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().lookAt(
              new THREE.Vector3(0.25, 1.4, -0.3),
              new THREE.Vector3(...row.position),
              new THREE.Vector3(0, 1, 0),
            ),
          );
          controller.quaternion.set(q.x, q.y, q.z, q.w);
          setTimeout(() => tap("trigger"), 150);
        }}
      >
        Point and trigger
      </button>
      <button
        onClick={() => {
          const row = vrTestTargets.find((v) => v.text === "Grab bar"),
            controller = device?.controllers.right;
          if (!row || !controller) return;
          controller.position.set(0.25, 1.4, -0.3);
          const q = new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().lookAt(
              new THREE.Vector3(0.25, 1.4, -0.3),
              new THREE.Vector3(...row.position),
              new THREE.Vector3(0, 1, 0),
            ),
          );
          controller.quaternion.set(q.x, q.y, q.z, q.w);
          setTimeout(() => controller.updateButtonValue("trigger", 1), 150);
          setTimeout(() => controller.position.set(0.6, 1.4, -0.3), 400);
          setTimeout(() => controller.updateButtonValue("trigger", 0), 900);
        }}
      >
        Drag screen
      </button>
      <button
        onClick={() => {
          const s = useGame.getState();
          useGame.setState({
            runSeconds: 60,
            rehearsal: fixture,
            panel: null,
            suspension: null,
            focused: true,
          });
          s.start();
        }}
      >
        Test night
      </button>
      <button onClick={() => useGame.getState().open("shop")}>Test shop</button>
      <button onClick={() => useGame.getState().open("pause")}>
        Test pause
      </button>
      <button onClick={() => useGame.getState().roomView("cctv")}>
        Test CCTV
      </button>
      <button onClick={() => useGame.getState().lobby()}>Test lobby</button>
      <button
        onClick={() => {
          device?.controllers.left?.updateAxes("thumbstick", 0, -1);
          setTimeout(
            () => device?.controllers.left?.updateAxes("thumbstick", 0, 0),
            1000,
          );
        }}
      >
        Walk 1 second
      </button>
      <button
        onClick={() => {
          device?.controllers.right?.updateAxes("thumbstick", 1, 0);
          setTimeout(
            () => device?.controllers.right?.updateAxes("thumbstick", 0, 0),
            500,
          );
        }}
      >
        Turn half second
      </button>
      <button onClick={() => tap("b-button")}>Controller menu</button>
    </details>
  );
}

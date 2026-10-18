"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/deader/store";
import { useVR, vrTestTargets } from "@/lib/deader/vr-state";
import { tutorialCopy, type TutorialStep } from "@/lib/deader/tutorial";
import { FEEDS } from "@/lib/deader/room";
import { loungeAlert, residentPosition } from "@/lib/deader/lounge";
import { DECISION_SECONDS } from "@/lib/deader/visitors";
import { clockLabel } from "@/lib/deader/game";
import { Cone } from "../character";
import { Puppy } from "../sidekick";
import type { Outfit } from "@/lib/deader/cosmetics";
import { xrStore, trackedHands } from "./runtime";
const vrTutorial: Partial<Record<TutorialStep, string>> = {
  move: "Use the left stick to walk around the lobby.",
  look: "Turn your head to look around. The right stick turns your body smoothly.",
  tablet:
    "Find the glowing LEARN TO PLAY tablet. Walk close, point at Learn to play and press the trigger.",
};
type Row = { text: string; action?: () => void; disabled?: boolean };
function visible(el: HTMLElement) {
  return (
    !!el.getClientRects().length &&
    !el.closest('[hidden],[aria-hidden="true"],[data-vr-exclude]') &&
    getComputedStyle(el).visibility !== "hidden" &&
    getComputedStyle(el).display !== "none"
  );
}
/** Reuse the actual mounted menu actions: decisions/purchases cannot drift from the flat game. */
function menuRows(): Row[] {
  const root = document.querySelector<HTMLElement>("[data-anomalous-ui]");
  if (!root) return [];
  const dialogs = Array.from(
    root.querySelectorAll<HTMLElement>('[role="dialog"]'),
  ).filter(visible);
  const scope =
    dialogs.find((d) => d.getAttribute("aria-label") === "Game suspended") ??
    dialogs.at(-1) ??
    root;
  const rows: Row[] = [];
  for (const e of scope.querySelectorAll<HTMLElement>(
    "h1,h2,h3,p,dt,button,summary,input,select,a",
  )) {
    if (!visible(e) || e.closest("[data-vr-exclude]")) continue;
    if (
      e.tagName === "BUTTON" ||
      e.tagName === "SUMMARY" ||
      e.tagName === "A"
    ) {
      const label = e.getAttribute("aria-label") || e.textContent?.trim() || "";
      const text =
        (e.getAttribute("aria-pressed") === "true" ? "● " : "") + label;
      if (
        scope.getAttribute("aria-label") === "Game Over" &&
        label === "Close menu"
      )
        continue;
      if (!text || text === "Fire" || e.closest("[data-vr-exclude]")) continue;
      rows.push({
        text,
        disabled: (e as HTMLButtonElement).disabled,
        action: () => {
          if (e.isConnected && visible(e) && !(e as HTMLButtonElement).disabled)
            e.click();
        },
      });
    } else if (e instanceof HTMLInputElement) {
      const label =
        e.getAttribute("aria-label") ||
        e.closest("label")?.textContent?.trim() ||
        e.type;
      if (e.type === "checkbox")
        rows.push({
          text: `${e.checked ? "✓" : "○"} ${label}`,
          action: () => e.click(),
        });
      else if (e.type === "range")
        for (const direction of [-1, 1])
          rows.push({
            text: `${direction < 0 ? "−" : "+"} ${label}: ${e.value}`,
            action: () => {
              const value = Math.max(
                Number(e.min),
                Math.min(
                  Number(e.max),
                  Number(e.value) + direction * Number(e.step || 1),
                ),
              );
              Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value",
              )!.set!.call(e, String(value));
              e.dispatchEvent(new Event("input", { bubbles: true }));
              e.dispatchEvent(new Event("change", { bubbles: true }));
            },
          });
    } else if (e instanceof HTMLSelectElement) {
      const label = e.closest("label")?.childNodes[0]?.textContent ?? "Select";
      for (const option of Array.from(e.options))
        rows.push({
          text: `${option.selected ? "●" : "○"} ${label}: ${option.label}`,
          disabled: option.disabled,
          action: () => {
            Object.getOwnPropertyDescriptor(
              HTMLSelectElement.prototype,
              "value",
            )!.set!.call(e, option.value);
            e.dispatchEvent(new Event("change", { bubbles: true }));
          },
        });
    } else if (
      !e.querySelector("button,input,select,a") &&
      !e.closest("button")
    ) {
      let text =
        (e.textContent?.trim().replace(/\s+/g, " ") ?? "") +
        (e.tagName === "DT"
          ? ": " + (e.nextElementSibling?.textContent ?? "")
          : "");
      const tutorial = useGame.getState().tutorial;
      if (tutorial && text === tutorialCopy[tutorial].body)
        text = vrTutorial[tutorial] ?? text;
      if (
        scope.getAttribute("aria-label") === "Door choices" &&
        !e.parentElement?.querySelector('button[aria-expanded="true"]') &&
        !/^(Let them in|Send them away)\?/.test(text)
      )
        continue;
      // Keep long dialogue readable across pages, never truncate it.
      const words = text.split(" ");
      let line = "";
      for (const word of words) {
        if ((line + word).length > 115) {
          rows.push({ text: line });
          line = "";
        }
        line += word + " ";
      }
      if (line.trim()) rows.push({ text: line.trim() });
    }
  }
  return rows;
}
function surface(w = 1024, h = 768) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, texture, ctx: canvas.getContext("2d")! };
}
function lines(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  lineHeight = 26,
) {
  let line = "";
  for (const word of text.split(" ")) {
    if (ctx.measureText(line + word).width > width) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = "";
    }
    line += word + " ";
  }
  ctx.fillText(line, x, y);
}
export function VRPanel() {
  const panel = useRef<THREE.Group>(null),
    wrist = useRef<THREE.Mesh>(null),
    buttons = useRef<(THREE.Mesh | null)[]>([]);
  const display = useMemo(() => surface(), []),
    watch = useMemo(() => surface(512, 128), []);
  const state = useRef({
    page: 0,
    settings: false,
    last: "",
    next: 0,
    rows: [] as Row[],
  });
  useEffect(
    () => () => {
      display.texture.dispose();
      watch.texture.dispose();
    },
    [display, watch],
  );
  useFrame(({ camera }, dt) => {
    if (!panel.current) return;
    const s = useGame.getState(),
      r = s.room,
      a = state.current;
    const key = [
      s.panel,
      r.view,
      s.suspension,
      r.judgement?.failed,
      r.night?.status,
      s.scene,
      s.prompt,
      loungeAlert(r.residents)?.id,
    ].join(":");
    if (a.last !== key) {
      a.page = 0;
      a.last = key;
      const p = new THREE.Vector3(),
        q = new THREE.Quaternion();
      camera.getWorldPosition(p);
      camera.getWorldQuaternion(q);
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
      dir.y = 0;
      dir.normalize();
      panel.current.position.copy(p).addScaledVector(dir, 1.2);
      panel.current.position.y = p.y - 0.12;
      panel.current.rotation.set(0, Math.atan2(-dir.x, -dir.z), 0);
    }
    if (wrist.current) {
      const hand = s.save.settings.vr.leftHanded ? "right" : "left";
      wrist.current.visible =
        trackedHands[hand === "left" ? "leftVisible" : "rightVisible"] &&
        !s.panel &&
        !s.suspension &&
        r.view === "explore" &&
        !s.prompt &&
        !r.judgement &&
        r.survival.phase === "idle" &&
        r.night?.status !== "completed";
      wrist.current.matrix.copy(trackedHands[hand]);
      wrist.current.matrix.decompose(
        wrist.current.position,
        wrist.current.quaternion,
        wrist.current.scale,
      );
      wrist.current.translateY(0.11);
      wrist.current.rotateX(-Math.PI / 3);
    }
    a.next -= dt;
    if (a.next > 0) return;
    a.next = 0.15;
    const prefs = s.save.settings.vr;
    panel.current.visible =
      a.settings ||
      !!s.panel ||
      !!s.suspension ||
      r.view !== "explore" ||
      !!s.prompt ||
      !!s.tutorial ||
      !!loungeAlert(r.residents) ||
      r.night?.status === "completed" ||
      r.survival.phase === "gameover";
    const patch = (p: Partial<typeof prefs>) =>
      s.settings({ vr: { ...useGame.getState().save.settings.vr, ...p } });
    const settingRows: Row[] = [
      {
        text: `Movement: ${prefs.movement}`,
        action: () =>
          patch({
            movement: prefs.movement === "smooth" ? "teleport" : "smooth",
          }),
      },
      {
        text: `Turning: ${prefs.turning}`,
        action: () =>
          patch({ turning: prefs.turning === "smooth" ? "snap" : "smooth" }),
      },
      ...[-1, 1].map((d) => ({
        text: `${d < 0 ? "−" : "+"} Walk speed: ${prefs.walkSpeed.toFixed(1)} m/s`,
        action: () =>
          patch({
            walkSpeed: Math.max(0.5, Math.min(2, prefs.walkSpeed + d * 0.25)),
          }),
      })),
      ...[-1, 1].map((d) => ({
        text: `${d < 0 ? "−" : "+"} Turn speed: ${prefs.turnSpeed}°/s`,
        action: () =>
          patch({
            turnSpeed: Math.max(15, Math.min(90, prefs.turnSpeed + d * 15)),
          }),
      })),
      {
        text: `Dominant hand: ${prefs.leftHanded ? "left" : "right"}`,
        action: () => patch({ leftHanded: !prefs.leftHanded }),
      },
      {
        text: `${prefs.seated ? "Seated" : "Standing"} · change and calibrate height`,
        action: () => {
          patch({ seated: !prefs.seated });
          useVR.setState((v) => ({ recenter: v.recenter + 1 }));
        },
      },
      {
        text: `Comfort vignette: ${prefs.vignette ? "on" : "off"}`,
        action: () => patch({ vignette: !prefs.vignette }),
      },
      {
        text: "Recalibrate seated height",
        action: () => useVR.setState((v) => ({ recenter: v.recenter + 1 })),
      },
      {
        text: "Exit VR",
        action: () => {
          void xrStore.getState().session?.end();
        },
      },
    ];
    const inMenu =
      !!s.panel ||
      !!s.suspension ||
      r.view !== "explore" ||
      r.night?.status === "completed" ||
      r.survival.phase === "gameover";
    let all = a.settings
      ? settingRows
      : inMenu
        ? menuRows()
        : [
            {
              text: s.prompt
                ? `Interact: ${s.prompt}`
                : "Left stick: walk · Right stick: turn · B/Y: menu",
              action: s.prompt
                ? () => {
                    if (s.scene === "lobby") s.interactLobby();
                    else
                      window.dispatchEvent(new Event("anomalous-vr-interact"));
                  }
                : undefined,
            },
          ];
    if (!a.settings && !inMenu) {
      const alert = loungeAlert(r.residents);
      if (alert)
        all.unshift({
          text: `LOUNGE: ${alert.leaving ? "Mimic leaving" : "Mimic transformed"} · ${alert.seconds}s · doorway behind you`,
        });
      if (s.tutorial) all.push(...menuRows().filter((v) => !v.action));
    }
    if (!a.settings && !inMenu && loungeAlert(r.residents))
      all.push({
        text: "View lounge camera",
        action: () => {
          const now = useGame.getState();
          useGame.setState({ room: { ...now.room, feed: 5 } });
          now.roomView("cctv");
        },
      });
    // Keep door decisions and closing actions reachable on every question page.
    const pinned = a.settings
      ? []
      : all
          .filter(
            (v) =>
              v.action &&
              /^(Confirm|Go back|Let in|Send away|Answer the door|Step away|Back to room|Close shop|Leave shop|Back to lobby|Close menu|Retry shift|Return to lobby|START|Resume)/i.test(
                v.text,
              ),
          )
          .slice(0, 4);
    all = all.filter((v) => !pinned.includes(v));
    const capacity = Math.max(2, 6 - Math.min(4, pinned.length)),
      pages = Math.max(1, Math.ceil(all.length / capacity));
    a.page = Math.min(a.page, pages - 1);
    a.rows = [
      ...pinned.slice(0, 4),
      ...all.slice(a.page * capacity, (a.page + 1) * capacity),
    ].slice(0, 6);
    const { ctx, canvas } = display;
    ctx.fillStyle = "rgba(9,12,16,.97)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#77828c";
    ctx.strokeRect(2, 2, 1020, 764);
    ctx.fillStyle = "#f1f2f3";
    ctx.font = "bold 29px sans-serif";
    const e = r.encounters.active,
      remaining =
        e?.phase === "waiting"
          ? Math.max(
              0,
              Math.ceil(
                DECISION_SECONDS[s.session?.difficulty ?? "easy"] - e.elapsed,
              ),
            )
          : null;
    ctx.fillText(
      a.settings
        ? "VR CONTROLS"
        : remaining !== null
          ? `ANSWER THE DOOR · ${remaining} SECONDS`
          : (s.panel?.toUpperCase() ?? "THE ANOMALOUS"),
      28,
      46,
    );
    a.rows.forEach((row, i) => {
      ctx.fillStyle = row.action ? "#242a30" : "#0e1217";
      ctx.fillRect(20, 72 + i * 88, 984, 80);
      ctx.strokeStyle = row.disabled ? "#343940" : "#737e88";
      if (row.action) ctx.strokeRect(20, 72 + i * 88, 984, 80);
      ctx.fillStyle = row.disabled ? "#8b9299" : "#fafafa";
      ctx.font = "26px sans-serif";
      lines(ctx, row.text, 38, 103 + i * 88, 942, 29);
    });
    const foot: Row[] = [
      {
        text: `Previous · ${a.page + 1}/${pages}`,
        disabled: a.page === 0,
        action: () => {
          a.page = Math.max(0, a.page - 1);
          a.next = 0;
        },
      },
      {
        text: "Next",
        disabled: a.page === pages - 1,
        action: () => {
          a.page = Math.min(pages - 1, a.page + 1);
          a.next = 0;
        },
      },
      {
        text: a.settings ? "Back" : "VR settings",
        action: () => {
          if (!a.settings && !s.panel) s.open("pause");
          a.settings = !a.settings;
          a.page = 0;
          a.next = 0;
        },
      },
    ];
    foot.forEach((row, i) => {
      ctx.fillStyle = "#293139";
      ctx.fillRect(20 + i * 330, 630, 314, 92);
      ctx.fillStyle = row.disabled ? "#727a82" : "white";
      ctx.font = "25px sans-serif";
      ctx.fillText(row.text, 35 + i * 330, 680);
    });
    [
      ...a.rows,
      ...Array.from({ length: 6 - a.rows.length }, (): Row => ({ text: "" })),
      ...foot,
    ].forEach((row, i) => {
      const b = buttons.current[i];
      if (b) {
        b.visible = !!row.action;
        b.userData.vrAction =
          row.action && !row.disabled ? row.action : () => {};
      }
    });
    if (process.env.NODE_ENV === "development") {
      vrTestTargets.length = 0;
      [
        ...a.rows,
        ...Array.from({ length: 6 - a.rows.length }, (): Row => ({ text: "" })),
        ...foot,
      ].forEach((row, i) => {
        const b = buttons.current[i];
        if (b && row.action) {
          const p = b.getWorldPosition(new THREE.Vector3());
          xrStore.getState().origin?.worldToLocal(p);
          vrTestTargets.push({
            text: row.text,
            position: p.toArray() as [number, number, number],
          });
        }
      });
    }
    display.texture.needsUpdate = true;
    watch.ctx.fillStyle = "#10161b";
    watch.ctx.fillRect(0, 0, 512, 128);
    watch.ctx.fillStyle = "white";
    watch.ctx.font = "26px sans-serif";
    watch.ctx.fillText(
      `${s.save.coins} COINS · ${r.encounters.trust} LIVES`,
      18,
      42,
    );
    watch.ctx.fillText(
      s.scene === "room"
        ? `NIGHT ${r.night?.number ?? 1} · ${clockLabel(r.night?.elapsed ?? 0)} · ${r.weapon.ammo}/6`
        : "THE ANOMALOUS",
      18,
      88,
    );
    watch.texture.needsUpdate = true;
  });
  return (
    <>
      <VRPreview />
      <group ref={panel} userData={{ vrUI: true }}>
        <mesh>
          <planeGeometry args={[1.3, 0.975]} />
          <meshBasicMaterial map={display.texture} toneMapped={false} />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh
            key={i}
            ref={(v) => {
              buttons.current[i] = v;
            }}
            position={
              i < 6
                ? [0, 0.4875 - ((112 + i * 88) / 768) * 0.975, 0.005]
                : [-0.42 + (i - 6) * 0.42, -0.37, 0.005]
            }
            userData={{ vrUI: true }}
          >
            <planeGeometry args={i < 6 ? [1.25, 0.102] : [0.4, 0.116]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <mesh ref={wrist} userData={{ vrUI: true, ignoreBullet: true }}>
        <planeGeometry args={[0.18, 0.045]} />
        <meshBasicMaterial
          map={watch.texture}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
export function VRFeed() {
  const mesh = useRef<THREE.Mesh>(null),
    timer = useRef(0),
    anchor = useRef("");
  const target = useMemo(
      () => new THREE.WebGLRenderTarget(512, 288, { depthBuffer: true }),
      [],
    ),
    camera = useMemo(() => {
      const c = new THREE.PerspectiveCamera(62, 512 / 288, 0.08, 35);
      c.userData.loungeInset = true;
      return c;
    }, []);
  const arcade = useMemo(() => surface(960, 540), []);
  useEffect(
    () => () => {
      target.dispose();
      arcade.texture.dispose();
    },
    [target, arcade],
  );
  useFrame(({ gl, scene, camera: head }, dt) => {
    if (!mesh.current) return;
    const s = useGame.getState(),
      r = s.room,
      alert = loungeAlert(r.residents),
      view = r.view;
    const active =
      !s.panel &&
      !s.suspension &&
      s.focused &&
      !r.judgement &&
      (view === "cctv" || view === "inspect" || view === "arcade" || !!alert);
    mesh.current.visible = active;
    if (!active) return;
    const key = view + ":" + (alert?.id ?? "");
    if (anchor.current !== key) {
      anchor.current = key;
      head.getWorldPosition(mesh.current.position);
      head.getWorldQuaternion(mesh.current.quaternion);
      mesh.current.translateZ(-1.55);
      mesh.current.translateY(0.68);
    }
    timer.current += dt;
    if (timer.current < 1 / (view === "arcade" ? 30 : 10)) return;
    timer.current = 0;
    const material = mesh.current.material as THREE.MeshBasicMaterial;
    if (view === "arcade") {
      const c = document.querySelector<HTMLCanvasElement>(
        "[data-anomalous-arcade]",
      );
      if (c) {
        arcade.ctx.drawImage(c, 0, 0, 960, 540);
        arcade.texture.needsUpdate = true;
        material.map = arcade.texture;
        material.needsUpdate = true;
      }
      return;
    }
    if (view === "inspect") {
      camera.position.set(0.25, 1.63, -3.94);
      camera.lookAt(0.25, 0.85, -6);
      camera.fov = 40;
    } else if (view === "cctv") {
      const feed = FEEDS[r.feed];
      camera.position.fromArray(feed.position);
      camera.lookAt(new THREE.Vector3(...feed.target));
      camera.fov = 62;
    } else {
      const resident = r.residents.find((v) => v.id === alert?.id);
      if (!resident) return;
      const p = residentPosition(resident);
      camera.position.set(
        Math.min(3.1, p.x + 1.6),
        2.1,
        Math.min(10.4, p.z + 2.6),
      );
      camera.lookAt(p.x, 0.95, p.z);
      camera.fov = 55;
    }
    camera.updateProjectionMatrix();
    camera.layers.enable(1);
    const old = {
      target: gl.getRenderTarget(),
      xr: gl.xr.enabled,
      auto: gl.autoClear,
      shadow: gl.shadowMap.autoUpdate,
    };
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (
        o.visible &&
        (o.userData.vrUI || o.userData.vrHand || o.userData.firstPersonWeapon)
      ) {
        hidden.push(o);
        o.visible = false;
      }
    });
    try {
      gl.xr.enabled = false;
      gl.autoClear = true;
      gl.shadowMap.autoUpdate = false;
      gl.setRenderTarget(target);
      gl.clear();
      gl.render(scene, camera);
    } finally {
      gl.setRenderTarget(old.target);
      gl.xr.enabled = old.xr;
      gl.autoClear = old.auto;
      gl.shadowMap.autoUpdate = old.shadow;
      hidden.forEach((o) => (o.visible = true));
    }
    material.map = target.texture;
    material.needsUpdate = true;
  });
  return (
    <mesh ref={mesh} visible={false} userData={{ vrUI: true }}>
      <planeGeometry args={[1.4, 0.7875]} />
      <meshBasicMaterial map={target.texture} toneMapped={false} />
    </mesh>
  );
}

function VRPreview() {
  const [preview, setPreview] = useState<{
      colour: string;
      outfit: Outfit;
      pet: boolean;
    } | null>(null),
    group = useRef<THREE.Group>(null),
    previous = useRef(""),
    timer = useRef(0);
  useFrame(({ camera }, dt) => {
    timer.current += dt;
    if (group.current) group.current.rotation.y += dt * 0.35;
    if (timer.current < 0.2) return;
    timer.current = 0;
    const raw =
      document
        .querySelector("[data-vr-preview]")
        ?.getAttribute("data-vr-preview") ?? "";
    if (raw === previous.current) return;
    previous.current = raw;
    if (!raw) {
      setPreview(null);
      return;
    }
    try {
      setPreview(JSON.parse(raw));
      if (group.current) {
        camera.getWorldPosition(group.current.position);
        const q = camera.getWorldQuaternion(new THREE.Quaternion());
        group.current.position.add(
          new THREE.Vector3(0.95, -0.4, -1.3).applyQuaternion(q),
        );
      }
    } catch {
      setPreview(null);
    }
  });
  return (
    <group
      ref={group}
      scale={0.4}
      visible={!!preview}
      userData={{ vrUI: true }}
    >
      {preview &&
        (preview.pet ? (
          <Puppy colour={preview.colour} />
        ) : (
          <Cone colour={preview.colour} outfit={preview.outfit} />
        ))}
      <pointLight position={[0, 2, 2]} intensity={3} distance={3} />
    </group>
  );
}

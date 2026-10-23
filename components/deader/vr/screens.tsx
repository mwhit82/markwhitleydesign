"use client";
import {
  feedHealth,
  retryVRFeed,
  renderVRFeed,
  VR_FEED_WIDTH,
  VR_FEED_HEIGHT,
  VR_FEED_INTERVAL,
} from "@/lib/deader/vr-feed";
import { nightClockLabel } from "@/lib/deader/night";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/deader/store";
import { useVR, vrTestTargets } from "@/lib/deader/vr-state";
import { vrPanelVisible } from "@/lib/deader/vr-interactions";
import { newVRMenu, vrScreen, type VRButton } from "@/lib/deader/vr-menu";
import { LOBBY_OBSTACLES, ROOM_CLOSED_OBSTACLES } from "@/lib/deader/game";
import { FEEDS } from "@/lib/deader/room";
import { loungeAlert, residentPosition } from "@/lib/deader/lounge";
import { Cone } from "../character";
import { PetModel } from "../sidekick";
import { xrStore, trackedHands } from "./runtime";
import { spatial, registerUI } from "./spatial";
import { placeVRPanel } from "@/lib/deader/vr";
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
  lineHeight = 30,
) {
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (ctx.measureText(line + word).width > width) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = "";
    }
    line += word + " ";
  }
  ctx.fillText(line, x, y);
}
export const VRPanel = memo(function VRPanel() {
  const panel = useRef<THREE.Group>(null),
    wrist = useRef<THREE.Mesh>(null),
    buttons = useRef<(THREE.Mesh | null)[]>([]),
    grab = useRef<THREE.Mesh>(null);
  const buttonData = useMemo(
    () => Array.from({ length: 7 }, () => ({ vrUI: true })),
    [],
  );
  const display = useMemo(() => surface(), []),
    watch = useMemo(() => surface(512, 128), []);
  const a = useRef({
    menu: newVRMenu(),
    key: "",
    next: 0,
    signature: "",
    watch: "",
    open: false,
    menuLayout: false,
    head: new THREE.Vector3(),
    direction: new THREE.Vector3(),
  });
  useEffect(
    () => () => {
      display.texture.dispose();
      watch.texture.dispose();
      buttons.current.forEach((b) => registerUI(b, null));
      registerUI(grab.current, null);
      spatial.panel = null;
      spatial.dragging = null;
      spatial.feed = false;
      spatial.preview = null;
    },
    [display, watch],
  );
  useFrame(({ camera, gl }, dt) => {
    if (!panel.current) return;
    const s = useGame.getState(),
      r = s.room,
      v = a.current;
    const visible = vrPanelVisible(s);
    panel.current.visible = visible;
    spatial.panel = panel.current;
    camera.getWorldPosition(v.head);
    camera.getWorldDirection(v.direction);
    const key = [
      s.scene,
      s.panel,
      r.view,
      s.suspension,
      r.night?.status,
      r.encounters.active?.id,
      r.survival.phase === "gameover",
    ].join(":");
    const inspection = r.view === "inspect" || r.view === "door" || !!r.judgement;
    const layoutChanged = v.menuLayout !== inspection;
    v.menuLayout = inspection;
    if (v.key !== key) {
      v.menu = newVRMenu();
      v.key = key;
      v.next = 0;
      spatial.dragging = null;
    }
    if (visible && (spatial.recenter || !v.open || layoutChanged)) {
      const p = placeVRPanel(
        v.head,
        v.direction,
        s.scene,
        s.scene === "lobby" ? LOBBY_OBSTACLES : ROOM_CLOSED_OBSTACLES,
      );
      panel.current.position.set(p.x, p.y, p.z);
      spatial.recenter = false;
      panel.current.rotation.set(
        0,
        Math.atan2(
          v.head.x - panel.current.position.x,
          v.head.z - panel.current.position.z,
        ),
        0,
      );
      if (inspection) {
        const yaw = Math.atan2(-v.direction.x, -v.direction.z);
        panel.current.rotation.set(0, yaw, 0);
        panel.current.position.copy(v.head);
        panel.current.position.x -= Math.sin(yaw) * 1.3;
        panel.current.position.z -= Math.cos(yaw) * 1.3;
        panel.current.translateX(s.save.settings.vr.leftHanded ? -1.35 : 1.35);
      }
    }
    v.open = visible;
    if (wrist.current) {
      const hand = s.save.settings.vr.leftHanded ? "right" : "left";
      wrist.current.visible =
        trackedHands[hand === "left" ? "leftVisible" : "rightVisible"] &&
        !s.panel &&
        !s.suspension &&
        r.view === "explore";
      wrist.current.matrix.copy(trackedHands[hand]);
      wrist.current.matrix.decompose(
        wrist.current.position,
        wrist.current.quaternion,
        wrist.current.scale,
      );
      wrist.current.translateY(0.11);
      wrist.current.rotateX(-Math.PI / 3);
    }
    v.next -= dt;
    if (v.next > 0) return;
    v.next = 0.08;
    const model = vrScreen(s, v.menu, {
      feedFailed: feedHealth.failed,
      retryFeed: retryVRFeed,
      patch: (p) => useGame.setState(p),
      resume: () => useGame.setState({ suspension: null, focused: true }),
      recenter: () => {
        useVR.setState((x) => ({ recenter: x.recenter + 1 }));
        spatial.recenter = true;
      },
      exit: () => {
        void xrStore.getState().session?.end();
      },
      decide: (id, d) => s.decideVisitorVR(id, d),
    });
    const alert = loungeAlert(r.residents);
    spatial.feed = (visible && !!model.feed) || !!alert;
    spatial.preview = visible ? (model.preview ?? null) : null;
    const rows: VRButton[] = visible ? model.buttons : [];
    const foot: VRButton[] = !visible
      ? []
      : [
          {
            text: model.back
              ? "Back"
              : s.panel === "shop" || s.panel === "wardrobe" || s.panel === "special"
                ? "Leave shop"
                : "Close",
            run: model.back ?? model.close ?? (() => s.escape()),
          },
          {
            text: "Recenter",
            run: () => {
              spatial.recenter = true;
            },
          },
          {
            text:
              v.menu.page === "cameras"
                ? "More cameras"
                : model.back
                  ? "Close"
                  : "",
            run:
              v.menu.page === "cameras"
                ? () => {
                    v.menu.index = v.menu.index === 0 ? 4 : 0;
                  }
                : (model.close ?? (() => s.escape())),
          },
        ];
    const all = [
      ...rows,
      ...Array.from({ length: 4 - rows.length }, () => null),
      ...foot,
    ];
    all.forEach((b, i) => {
      const mesh = buttons.current[i];
      if (mesh) {
        mesh.visible = !!b?.text;
        mesh.userData.vrLabel = b?.text;
        mesh.userData.vrAction =
          b && !b.disabled
            ? () => {
                b.run();
                v.next = 0;
              }
            : () => {};
      }
    });
    const hover = buttons.current.indexOf(spatial.hovered as THREE.Mesh);
    const title = model.title;
    const body = model.body;
    const signature = JSON.stringify([
      title,
      body,
      all.map((b) => b && [b.text, b.disabled]),
      hover,
      visible,
    ]);
    if (signature !== v.signature) {
      v.signature = signature;

      const c = display.ctx;
      c.fillStyle = "#0c1015";
      c.fillRect(0, 0, 1024, 768);
      c.strokeStyle = "#8a949e";
      c.strokeRect(2, 2, 1020, display.canvas.height - 4);
      c.fillStyle = "#aeb8c2";
      c.font = "22px sans-serif";
      c.fillText("HOLD TRIGGER HERE TO MOVE", 28, 35);
      c.fillStyle = "white";
      c.font = "bold 36px sans-serif";
      c.fillText(title, 28, 88);
      c.font = "26px sans-serif";
      lines(c, body, 28, 130, 960, 29);
      all.forEach((b, i) => {
        if (!b?.text) return;
        const x = i < 4 ? 20 : 20 + (i - 4) * 330,
          y = i < 4 ? 246 + i * 96 : 660,
          w = i < 4 ? 984 : 314;
        c.fillStyle = hover === i ? "#47515c" : "#242b33";
        c.fillRect(x, y, w, 84);
        c.strokeStyle = b.disabled ? "#3d4248" : "#9aa5af";
        c.strokeRect(x, y, w, 84);
        c.fillStyle = b.disabled ? "#818992" : "white";
        c.font = "32px sans-serif";
        c.fillText(b.text, x + 18, y + 52);
      });
      display.texture.needsUpdate = true;
    }
    const wristText = `HUNGER ${Math.ceil(r.kitchen.hunger)}% · THIRST ${Math.ceil(r.kitchen.thirst)}% | ${nightClockLabel(r.night)} · ${r.kitchen.oven!=="off"?`${r.kitchen.seconds>=45?"SMOKE":r.kitchen.oven==="ready"?"EAT":"OVEN"} ${Math.ceil((r.kitchen.oven==="cooking"?20:60)-r.kitchen.seconds)}s`: `${r.weapon.ammo}/6`}${alert ? " · LOUNGE ALERT" : ""}`;
    if (wristText !== v.watch) {
      v.watch = wristText;
      const c = watch.ctx;
      c.fillStyle = "#10161b";
      c.fillRect(0, 0, 512, 128);
      c.fillStyle = "white";
      c.font = "26px sans-serif";
      const t = wristText.split(" | ");
      c.fillText(t[0], 18, 42);
      c.fillText(t[1], 18, 88);
      watch.texture.needsUpdate = true;
    }
    if (process.env.NODE_ENV === "development") {
      gl.domElement.dataset.vrScreen = JSON.stringify({
        visible,
        title,
        body,
        buttons: all.filter((b) => b?.text).map((b) => b!.text),
        position: panel.current.position.toArray(),
        dragging: spatial.dragging,
      });
      vrTestTargets.length = 0;
      if (visible && grab.current) {
        const p = grab.current.getWorldPosition(new THREE.Vector3());
        xrStore.getState().origin?.worldToLocal(p);
        vrTestTargets.push({
          text: "Grab bar",
          position: p.toArray() as [number, number, number],
        });
      }
      all.forEach((b, i) => {
        if (visible && b && buttons.current[i]) {
          const p = buttons.current[i]!.getWorldPosition(new THREE.Vector3());
          xrStore.getState().origin?.worldToLocal(p);
          vrTestTargets.push({
            text: b.text,
            position: p.toArray() as [number, number, number],
          });
        }
      });
    }
  });
  return (
    <>
      <group ref={panel} userData={{ vrUI: true }}>
        <mesh renderOrder={100}>
          <planeGeometry args={[1.3, 0.975]} />
          <meshBasicMaterial
            map={display.texture}
            toneMapped={false}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        <mesh
          ref={(n) => {
            registerUI(grab.current, n);
            grab.current = n;
          }}
          position={[0, 0.46, 0.01]}
          userData={{ vrGrab: true, vrUI: true }}
        >
          <planeGeometry args={[1.3, 0.08]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh
            key={i}
            ref={(n) => {
              registerUI(buttons.current[i], n);
              buttons.current[i] = n;
            }}
            position={
              i < 4
                ? [0, 0.4875 - ((288 + i * 96) / 768) * 0.975, 0.01]
                : [-0.42 + (i - 4) * 0.42, 0.4875 - (702 / 768) * 0.975, 0.01]
            }
            userData={buttonData[i]}
          >
            <planeGeometry args={i < 4 ? [1.25, 0.107] : [0.4, 0.107]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <VRPreview />
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
});
export function VRFeed() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const lost = () => {
      feedHealth.failed = true;
      if (process.env.NODE_ENV === "development")
        gl.domElement.dataset.vrFeedContext = "lost";
    };
    const restored = () => {
      if (process.env.NODE_ENV === "development")
        gl.domElement.dataset.vrFeedContext = "restored";
      // Wait for an explicit retry rather than immediately repeating the failing work.
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    gl.domElement.addEventListener("webglcontextrestored", restored);
    return () => {
      gl.domElement.removeEventListener("webglcontextlost", lost);
      gl.domElement.removeEventListener("webglcontextrestored", restored);
    };
  }, [gl]);

  const mesh = useRef<THREE.Mesh>(null),
    timer = useRef(0),
    alertAnchor = useRef("");
  const target = useMemo(
      () =>
        new THREE.WebGLRenderTarget(VR_FEED_WIDTH, VR_FEED_HEIGHT, {
          depthBuffer: true,
          samples: 0,
        }),
      [],
    ),
    camera = useMemo(() => {
      const c = new THREE.PerspectiveCamera(
        62,
        VR_FEED_WIDTH / VR_FEED_HEIGHT,
        0.08,
        35,
      );
      c.userData.loungeInset = true;
      return c;
    }, []);
  const peepholeTarget = useMemo(
    () =>
      new THREE.WebGLRenderTarget(512, 288, { depthBuffer: true, samples: 0 }),
    [],
  );
  const peephole = useMemo(() => ({ value: 0 }), []);
  const shadePeephole = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.peephole = peephole;
      shader.fragmentShader =
        "uniform float peephole;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `
      #ifdef USE_MAP
      float rim = smoothstep(0.35, 0.5, length((vMapUv - 0.5) * vec2(1.0, 0.5625)));
      outgoingLight *= mix(1.0, 1.0 - rim * 0.94, peephole);
      #endif
      #include <opaque_fragment>
    `,
      );
    },
    [peephole],
  );
  const arcade = useMemo(() => surface(960, 540), []);
  const diagnostics = useRef({ key: "", renders: 0, lastMs: 0 });
  useEffect(() => {
    retryVRFeed();
    return () => {
      retryVRFeed();
    };
  }, []);
  useEffect(
    () => () => {
      target.dispose();
      peepholeTarget.dispose();
      arcade.texture.dispose();
    },
    [target, peepholeTarget, arcade],
  );
  useFrame(({ gl, scene, camera: head }, dt) => {
    if (!mesh.current) return;
    const s = useGame.getState(),
      r = s.room,
      alert = loungeAlert(r.residents),
      view = r.view;
    const active =
      !s.panel && !s.suspension && s.focused && !r.judgement && spatial.feed;
    if (process.env.NODE_ENV === "development") {
      const key = `${view}:${r.feed}:${active}`;
      if (diagnostics.current.key !== key) {
        diagnostics.current.key = key;
        gl.domElement.dataset.vrFeed = JSON.stringify({ event: "view", key });
      }
    }
    mesh.current.visible = active && !feedHealth.failed;
    if (!active || feedHealth.failed) return;
    const inspection = view === "inspect" || view === "door";
    peephole.value = inspection ? 1 : 0;
    const activeTarget = inspection ? peepholeTarget : target;
    const passive = view === "explore" && !!alert;
    mesh.current.scale.setScalar(passive ? 0.6 : inspection ? 1.25 / 1.1 : 1);
    if (passive) {
      if (alertAnchor.current !== alert!.id) {
        alertAnchor.current = alert!.id;
        head.getWorldPosition(mesh.current.position);
        head.getWorldQuaternion(mesh.current.quaternion);
        mesh.current.translateZ(-1.6);
        mesh.current.translateX(0.65);
        mesh.current.translateY(0.35);
      }
    } else if (spatial.panel) {
      alertAnchor.current = "";
      mesh.current.position
        .set(
          inspection ? (s.save.settings.vr.leftHanded ? 1.35 : -1.35) : 0,
          inspection ? 0 : 0.84,
          0.002,
        )
        .applyMatrix4(spatial.panel.matrixWorld);
      mesh.current.quaternion.copy(spatial.panel.quaternion);
    }
    timer.current += dt;
    if (timer.current < (view === "arcade" ? 1 / 30 : VR_FEED_INTERVAL)) return;
    if (performance.now() - spatial.auxiliaryFrame < 6) return;
    spatial.auxiliaryFrame = performance.now();
    timer.current = 0;
    const material = mesh.current.material as THREE.MeshBasicMaterial;
    if (view === "arcade") {
      const c = document.querySelector<HTMLCanvasElement>(
        "[data-anomalous-arcade]",
      );
      if (c) {
        arcade.ctx.drawImage(c, 0, 0, 960, 540);
        arcade.texture.needsUpdate = true;
        if (material.map !== arcade.texture) {
          material.map = arcade.texture;
          material.needsUpdate = true;
        }
      }
      return;
    }
    if (view === "inspect" || view === "door") {
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
    camera.layers.disable(4);
    if(view === "cctv" && r.feed === r.stalker.feed) camera.layers.enable(4);
    if (
      process.env.NODE_ENV === "development" &&
      gl.domElement.dataset.vrFeedDisabled === "true"
    )
      return;
    const began = performance.now();
    const rendered = renderVRFeed(gl, scene, camera, activeTarget);
    if (process.env.NODE_ENV === "development") {
      diagnostics.current.renders += Number(rendered);
      diagnostics.current.lastMs = performance.now() - began;
      gl.domElement.dataset.vrFeed = JSON.stringify({
        ...diagnostics.current,
        failed: feedHealth.failed,
        contextLost: gl.getContext().isContextLost(),
      });
    }
    if (rendered && view === "cctv") { spatial.lastFeed=r.feed; spatial.lastFeedAt=performance.now(); }
    if (!rendered) {
      mesh.current.visible = false;
      return;
    }
    if (material.map !== activeTarget.texture) {
      material.map = activeTarget.texture;
      material.needsUpdate = true;
    }
  });
  return (
    <mesh
      ref={mesh}
      renderOrder={101}
      visible={false}
      userData={{ vrUI: true }}
    >
      <planeGeometry args={[1.1, 0.619]} />
      <meshBasicMaterial
        map={target.texture}
        onBeforeCompile={shadePeephole}
        toneMapped={false}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

function VRPreview() {
  const [preview, setPreview] = useState<typeof spatial.preview>(null),
    group = useRef<THREE.Group>(null),
    signature = useRef("");
  useFrame((_, dt) => {
    const raw = JSON.stringify(spatial.preview);
    if (raw !== signature.current) {
      signature.current = raw;
      setPreview(spatial.preview);
    }
    if (group.current && spatial.panel) {
      group.current.position
        .set(0.88, 0, 0)
        .applyMatrix4(spatial.panel.matrixWorld);
      group.current.rotation.y += dt * 0.35;
    }
  });
  useEffect(() => {
    const restored: {
      mesh: THREE.Mesh;
      material: THREE.Material | THREE.Material[];
      order: number;
    }[] = [];
    group.current?.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        restored.push({ mesh: o, material: o.material, order: o.renderOrder });
        const clone = (m: THREE.Material) => {
          const c = m.clone();
          c.depthTest = false;
          c.depthWrite = false;
          return c;
        };
        o.material = Array.isArray(o.material)
          ? o.material.map(clone)
          : clone(o.material);
        o.renderOrder = 102;
      }
    });
    return () =>
      restored.forEach(({ mesh, material, order }) => {
        (Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        ).forEach((m) => m.dispose());
        mesh.material = material;
        mesh.renderOrder = order;
      });
  }, [preview]);
  return (
    <group
      ref={group}
      scale={0.28}
      visible={!!preview}
      userData={{ vrUI: true }}
    >
      {preview &&
        (preview.pet ? (
          <PetModel id={preview.petId} colour={preview.colour} />
        ) : (
          <Cone colour={preview.colour} outfit={preview.outfit} />
        ))}
      <pointLight position={[0, 2, 2]} intensity={3} distance={3} />
    </group>
  );
}

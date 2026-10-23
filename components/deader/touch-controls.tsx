"use client";
import { ActionIcon } from "./action-icon";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { gameInput, joystick, touchLookScale, shouldResetTouchOnResize, requiresResume, type InterruptionEvent } from "@/lib/deader/input";
import { useVR } from "@/lib/deader/vr-state";
import { useGame } from "@/lib/deader/store";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { interactRoom } from "./room-controller";
import styles from "./game.module.css";

export function TouchControls() {
  const s = useGame();
  const [thumb, setThumb] = useState({ x: 0, z: 0 });
  const captures = useRef(new Map<number, HTMLElement>());
  const releaseCaptures = () => {
    for (const [id, element] of captures.current) {
      try { if (element.hasPointerCapture(id)) element.releasePointerCapture(id); } catch {}
    }
    captures.current.clear();
  };
  const last = useRef({ x: 0, y: 0 });
  const swipeScale = useRef(1);
  useEffect(() => {
    const choose = (touch: boolean) => {
      const state = useGame.getState();
      const active = state.save.settings.controls === "touch" ||
        (state.save.settings.controls === "auto" && touch);
      if (active !== state.touchActive) gameInput.reset();
      useGame.setState({ touchActive: active });
    };
    const pointer = (e: globalThis.PointerEvent) => {
      if (e.pointerType === "touch") choose(true);
      // Synthetic mouse events after touch must not switch controls.
      else if (e.pointerType === "mouse") choose(false);
    };
    const key = (e: KeyboardEvent) => {
      if (/^(Key[WASDE]|Arrow)/.test(e.code)) choose(false);
    };
    const interrupt = (event: InterruptionEvent) => {
      if (useVR.getState().active) return; // The XR session owns headset interruption/resume.
      gameInput.reset(); releaseCaptures(); setThumb({ x: 0, z: 0 });
      if (requiresResume(event)) {
        roomAudio.silence();
        useGame.setState({ suspension: "interrupted" });
      }
    };
    const visibility = () => { if (useVR.getState().active) return; if (document.hidden) interrupt("hidden"); else useGame.setState({ focused: true }); };
    const blur = () => interrupt("blur");
    let viewportWidth = window.innerWidth;
    const orientation = () => {
      if (shouldResetTouchOnResize(viewportWidth, window.innerWidth)) interrupt("resize");
      viewportWidth = window.innerWidth;
    };
    const pagehide = () => interrupt("pagehide");
    choose(matchMedia("(pointer: coarse)").matches);
    window.addEventListener("pointerdown", pointer, true);
    window.addEventListener("keydown", key, true);
    window.addEventListener("resize", orientation);
    window.addEventListener("blur", blur);
    window.addEventListener("pagehide", pagehide);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      gameInput.reset();
      releaseCaptures();
      window.removeEventListener("pointerdown", pointer, true);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", orientation);
      window.removeEventListener("blur", blur);
      window.removeEventListener("pagehide", pagehide);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [s.save.settings.controls]);
  useEffect(() => useGame.subscribe((state, previous) => {
    if (state.panel !== previous.panel || state.scene !== previous.scene ||
        state.room.view !== previous.room.view || state.suspension !== previous.suspension ||
        state.room.survival.phase !== previous.room.survival.phase) gameInput.reset();
  }), []);
  useEffect(() => {
    gameInput.reset();
    releaseCaptures();
    setThumb({ x: 0, z: 0 });
    if (s.touchActive && document.pointerLockElement) document.exitPointerLock();
  }, [s.panel, s.scene, s.room.view, s.room.survival.phase, s.suspension, s.touchActive]);

  const enabled = s.ready && s.touchActive && !s.panel && !s.suspension && s.focused &&
    (s.scene === "lobby" || (s.room.view === "explore" && s.room.survival.phase === "idle" && s.room.night?.status !== "completed" && !s.room.judgement));
  const canControl = () => { const state = useGame.getState(); return state.touchActive && !state.panel && !state.suspension && state.focused && (state.scene === "lobby" || (state.room.view === "explore" && state.room.survival.phase === "idle" && state.room.night?.status !== "completed" && !state.room.judgement)); };
  const release = (e: PointerEvent) => {
    gameInput.release(e.pointerId, e.type === "pointercancel" || e.type === "lostpointercapture");
    captures.current.delete(e.pointerId);
    setThumb({ ...gameInput.axes });
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!canControl() || gameInput.owners.move !== e.pointerId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    gameInput.axes = joystick(e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2, (rect.width - (rect.width >= 176 ? 64 : 48)) / 2);
    setThumb({ ...gameInput.axes });
  };
  return <>
    {enabled && <div className={styles.touchLayer} aria-label="Touch game controls">
      {<div className={styles.lookPad} onContextMenu={e => e.preventDefault()} aria-label="Swipe to look"
        onPointerDown={e => {
          if (!canControl() || !gameInput.claim("look", e.pointerId)) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          captures.current.set(e.pointerId, e.currentTarget);
          last.current = { x: e.clientX, y: e.clientY };
          swipeScale.current = touchLookScale(window.innerWidth, window.innerHeight);
        }}
        onPointerMove={e => {
          if (!canControl() || gameInput.owners.look !== e.pointerId) return;
          const scale = swipeScale.current;
          gameInput.look.x += (e.clientX - last.current.x) * scale;
          gameInput.look.y += (e.clientY - last.current.y) * scale;
          last.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
        <span>Swipe to look</span>
      </div>}
      <div className={styles.joystick} onContextMenu={e => e.preventDefault()} aria-label="Movement joystick"
        onPointerDown={e => {
          if (!canControl() || !gameInput.claim("move", e.pointerId)) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          captures.current.set(e.pointerId, e.currentTarget);
          move(e);
        }}
        onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
        <span style={{ "--move-x": thumb.x, "--move-z": thumb.z } as CSSProperties} />
        <small>Move</small>
      </div>
      <button className={styles.touchInteract} disabled={!s.prompt} onClick={() => {
        gameInput.reset();
        roomAudio.unlock();
        if (s.scene === "room") interactRoom();
        else s.interactLobby();
      }}>{s.prompt ?? (s.scene === "lobby" ? "Walk to a station" : "Look at an object")}</button>
    </div>}
    {s.suspension && !s.panel && <div className={styles.suspendScrim}>
      <section role="dialog" aria-modal="true" aria-label="Game suspended" className={styles.modal} onKeyDown={e => {
        if (e.key !== "Tab") return;
        const buttons = e.currentTarget.querySelectorAll("button");
        const first = buttons[0], final = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); final.focus(); }
        else if (!e.shiftKey && document.activeElement === final) { e.preventDefault(); first.focus(); }
      }}>
        <h2>Paused</h2>
        <p>Your shift, visitors and decision countdown are paused.</p>
        <button className={styles.primary} autoFocus onClick={() => {
          gameInput.reset(); roomAudio.unlock();
          useGame.setState({ suspension: null, focused: true });
        }}><ActionIcon name="play" />Return to game</button>
        <button onClick={() => s.open("pause")}><ActionIcon name="settings" />Open menu</button>
      </section>
    </div>}
  </>;
}

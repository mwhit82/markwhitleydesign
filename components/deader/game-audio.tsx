"use client";
import { useEffect, useRef } from "react";
import { useGame } from "@/lib/deader/store";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { roomPlayerPose } from "./player-reflection";
import { tvSound } from "@/lib/deader/tv";
import { ambienceLevel } from "@/lib/deader/presentation";
/** Audio follows the same pause/scene authority as gameplay; it never advances gameplay. */
export function GameAudio() {
  const diagnostics = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let ovenSignal = "", needsSignal = "", fireSignal = "";
    let seconds = 0,
      nextCreak = 19,
      previousRun = "";
    const unlock = () => {
      if (!useGame.getState().save.settings.muted) roomAudio.unlock();
    };
    const stop = () => roomAudio.silence();
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    const timer = window.setInterval(() => {
      const s = useGame.getState(),
        r = s.room,
        settings = s.save.settings;
      if (diagnostics.current)
        diagnostics.current.dataset.audioStats = JSON.stringify(
          roomAudio.diagnostics(),
        );
      roomAudio.muted = settings.muted;
      roomAudio.volume = settings.volume;
      roomAudio.gentle = settings.gentleScares;
      if (
        s.panel ||
        (!s.focused || !!s.suspension) ||
        document.hidden ||
        settings.muted ||
        !s.ready
      ) {
        roomAudio.silence();
        return;
      }
      roomAudio.lobbyMusic(s.scene === "lobby" ? settings.ambience : 0);
      if (previousRun !== r.encounters.runId) {
        seconds = 0;
        nextCreak = 19;
        previousRun = r.encounters.runId;
      }
      if (s.scene === "room" && r.night?.status === "completed") {
        roomAudio.broadcast(false);
        roomAudio.ambience(0);
        return;
      }
      const k=r.kitchen;
      if(s.scene==="room"&&k.failure==="fire"&&fireSignal!==r.encounters.runId){roomAudio.play("rumble");fireSignal=r.encounters.runId;}
      const oven=s.scene!=="room"||r.judgement||r.night?.status==="failed"?"":k.oven==="ready"?`${k.seconds>=45?Math.floor(k.seconds/3):"ready"}`:"";
      if(oven&&oven!==ovenSignal)roomAudio.play("oven");
      ovenSignal=oven;
      const needs=s.scene!=="room"||r.night?.status!=="running"?"":`${k.hunger<=10?2:k.hunger<=25?1:0}:${k.thirst<=10?2:k.thirst<=25?1:0}`;
      if(needs&&needs!=="0:0"&&needs!==needsSignal)roomAudio.play("oven");
      needsSignal=needs;
      seconds += 0.1;
      const busy = s.scene === "room" && (r.survival.phase !== "idle" || !!r.judgement);
      const spatial = tvSound(roomPlayerPose.x, roomPlayerPose.z, roomPlayerPose.yaw);
      roomAudio.broadcast(s.scene === "room", spatial.gain * (busy ? .15 : 1), spatial.pan);
      roomAudio.ambience(
        busy
          ? 0
          : settings.ambience *
              ambienceLevel(seconds) *
              (s.scene === "lobby" ? 0.65 : 1),
        r.view === "cctv",
      );
      if (seconds >= nextCreak) {
        nextCreak = seconds + 23 + (Math.floor(seconds) % 11);
        if (!busy && r.view === "explore" && settings.ambience > 0)
          roomAudio.play("vent", Math.sin(seconds) * 0.65);
      }
    }, 100);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      roomAudio.dispose();
    };
  }, []);
  return process.env.NODE_ENV === "development" ? (
    <span hidden aria-hidden="true" ref={diagnostics} data-audio-stats="" />
  ) : null;
}

"use client";
import { useEffect, useRef } from "react";
import { useGame } from "@/lib/deader/store";
import { roomAudio } from "@/lib/deader/audio/room-audio";
import { ambienceLevel } from "@/lib/deader/presentation";
/** Audio follows the same pause/scene authority as gameplay; it never advances gameplay. */
export function GameAudio() {
  const diagnostics = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let seconds = 0,
      nextCreak = 19,
      previousView = "",
      previousRun = "",
      previousTrust = 3;
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
      if (previousRun !== r.encounters.runId) {
        seconds = 0;
        nextCreak = 19;
        previousView = "";
        previousTrust = 3;
        previousRun = r.encounters.runId;
      }
      if (s.scene === "room" && r.night?.status === "completed") {
        roomAudio.ambience(0);
        return;
      }
      seconds += 0.1;
      const busy = s.scene === "room" && r.survival.phase !== "idle";
      roomAudio.ambience(
        busy
          ? 0
          : settings.ambience *
              ambienceLevel(seconds) *
              (s.scene === "lobby" ? 0.65 : r.view === "news" ? 0.3 : 1),
        r.view === "cctv",
      );
      if (s.scene === "room" && r.view === "news" && previousView !== "news")
        roomAudio.play("news");
      if (s.scene === "room" && r.encounters.trust !== previousTrust) {
        roomAudio.play("gulp", 0.6);
        previousTrust = r.encounters.trust;
      }
      if (seconds >= nextCreak) {
        nextCreak = seconds + 23 + (Math.floor(seconds) % 11);
        if (!busy && r.view === "explore" && settings.ambience > 0)
          roomAudio.play("vent", Math.sin(seconds) * 0.65);
      }
      previousView = r.view;
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

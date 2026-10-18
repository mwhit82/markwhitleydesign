"use client";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { isQuestBrowser } from "@/lib/deader/vr";
import { useVR } from "@/lib/deader/vr-state";
import { roomAudio } from "@/lib/deader/audio/room-audio";
const Dev = lazy(() => import("./vr/dev"));
const Runtime = lazy(() => import("./vr/runtime"));
export function VRBoundary({ children }: { children: ReactNode }) {
  const enabled = useVR((s) => s.enabled);
  return enabled ? (
    <Suspense fallback={children}>
      <Runtime>{children}</Runtime>
    </Suspense>
  ) : (
    children
  );
}
export function VREntry() {
  const state = useVR();
  const [dev, setDev] = useState(false);
  useEffect(() => {
    let live = true;
    if (
      process.env.NODE_ENV === "development" &&
      new URLSearchParams(location.search).get("vrtest") === "1"
    ) {
      void import("./vr/dev").then((m) => {
        if (live) {
          m.installEmulator();
          setDev(true);
        }
      });
      return () => {
        live = false;
      };
    }
    if (
      isQuestBrowser(navigator.userAgent) &&
      window.isSecureContext &&
      navigator.xr
    )
      navigator.xr
        .isSessionSupported("immersive-vr")
        .then((supported) => {
          if (live && supported) useVR.setState({ enabled: true });
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  if (!state.enabled) return null;
  return (
    <>
      {dev && (
        <Suspense fallback={null}>
          <Dev />
        </Suspense>
      )}
      <div
        data-vr-exclude
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 30,
        }}
      >
        <button
          disabled={!state.ready}
          onClick={async () => {
            try {
              roomAudio.unlock();
              const runtime = await import("./vr/runtime");
              if (state.active) await runtime.xrStore.getState().session?.end();
              else await runtime.xrStore.enterVR();
            } catch {
              useVR.setState({
                error:
                  "Could not start VR. Open this HTTPS page in Quest Browser and try again.",
              });
            }
          }}
        >
          {state.active
            ? "Exit VR"
            : state.ready
              ? "Enter VR · Quest controllers"
              : "Preparing VR…"}
        </button>
        {state.error && <p role="alert">{state.error}</p>}
      </div>
    </>
  );
}

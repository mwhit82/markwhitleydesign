import type { useGame } from "./store";
/** Hover never opens a surface. Only explicit activation changes game state. */
export const VR_TARGETS = [
  "Shop",
  "Customise",
  "Start",
  "Learn to play",
  "Door",
  "CCTV",
  "Take gun",
  "Put gun back",
  "Watch TV",
  "Watch lounge TV",
  "Donut",
  "Vent",
] as const;
export type VRTarget = (typeof VR_TARGETS)[number];
export const isVRTarget = (value: unknown): value is VRTarget =>
  VR_TARGETS.includes(value as VRTarget);
type State = ReturnType<typeof useGame.getState>;
export function vrPanelVisible(
  s: Pick<State, "panel" | "suspension" | "tutorial" | "room">,
) {
  return (
    !s.room.judgement &&
    (!!s.panel ||
      !!s.suspension ||
      !!s.tutorial ||
      s.room.view !== "explore" ||
      s.room.night?.status === "completed" ||
      s.room.survival.phase === "gameover")
  );
}
export function activateVRTarget(
  s: State,
  target: VRTarget,
  patch: (p: Partial<State>) => void,
): boolean {
  if (s.panel || s.suspension || !s.focused) return false;
  if (s.scene === "lobby") {
    if (target === "Learn to play") {
      // Reuse tutorial's existing practice transition, but never publish hover prompts.
      patch({ prompt: target });
      s.interactLobby();
      patch({ prompt: null });
      return true;
    }
    const panel =
      target === "Shop"
        ? "shop"
        : target === "Customise"
          ? "wardrobe"
          : target === "Start" && !s.tutorial
            ? "start"
            : null;
    if (panel) {
      s.open(panel);
      return true;
    }
    return false;
  }
  if (
    s.room.view !== "explore" ||
    s.room.survival.phase !== "idle" ||
    s.room.judgement ||
    s.room.night?.status === "completed"
  )
    return false;
  if (target === "Take gun") {
    patch({ prompt: target });
    s.collectWeapon();
    patch({ prompt: null });
    return true;
  }
  if (target === "Put gun back") {
    patch({ prompt: target });
    s.returnWeapon();
    patch({ prompt: null });
    return true;
  }
  if (target === "Door") {
    s.roomView("door");
    s.doorEvent({ type: "inspect" });
    return true;
  }
  if (target === "CCTV") {
    if (s.room.encounters.active?.phase === "waiting")
      patch({ room: { ...s.room, feed: 4 } });
    s.roomView("cctv");
    return true;
  }
  if (target === "Vent") {
    patch({ room: { ...s.room, feed: 1 } });
    s.roomView("cctv");
    return true;
  }
  if (target === "Watch TV" || target === "Watch lounge TV") {
    s.roomView(target === "Watch TV" ? "tv" : "lounge-tv");
    return true;
  }
  if (target === "Donut") {
    s.roomView("donut");
    return true;
  }
  return false;
}
/** VR overrides allow a handle-sized target while desktop retains the whole door. */
export function vrInteractionName(
  object: { userData: Record<string, unknown>; parent: unknown } | null,
): VRTarget | null {
  let current = object;
  while (current) {
    const data = current.userData;
    const name =
      data.vrInteraction ??
      (!data.vrIgnoreInteraction ? data.interaction : null);
    if (isVRTarget(name)) return name;
    current = current.parent as typeof current;
  }
  return null;
}

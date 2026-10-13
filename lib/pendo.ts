/**
 * Pendo Track Events. Each name is registered in Pendo and matched exactly, so
 * it must be emitted verbatim. Calls are no-ops until the Pendo agent loads.
 */
export type TrackEventName =
  | "rally_run_started"
  | "rally_run_completed"
  | "rally_personal_best_set"
  | "rally_run_abandoned"
  | "rally_run_marked_practice"
  | "rally_leaderboard_time_submitted"
  | "rally_leaderboard_submit_failed"
  | "rally_leaderboards_searched"
  | "rally_stage_leaderboard_filtered"
  | "rally_leaderboard_load_failed"
  | "rally_friend_room_created"
  | "rally_friend_room_joined"
  | "rally_friend_room_entry_failed"
  | "rally_friend_invite_link_copied"
  | "rally_friend_race_started"
  | "rally_friend_race_finished"
  | "rally_friend_room_left"
  | "rally_friend_room_connection_lost"
  | "rally_setting_changed"
  | "rally_controller_connection_changed"
  | "rally_audio_failed"
  | "rally_graphics_auto_downgraded"
  | "rally_game_load_failed"
  | "rally_leader_ghost_fetched"
  | "rally_home_screen_app_launched"
  | "theme_changed"
  | "clay_study_load_failed";

type PropertyValue =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly number[];
export type TrackProperties = Record<
  string,
  PropertyValue | null | undefined
>;
type PendoAgent = {
  track?: (event: string, properties: Record<string, PropertyValue>) => void;
};

/** Pendo limits each event's properties to 512 bytes, so clip long text. */
const maxStringLength = 120;

/**
 * Sends a Pendo Track Event. Pass a function to build the properties only when
 * the agent is present. Empty values are dropped and long strings clipped.
 * Tracking is best-effort: a failure here never interrupts the site.
 */
export function trackEvent(
  event: TrackEventName,
  properties: TrackProperties | (() => TrackProperties) = {},
) {
  if (typeof window === "undefined") return;
  const pendo = (window as Window & { pendo?: PendoAgent }).pendo;
  if (!pendo || typeof pendo.track !== "function") return;
  try {
    const values =
      typeof properties === "function" ? properties() : properties;
    const payload: Record<string, PropertyValue> = {};
    for (const [key, value] of Object.entries(values)) {
      if (value === null || value === undefined) continue;
      if (typeof value === "number" && !Number.isFinite(value)) continue;
      payload[key] =
        typeof value === "string" ? value.slice(0, maxStringLength) : value;
    }
    pendo.track(event, payload);
  } catch {
    // Analytics must never affect gameplay or navigation.
  }
}

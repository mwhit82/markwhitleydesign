/** Exactly one clock owner; XR visibility is independent of document.hidden. */
export function simulationActive(driver: "page" | "xr", xrActive: boolean, visible: boolean) {
  return visible && (driver === "xr" ? xrActive : !xrActive);
}

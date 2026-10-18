"use client";
import { create } from "zustand";
/** Session state is never saved. Controllers write this shared physical pose. */
export const vrPose = { x: 0, y: 1.6, z: 0, yaw: 0, walking: false };
export const useVR = create<{
  enabled: boolean;
  ready: boolean;
  active: boolean;
  error: string | null;
  recenter: number;
}>(() => ({
  enabled: false,
  ready: false,
  active: false,
  error: null,
  recenter: 0,
}));

export const vrTestTargets: {
  text: string;
  position: [number, number, number];
}[] = [];
/** Actual scene targets exposed only to the development controller rehearsal. */
export const vrWorldTargets: {
  text: string;
  position: [number, number, number];
}[] = [];

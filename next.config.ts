import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    reactStrictMode: true,
    // Preserve ws runtime optional-native fallback; bundling produces invalid bufferutil stubs.
    serverExternalPackages: ["ws", "@vercel/functions"],
    // Keep dev and production build artifacts separate so local preview
    // and build verification do not corrupt each other's cache/runtime state.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  };
}

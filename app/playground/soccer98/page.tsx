import type { Metadata, Viewport } from "next";
import { Soccer98 } from "@/components/soccer98/soccer98";
export const metadata: Metadata = {
  manifest: "/soccer98/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Soccer98", statusBarStyle: "black-translucent" },
  title: "Soccer98 | Mark Whitley",
  description: "Retro football meets Snake. Collect the ball and keep running as a growing trail of defenders chases you.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#17372e" };
export default function Soccer98Page() { return <Soccer98 />; }

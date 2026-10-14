import type { Metadata, Viewport } from "next";
import { RallyGame } from "@/components/rally/rally-game";
export const metadata: Metadata = {
  manifest: "/rally/manifest.webmanifest",
  other: { "apple-mobile-web-app-capable": "yes" },
  appleWebApp: {
    capable: true,
    title: "Pocket Rally",
    statusBarStyle: "black-translucent",
  },
  icons: { apple: "/rally/icon-180.png", icon: "/rally/icon-192.png" },
  title: "Pocket Rally | Mark Whitley",
  description:
    "A tiny handmade rally. Four iconic cars, one forest stage, and another shot at your best time.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#233c32",
};
export default function RallyPage() {
  return <RallyGame immersive />;
}

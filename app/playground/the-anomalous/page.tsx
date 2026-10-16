import type { Metadata, Viewport } from "next";
import Game from "@/components/deader/client";
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };
export const metadata: Metadata = {
  title: "The Anomalous | Fenn’s After Hours Club",
  alternates: { canonical: "https://www.markwhitley.design/playground/the-anomalous" },
  description:
    "A fresh face. A very long night. Explore Fenn’s cone-shaped survival horror world.",
};
export default function AnomalousPage() {
  return <Game />;
}

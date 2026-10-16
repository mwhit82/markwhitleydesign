import { permanentRedirect } from "next/navigation";

export default function LegacyDeaderPage() {
  permanentRedirect("/playground/the-anomalous");
}

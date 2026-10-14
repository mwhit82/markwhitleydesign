import type { Metadata } from "next";
import { Soccer98 } from "@/components/soccer98/soccer98";
export const metadata: Metadata = {
  title: "Soccer98 | Mark Whitley",
  description: "Retro football meets Snake. Collect the ball and keep running as a growing trail of defenders chases you.",
};
export default function Soccer98Page() { return <Soccer98 />; }

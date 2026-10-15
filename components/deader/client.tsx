"use client";
import dynamic from "next/dynamic";
const Game = dynamic(() => import("./game"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        background: "#15100b",
        color: "#eee5d3",
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
      }}
    >
      Opening the night shift…
    </div>
  ),
});
export default Game;

export const cars = [
  {
    name: "Subaru Impreza",
    year: "1993",
    color: "#2459bc",
    accent: "#f4d24b",
    trait: "The all-rounder",
    grip: 7.2,
    steer: 2.05,
    power: 15,
    shape: "sedan",
  },
  {
    name: "Ford Escort RS Cosworth",
    year: "1993",
    color: "#f0eadd",
    accent: "#2472ae",
    trait: "Playful through the hairpins",
    grip: 6.4,
    steer: 2.25,
    power: 15,
    shape: "wing",
  },
  {
    name: "Toyota Celica GT-Four",
    year: "1992",
    color: "#ece8db",
    accent: "#cc4030",
    trait: "Smooth and planted",
    grip: 8,
    steer: 1.95,
    power: 15.3,
    shape: "coupe",
  },
  {
    name: "Lancia Delta Integrale",
    year: "1992",
    color: "#e4d9bc",
    accent: "#a72d32",
    trait: "Small, sharp, nimble",
    grip: 7,
    steer: 2.4,
    power: 14.5,
    shape: "hatch",
  },
] as const;
export type Mode = "garage" | "countdown" | "race" | "paused" | "finished";
export const formatTime = (value: number) =>
  `${Math.floor(value / 60)
    .toString()
    .padStart(2, "0")}:${(value % 60).toFixed(2).padStart(5, "0")}`;

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
  {name:"Ford Sierra RS Cosworth",year:"1990",color:"#f1eddb",accent:"#2467ab",trait:"Long-legged rally saloon",grip:6.8,steer:1.98,power:15,shape:"sierra"},
  {name:"Volkswagen Golf GTI 16V",year:"1990",color:"#d84232",accent:"#272f31",trait:"Boxy, eager and precise",grip:7.5,steer:2.3,power:14.5,shape:"golf"},
  {name:"Peugeot 205 GTI",year:"1990",color:"#eee8d8",accent:"#e14c36",trait:"A featherweight through the bends",grip:6.9,steer:2.45,power:14.2,shape:"peugeot"},
  {name:"Renault Clio Williams",year:"1993",color:"#284e9a",accent:"#d7b357",trait:"Little blue corner hunter",grip:7.4,steer:2.3,power:14.7,shape:"clio"},
  {name:"Pocket Kart",year:"SPECIAL",color:"#414648",accent:"#eceee9",trait:"Country circuits · little driver, big ambition",grip:9.8,steer:2.35,power:14.4,shape:"kart"},
  {name:"Aster Hover GT",year:"SPECIAL",color:"#7060bc",accent:"#63e0db",trait:"Neon circuits · float above the asphalt",grip:8.2,steer:2.1,power:16,shape:"hover"},
  {name:"Mudworks 250",year:"SPECIAL",color:"#d79a38",accent:"#f0e6cc",trait:"Muddy hills · balanced for big air",grip:7.5,steer:2.5,power:15.5,shape:"bike"},
] as const;
export type Mode = "garage" | "countdown" | "race" | "paused" | "finished" | "celebrating";
export const formatTime = (value: number) =>
  `${Math.floor(value / 60)
    .toString()
    .padStart(2, "0")}:${(value % 60).toFixed(2).padStart(5, "0")}`;

import type { Decision, Difficulty } from "./game";
export const QUESTIONS = [
  { id: "identity", label: "Who are you?" },
  { id: "purpose", label: "Why are you here?" },
  { id: "origin", label: "Where have you come from?" },
] as const;
export type Question = (typeof QUESTIONS)[number]["id"];
export type VisitorDefinition = {
  id: string;
  name: string;
  kind: "human" | "anomaly";
  colour: string;
  appearance: "ordinary" | "third-eye" | "wide-mouth" | "splitter" | "glitched" | "kids";
  behaviour?: "mimic" | "mean";
  decisionPolicy?: "either";
  movement: "natural" | "stop-start" | "sway";
  dialogue: Record<Question, string>;
  clues: { source: "visual" | "cctv" | "dialogue"; description: string }[];
  explanation: string;
};
export const VISITORS: VisitorDefinition[] = [
  {
    id: "bea",
    name: "Bea",
    kind: "human",
    colour: "#ffc928",
    appearance: "ordinary",
    movement: "natural",
    dialogue: {
      identity: "I'm Bea, the downstairs caretaker.",
      purpose:
        "The lights went out downstairs. May I wait here while they're repaired?",
      origin: "The ground-floor boiler room. I came up the stairs.",
    },
    clues: [],
    explanation:
      "Bea had two ordinary eyes, a natural walk and a consistent account of coming from the boiler room.",
  },
  {
    id: "three",
    name: "Milo",
    kind: "anomaly",
    colour: "#8bdf26",
    appearance: "third-eye",
    movement: "stop-start",
    dialogue: {
      identity: "Milo. Ordinary Milo. Two eyes, just like everyone.",
      purpose: "I would like to stand very normally inside your room.",
      origin:
        "I came up the stairs. I stopped on every step to remember how legs work.",
    },
    clues: [
      {
        source: "visual",
        description: "A third eye sits above the usual two.",
      },
      {
        source: "cctv",
        description: "Stops and starts mechanically on the stairs.",
      },
      {
        source: "dialogue",
        description: "Claims to have two eyes despite the visible third eye.",
      },
    ],
    explanation:
      "Milo's extra eye contradicted the two-eye claim, and the staircase movement was mechanical.",
  },
  {
    id: "pippa",
    name: "Pippa",
    kind: "human",
    colour: "#f78fb9",
    appearance: "ordinary",
    movement: "natural",
    dialogue: {
      identity: "Pippa. I deliver the evening post.",
      purpose: "The street is closed. Could I shelter here until morning?",
      origin:
        "The post room on the ground floor. I used the stairs because the lift is broken.",
    },
    clues: [],
    explanation:
      "Pippa's appearance and walk were ordinary, and all three answers agreed.",
  },
  {
    id: "echo",
    name: "Robin",
    kind: "anomaly",
    colour: "#29488f",
    appearance: "ordinary",
    movement: "natural",
    dialogue: {
      identity:
        "Robin, your upstairs neighbour. I have lived upstairs for years.",
      purpose:
        "I have never been inside this building before. Please let me in.",
      origin:
        "I came from my flat upstairs. I have never been inside this building before.",
    },
    clues: [
      {
        source: "dialogue",
        description:
          "Claims to live upstairs and to have never entered this building.",
      },
    ],
    explanation:
      "Robin claimed to have lived upstairs for years, then insisted they had never entered the building. The contradiction was the clue.",
  },
  {
    id: "sam",
    name: "Sam",
    kind: "human",
    colour: "#8bdf26",
    appearance: "ordinary",
    movement: "natural",
    dialogue: {
      identity: "Sam. I'm the night cleaner.",
      purpose:
        "I heard the warning on the radio. I'd rather not be alone downstairs.",
      origin:
        "The ground-floor supply cupboard. I put my mop away before coming up.",
    },
    clues: [],
    explanation:
      "Sam gave consistent answers about the night-cleaning job and had no deliberate Anomaly tells.",
  },
  {
    id: "grin",
    name: "Kit",
    kind: "anomaly",
    colour: "#f78fb9",
    appearance: "wide-mouth",
    movement: "sway",
    dialogue: {
      identity: "Kit. I am smiling the correct amount.",
      purpose: "Warm room. Warm room. Warm room.",
      origin: "The stairs brought me here. I did not need to move my feet.",
    },
    clues: [
      { source: "visual", description: "An impossibly wide, tall mouth." },
      { source: "cctv", description: "Repeated rigid side-to-side swaying." },
      {
        source: "dialogue",
        description:
          "Repeats the same phrase rather than explaining why they need shelter.",
      },
    ],
    explanation:
      "Kit's oversized mouth, rigid swaying and repeated answers were discoverable warning signs.",
  },
];
VISITORS.push(
  {
    id: "porter",
    name: "Ash",
    kind: "human",
    colour: "#bb963e",
    appearance: "ordinary",
    movement: "natural",
    dialogue: {
      identity: "Ash, the relief porter.",
      purpose: "My shift ended but the street is unsafe. May I wait here?",
      origin:
        "The reception desk downstairs. I locked the front entrance behind me.",
    },
    clues: [],
    explanation:
      "Ash's reception job, finished shift and route agreed. Their appearance and movement were ordinary.",
  },
  {
    id: "loop",
    name: "Nell",
    kind: "anomaly",
    colour: "#b4d7ca",
    appearance: "ordinary",
    movement: "stop-start",
    dialogue: {
      identity: "Nell. I work in the basement laundry.",
      purpose: "I need shelter. I have not left the roof all evening.",
      origin: "Straight from the basement laundry. I was there all evening.",
    },
    clues: [
      {
        source: "dialogue",
        description:
          "Claims to have spent the entire evening in two different places.",
      },
      { source: "cctv", description: "Mechanical pauses on the stairs." },
    ],
    explanation:
      "Nell claimed to spend the entire evening both on the roof and in the basement. The repeated stops were another clue.",
  },
  {
    id: "tenant",
    name: "Jules",
    kind: "anomaly",
    colour: "#c78875",
    appearance: "ordinary",
    movement: "natural",
    dialogue: {
      identity: "Jules. I have lived in flat six for ten years.",
      purpose:
        "I need somewhere safe. This is my first visit to this building.",
      origin: "My home, flat six. I have never set foot here before tonight.",
    },
    clues: [
      {
        source: "dialogue",
        description: "Long-term resident who claims this is a first visit.",
      },
    ],
    explanation:
      "Jules claimed ten years in flat six and a first-ever visit to the same building. Those stories cannot both be true.",
  },
);
const special = (id: string, appearance: VisitorDefinition["appearance"], behaviour?: VisitorDefinition["behaviour"]): VisitorDefinition => ({
  id, name: id, kind: id === "kids" ? "human" : "anomaly", colour: "#ffc928", appearance, movement: "natural", behaviour,
  decisionPolicy: id === "mimic" || id === "kids" ? "either" : undefined,
  dialogue: {identity:"I live nearby.",purpose:"Could I shelter here until morning?",origin:"The ground floor. I used the stairs."},
  clues: id === "mimic" || id === "kids" ? [] : [{source: id === "mean" ? "cctv" : "visual",description: id === "splitter" ? "Their body separates into two halves." : id === "glitched" ? "One arm breaks into flickering fragments." : "They pushed another visitor off the stairs."}],
  explanation: id === "mimic" ? "There was no detectable warning. Either choice was safe to make." : id === "kids" ? "Three children in a disguise. Either choice earns coins." : id === "mean" ? "The staircase attack was the warning." : "The unusual body movement revealed an Anomaly.",
});
VISITORS.push(special("mimic","ordinary","mimic"),special("splitter","splitter"),special("glitched","glitched"),special("kids","kids"),special("mean","ordinary","mean"));
// Visual anomalies have plausible cover stories, not appearance-denial giveaways.
for (const id of ["three","grin"]) {
  const v=VISITORS.find(v=>v.id===id)!;
  v.dialogue={identity:"I work nearby.",purpose:"The street is unsafe. May I wait here?",origin:"The ground floor. I came up the stairs."};
  v.clues=v.clues.filter(c=>c.source!=="dialogue");
  v.explanation=id==="three"?"The extra eye and mechanical pauses revealed an Anomaly.":"The oversized mouth and rigid swaying revealed an Anomaly.";
}
export const NAMES = ["Sam","Jules","Alex","Bea","Milo","Pippa","Robin","Kit","Ash","Nell","Rowan","Charlie","Toby","Sage","Max","Jamie","Ari","Noah","Eden","Rory","Drew","Morgan","Casey","Finley"];
export const STORIES = [
  ["caretaker","boiler room","The heating failed"],["postal worker","post room","The street is closed"],
  ["cleaner","supply cupboard","My shift has ended"],["porter","reception","I locked the entrance"],
  ["gardener","courtyard","It is unsafe outside"],["cook","kitchen","The kitchen lights went out"],
  ["electrician","meter room","The power is unreliable"],["librarian","reading room","The library has closed"],
  ["delivery driver","loading bay","My van will not start"],["tenant","flat six","My radio said to find shelter"],
  ["painter","workshop","I finished painting downstairs"],["baker","bakery","The ovens are off for the night"],
] as const;
export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const result=[...items]; for(let i=result.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[result[i],result[j]]=[result[j],result[i]];}return result;
}
export function generatedVisitor(id:string, seed:number, index:number): VisitorDefinition {
  const base=visitorById(id), name=shuffled(NAMES,seed)[index%NAMES.length];
  const [job,place,reason]=shuffled(STORIES,seed^0x45af)[index%STORIES.length];
  const colours=["#ffc928","#8bdf26","#f78fb9","#29488f","#b4d7ca","#c78875"];
  const dialogue={identity:`I'm ${name}, the ${job}.`,purpose:`${reason}. Could I shelter here until morning?`,origin:`The ${place} downstairs. I came up the stairs.`};
  const contradiction=["echo","loop","tenant"].includes(id);
  if(contradiction)dialogue.purpose=`I need shelter. I spent the entire evening on the roof, without going downstairs.`;
  if(contradiction)dialogue.origin=`The ${place} downstairs. I was there all evening until just now.`;
  return {...base,name,colour:colours[((seed+index*7)>>>0) % colours.length] ?? colours[index%colours.length],dialogue,
    clues:contradiction?[...base.clues.filter(c=>c.source!=="dialogue"),{source:"dialogue",description:"Claims to have spent the whole evening both downstairs and on the roof."}]:base.clues,
    explanation:base.kind==="human"&&id!=="kids"?`${name} had ordinary features and a consistent account of their journey.`:contradiction?`${name}'s accounts of spending the whole evening in two places did not agree.`:base.explanation.replace(/Milo|Kit|Bea|Pippa|Sam|Ash/g,name)};
}
export const encounterVisitor = (e: Pick<Encounter,"visitor"|"profile">, difficulty?:Difficulty) => e.profile ?? visitorForDifficulty(e.visitor,difficulty);
/** One simulation clock drives tells in every camera, independent of render rate. */
export function anomalyTell(elapsed:number, seed=0, reduced=false) {
  const interval=4+(seed%5), phase=elapsed%interval;
  return reduced ? 1 : phase>=1 && phase<2.7 ? Math.sin((phase-1)/1.7*Math.PI) : 0;
}
export const visitorById = (id: string) => VISITORS.find((v) => v.id === id)!;
export type Encounter = {
  id: string;
  visitor: string;
  profile?: VisitorDefinition;
  tellSeconds?: number;
  phase: "approaching" | "waiting" | "departing";
  elapsed: number;
  asked: Question[];
  decision: Decision | "timeout" | null;
};
export type Outcome = {
  id: string;
  name: string;
  kind: "human" | "anomaly";
  decision: Decision | "timeout";
  correct: boolean;
  coins: number;
  explanation: string;
};
export type DawnEntry = { id: string; profile: VisitorDefinition; decision: Decision | "timeout"; coins: number; shot: boolean; mistakes?: number };
/** A resident may survive from a previous Infinite shift; record their removal once. */
export function recordResidentShot(ledger:DawnEntry[],id:string,profile:VisitorDefinition):DawnEntry[]{
 const existing=ledger.find(e=>e.id===id);
 if(existing?.shot)return ledger;
 const mistake=Number(profile.kind==="human");
 return existing?ledger.map(e=>e.id===id?{...e,shot:true,mistakes:(e.mistakes??0)+mistake}:e):[...ledger,{id,profile,decision:"shoot",coins:0,shot:true,mistakes:mistake}];
}
export type Encounters = {
  ledger: DawnEntry[];
  runId: string;
  seed: number;
  sequence: number;
  nextIn: number;
  active: Encounter | null;
  queued?: Encounter | null;
  pair?: { elapsed:number; push:boolean; fallen:boolean };
  identitySeed?: number;
  stairsLost?:number;
  result: Outcome | null;
  trust: number;
  correct: number;
  mistakes: number;
  earned: number;
  resolved: string[];
  streak: number;
  bestStreak: number;
};
export const freshEncounters = (
  runId = "preview",
  seed = [...runId].reduce(
    (n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0,
    927,
  ),
): Encounters => ({
  runId,
  seed,
  identitySeed: seed,
  ledger: [],
  queued: null,
  sequence: 0,
  nextIn: 12,
  active: null,
  result: null,
  trust: 3,
  correct: 0,
  mistakes: 0,
  earned: 0,
  resolved: [],
  streak: 0,
  bestStreak: 0,
});
export const arrivalInterval: Record<Difficulty, number> = {
  easy: 24,
  medium: 18,
  hard: 12,
};
export function approachDuration(v: VisitorDefinition) {
  return v.movement === "stop-start" ? 22 : 18;
}
export function approachProgress(e: Encounter) {
  const v = encounterVisitor(e),
    p = Math.min(1, e.elapsed / approachDuration(v));
  // Each stop-start cycle moves for half its duration, then freezes visibly.
  return v.movement === "stop-start"
    ? Math.min(1, (Math.floor(p * 8) + Math.min(1, ((p * 8) % 1) * 2)) / 8)
    : p;
}
export const DECISION_SECONDS: Record<Difficulty, number> = { easy: 60, medium: 45, hard: 30 };

export function tickEncounters(
  s: Encounters,
  delta: number,
  difficulty: Difficulty,
  paused: boolean,
  doorReady: boolean,
  options: { rate?: number; scheduled?: string | null; companion?: string | null; push?: boolean } = {},
): Encounters {
  if (
    paused ||
    !Number.isFinite(delta) ||
    delta <= 0
  )
    return s;
  if(s.pair && s.active?.phase==="approaching") {
    const elapsed=s.pair.elapsed+Math.min(delta,.25), fallen=s.pair.push&&elapsed>=3;
    s={...s,stairsLost:(s.stairsLost??0)+(fallen&&!s.pair.fallen?1:0),pair:{...s.pair,elapsed,fallen}};
  }
  const dt = Math.min(delta, 0.25) * (options.rate ?? 1),
    e = s.active;
  if (e) {
    if (e.phase === "waiting") {
      const elapsed = e.elapsed + Math.min(delta, 0.25);
      const waiting = { ...s, active: { ...e, elapsed, tellSeconds:(e.tellSeconds??0)+Math.min(delta,.25) } };
      return elapsed >= DECISION_SECONDS[difficulty] ? expireEncounter(waiting, e.id) : waiting;
    }
    const elapsed = e.elapsed + dt;
    if (
      e.phase === "approaching" &&
      elapsed >= approachDuration(visitorById(e.visitor))
    )
      return { ...s, active: { ...e, phase: "waiting", elapsed: 0 } };
    if (e.phase === "departing" && elapsed >= 4)
      return { ...s, active: null, nextIn: arrivalInterval[difficulty] };
    return { ...s, active: { ...e, elapsed, tellSeconds:(e.tellSeconds??0)+Math.min(delta,.25) } };
  }
  if(doorReady && s.queued) {
    if(s.pair?.fallen)return {...s,queued:null,pair:undefined};
    return {...s,active:{...s.queued,phase:"approaching",elapsed:approachDuration(encounterVisitor(s.queued))-3},queued:null,pair:undefined,result:null};
  }
  if (!doorReady || ("scheduled" in options && !options.scheduled)) return s;
  const nextIn = options.scheduled ? 0 : Math.max(0, s.nextIn - dt);
  if (nextIn > 0) return { ...s, nextIn };
  const seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  // Teach a predictable human, obvious Anomaly, human, then dialogue-only Anomaly.
  const tutorial = ["bea", "three", "pippa", "echo"];
  const selected =
    options.scheduled ??
    tutorial[s.sequence] ??
    VISITORS[seed % VISITORS.length].id;
  const companion=options.companion;
  return {
    ...s,
    seed,
    sequence: s.sequence + (companion?2:1),
    queued:companion?{id:`${s.runId}:${s.sequence+2}`,visitor:companion,profile:generatedVisitor(companion,s.identitySeed??s.seed,s.sequence+1),phase:"approaching",elapsed:0,asked:[],decision:null}:null,
    pair:companion?{elapsed:0,push:!!options.push,fallen:false}:undefined,
    result: null,
    active: {
      id: `${s.runId}:${s.sequence + 1}`,
      visitor: selected,
      profile:generatedVisitor(selected,s.identitySeed??s.seed,s.sequence),
      tellSeconds:0,
      phase: "approaching",
      elapsed: 0,
      asked: [],
      decision: null,
    },
  };
}
export function askQuestion(
  s: Encounters,
  id: string,
  q: Question,
): Encounters {
  const e = s.active;
  if (
    !e ||
    e.id !== id ||
    e.phase !== "waiting" ||
    !QUESTIONS.some((x) => x.id === q) ||
    e.asked.includes(q)
  )
    return s;
  return { ...s, active: { ...e, asked: [...e.asked, q] } };
}
export function resolveEncounter(
  s: Encounters,
  id: string,
  decision: Decision,
): Encounters {
  const e = s.active;
  if (
    !e ||
    e.id !== id ||
    e.phase !== "waiting" ||
    s.resolved.includes(id) ||
    !(decision === "admit" || decision === "reject" || decision === "shoot")
  )
    return s;
  const v = encounterVisitor(e),
    correct = v.decisionPolicy === "either" ? decision !== "shoot" || v.behaviour === "mimic" : (v.kind === "human") === (decision === "admit"),
    coins = correct && !(decision === "shoot" && v.behaviour === "mimic") ? 5 : 0;
  return {
    ...s,
    active: { ...e, phase: "departing", elapsed: 0, decision },
    ledger: [...(s.ledger ?? []), {id, profile:v, decision, coins, mistakes:Number(!correct), shot:decision === "shoot"}],
    resolved: [...s.resolved, id],
    streak: correct ? s.streak + 1 : 0,
    bestStreak: Math.max(s.bestStreak, correct ? s.streak + 1 : 0),
    trust: Math.max(0, s.trust - (correct ? 0 : 1)),
    correct: s.correct + Number(correct),
    mistakes: s.mistakes + Number(!correct),
    earned: s.earned + coins,
    result: {
      id,
      name: v.name,
      kind: v.behaviour === "mimic" ? "human" : v.kind,
      decision,
      correct,
      coins,
      explanation: v.behaviour === "mimic" ? "Their appearance and answers gave no warning signs. No mistake was recorded." : v.explanation,
    },
  };
}

export function visitorForDifficulty(
  id: string,
  difficulty: Difficulty = "easy",
): VisitorDefinition {
  const v = visitorById(id);
  if (difficulty !== "hard") return v;
  if (id === "echo")
    return {
      ...v,
      dialogue: {
        identity: "Robin, from the flat above. Been there years.",
        purpose: "A safe room, please. This building is new to me.",
        origin:
          "My flat upstairs. Tonight was my first time through this entrance, or any entrance here.",
      },
    };
  if (id === "loop")
    return {
      ...v,
      dialogue: {
        identity: "Nell, basement laundry staff.",
        purpose: "Shelter. I spent the whole evening up on the roof.",
        origin: "The basement laundry; I stayed there the whole evening.",
      },
    };
  return v;
}

// A missed deadline is a distinct outcome, never an automatic correct rejection.
export function expireEncounter(s: Encounters, id: string): Encounters {
  const e = s.active;
  if (!e || e.id !== id || e.phase !== "waiting" || s.resolved.includes(id)) return s;
  const v = encounterVisitor(e);
  return {
    ...s, active: { ...e, phase: "departing", elapsed: 0, decision: "timeout" },
    ledger: [...(s.ledger ?? []), {id, profile:v, decision:"timeout", coins:0, mistakes:1, shot:false}],
    resolved: [...s.resolved, id], streak: 0,
    trust: Math.max(0, s.trust - 1), mistakes: s.mistakes + 1,
    result: { id, name: v.name, kind: v.kind, decision: "timeout", correct: false, coins: 0,
      explanation: "The decision deadline passed. The door stayed closed; no coins were awarded." },
  };
}

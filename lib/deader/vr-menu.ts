/** Explicit headset screens. No DOM scraping or synthetic clicks. */
import type { useGame } from "./store";
import { cosmetics } from "./game";
import { accessories, bundles, bundleOutfit, type Outfit } from "./cosmetics";
import {
  hourlyOffer,
  offerCountdown,
  ownsSpecial,
  specialEquipped,
  specialItem,
  specialPreview,
} from "./hourly-shop";
import { isHourlySpecial } from "./special-ids";
import { pets, type PetId } from "./pets";
import { achievements } from "./achievements";
import { unlockedNight } from "./progression";
import { QUESTIONS, encounterVisitor, DECISION_SECONDS } from "./visitors";
import { FEEDS, broadcastSegment, newsForNight } from "./room";
import { donutMood } from "./survival";
import { tutorialCopy } from "./tutorial";
export type VRMenuState = {
  page: string;
  index: number;
  answer: string;
  confirmation: null | { id: string; decision: "admit" | "reject" };
};
export const newVRMenu = (): VRMenuState => ({
  page: "home",
  index: 0,
  answer: "",
  confirmation: null,
});
export type VRButton = { text: string; run: () => void; disabled?: boolean };
export type VRScreen = {
  title: string;
  body: string;
  buttons: VRButton[];
  back?: () => void;
  close?: () => void;
  feed?: boolean;
  preview?: { colour: string; outfit: Outfit; pet: boolean; petId?: PetId };
};
type State = ReturnType<typeof useGame.getState>;
export type VRMenuActions = {
  feedFailed?: boolean;
  retryFeed?: () => void;
  patch: (patch: Partial<State>) => void;
  recenter: () => void;
  exit: () => void;
  resume: () => void;
  decide: (id: string, d: "admit" | "reject") => void;
};
export function vrScreen(s: State, m: VRMenuState, a: VRMenuActions): VRScreen {
  const r = s.room,
    e = r.encounters.active,
    p = s.save.settings.vr;
  const nav = (page: string) => () => {
    m.page = page;
    m.index = 0;
    m.answer = "";
    m.confirmation = null;
  };
  const button = (
    text: string,
    run: () => void,
    disabled = false,
  ): VRButton => ({ text, run, disabled });
  const close = () => {
    m.page = "home";
    m.confirmation = null;
    if (s.suspension) a.resume();
    else if (s.panel) s.open(null);
    else if (r.night?.status === "completed" || r.night?.status === "failed")
      s.lobby();
    else s.roomView("explore");
  };
  const screen = (
    title: string,
    body: string,
    buttons: VRButton[],
    back?: () => void,
  ): VRScreen => ({ title, body, buttons, back, close });
  if (m.confirmation && (e?.id !== m.confirmation.id || e.phase !== "waiting"))
    m.confirmation = null;
  if (s.suspension)
    return screen(
      "Game paused",
      "Your controllers are ready. Resume when you are comfortable.",
      [button("Resume", a.resume), button("Return to lobby", s.lobby)],
    );
  if (a.feedFailed && ["cctv", "inspect", "door"].includes(r.view) && !s.panel)
    return screen(
      "Camera unavailable",
      "The camera feed stopped. Retry, or close to return to the room.",
      [button("Retry camera", () => a.retryFeed?.())],
    );
  const settings = m.page.startsWith("settings");
  if (settings) {
    const patch = (v: Partial<typeof p>) => s.settings({ vr: { ...p, ...v } });
    if (m.page === "settings")
      return screen(
        "VR settings",
        "Choose a category.",
        [
          button("Movement", nav("settings-movement")),
          button("Comfort", nav("settings-comfort")),
          button("Audio", nav("settings-audio")),
          button("Exit VR", a.exit),
        ],
        nav("home"),
      );
    if (m.page === "settings-movement")
      return screen(
        "Movement",
        "Smooth remains the default. Choose what feels comfortable.",
        [
          button(`Walk: ${p.movement}`, () =>
            patch({
              movement: p.movement === "smooth" ? "teleport" : "smooth",
            }),
          ),
          button(`Turn: ${p.turning}`, () =>
            patch({ turning: p.turning === "smooth" ? "snap" : "smooth" }),
          ),
          button(`Walk speed: ${p.walkSpeed.toFixed(1)} m/s`, () =>
            patch({
              walkSpeed:
                p.walkSpeed >= 2 ? 0.5 : Math.min(2, p.walkSpeed + 0.5),
            }),
          ),
          button(`Turn speed: ${p.turnSpeed}°/s`, () =>
            patch({ turnSpeed: p.turnSpeed >= 90 ? 15 : p.turnSpeed + 15 }),
          ),
        ],
        nav("settings"),
      );
    if (m.page === "settings-comfort")
      return screen(
        "Comfort",
        "Recenter moves the screen back in front of you.",
        [
          button(`Main hand: ${p.leftHanded ? "left" : "right"}`, () =>
            patch({ leftHanded: !p.leftHanded }),
          ),
          button(`Play: ${p.seated ? "seated" : "standing"}`, () => {
            patch({ seated: !p.seated });
            a.recenter();
          }),
          button(`Vignette: ${p.vignette ? "on" : "off"}`, () =>
            patch({ vignette: !p.vignette }),
          ),
          button("Recalibrate height", a.recenter),
        ],
        nav("settings"),
      );
    return screen(
      "Audio & effects",
      "Choose a comfortable intensity.",
      [
        button(`Sound: ${s.save.settings.muted ? "off" : "on"}`, () =>
          s.settings({ muted: !s.save.settings.muted }),
        ),
        button(`Volume: ${Math.round(s.save.settings.volume * 100)}%`, () =>
          s.settings({
            volume:
              s.save.settings.volume >= 1
                ? 0
                : Math.min(1, s.save.settings.volume + 0.2),
          }),
        ),
        button(
          `Reduced motion: ${s.save.settings.reducedMotion ? "on" : "off"}`,
          () => s.settings({ reducedMotion: !s.save.settings.reducedMotion }),
        ),
        button(`Effects: ${s.save.settings.effects ? "on" : "off"}`, () =>
          s.settings({ effects: !s.save.settings.effects }),
        ),
      ],
      nav("settings"),
    );
  }
  if (s.panel === "special") {
    const now = Date.now(),
      offer = hourlyOffer(now),
      fixture =
        process.env.NODE_ENV === "development" ? s.specialFixture : null,
      id = fixture ?? offer.id,
      item = specialItem(id),
      owned = ownsSpecial(s.save, id),
      equipped = specialEquipped(s.save, id);
    const result = screen(
      item.name,
      `${s.save.coins} coins · ${item.price} coins\nChanges in ${offerCountdown(now)}\nMay repeat. Owned items stay yours.`,
      [
        button(
          owned ? "Owned" : "Purchase",
          () => s.buySpecial(offer.id, offer.hour),
          !!fixture || owned || s.save.coins < item.price,
        ),
        button(
          equipped ? "Equipped" : "Equip",
          () => {
            if (item.category === "pet") s.wearPet("mini-anomaly");
            else s.wearAccessory(item.category, item.id);
          },
          !!fixture || !owned || equipped,
        ),
      ],
      () => {
        m.page = "home";
        s.open("shop");
      },
    );
    result.preview = specialPreview(s.save, id);
    return result;
  }
  if (s.panel === "shop" || s.panel === "wardrobe") {
    const category = m.page.replace("shop-", ""),
      wardrobe = s.panel === "wardrobe";
    if (m.page === "more-shop")
      return screen(
        "More from the shop",
        `${s.save.coins} coins`,
        [
          button("Sidekicks", nav("shop-pet")),
          button("Accessories", nav("shop-accessory")),
        ],
        nav("home"),
      );
    if (!m.page.startsWith("shop-"))
      return screen(
        wardrobe ? "Your wardrobe" : "Shop",
        `${s.save.coins} coins · Choose a category.`,
        [
          ...(!wardrobe
            ? [button("Hourly special", () => s.open("special"))]
            : []),
          ...(wardrobe
            ? ["Colours", "Bundles", "Sidekicks", "Accessories"]
            : ["Colours", "Bundles", "More items"]
          ).map((c, i) =>
            button(
              c,
              nav(
                !wardrobe && i === 2
                  ? "more-shop"
                  : "shop-" + ["colour", "bundle", "pet", "accessory"][i],
              ),
            ),
          ),
        ],
      );
    const all = [
      ...cosmetics,
      ...bundles,
      ...pets.map((p) => ({ ...p, category: "pet" as const })),
      ...accessories,
    ];
    const owns = (id: string) =>
      [
        ...s.save.owned,
        ...s.save.ownedAccessories,
        ...s.save.ownedPets,
        ...s.save.ownedBundles,
      ].some((x) => x === id) ||
      !!bundles.find(
        (b) =>
          b.id === id &&
          b.items.every((x) => s.save.ownedAccessories.includes(x)),
      );
    const items = all.filter(
      (i) =>
        (category === "accessory"
          ? accessories.some((a) => a.id === i.id)
          : i.category === category) &&
        (wardrobe ? owns(i.id) : !isHourlySpecial(i.id)),
    );
    if (!items.length)
      return screen(
        "Nothing owned yet",
        "Visit the shop to find your first item.",
        [],
        nav("home"),
      );
    m.index = ((m.index % items.length) + items.length) % items.length;
    const item = items[m.index],
      owned = owns(item.id),
      colour = cosmetics.find((c) => c.id === s.save.equipped)!.colour;
    const buy = () => {
      if (item.category === "colour") s.buy(item.id);
      else if (item.category === "bundle") s.buyBundle(item.id);
      else if (item.category === "pet") s.buyPet(item.id);
      else s.buyAccessory(item.id);
    };
    const equip = () => {
      if (item.category === "colour") s.wear(item.id);
      else if (item.category === "bundle") s.wearBundle(item.id);
      else if (item.category === "pet")
        s.wearPet(s.save.equippedPet === item.id ? null : item.id);
      else
        s.wearAccessory(
          item.category,
          s.save.outfit[item.category] === item.id ? null : item.id,
        );
    };
    const equipped =
      item.category === "pet"
        ? s.save.equippedPet === item.id
        : item.category !== "bundle" && item.category !== "colour"
          ? s.save.outfit[item.category] === item.id
          : false;
    const outfit =
      item.category === "bundle"
        ? bundleOutfit(s.save.outfit, item.id)
        : item.category !== "colour" && item.category !== "pet"
          ? { ...s.save.outfit, [item.category]: item.id }
          : s.save.outfit;
    const result = screen(
      item.name,
      `${s.save.coins} coins · ${owned ? "Owned" : item.price + " coins"} · ${m.index + 1}/${items.length}\n${item.category === "bundle" ? item.description : item.category === "pet" ? "A sidekick that notices clues." : "Preview before equipping."}`,
      [
        button("Previous", () => {
          m.index--;
        }),
        button("Next", () => {
          m.index++;
        }),
        button("Purchase", buy, owned || s.save.coins < item.price || wardrobe),
        button(
          equipped
            ? "Remove"
            : item.category === "bundle"
              ? "Equip set"
              : "Equip",
          equip,
          !owned,
        ),
      ],
      nav("home"),
    );
    result.preview = {
      colour:
        item.category === "colour" || item.category === "pet"
          ? item.colour
          : colour,
      outfit,
      pet: item.category === "pet",
      petId: item.category === "pet" ? item.id : undefined,
    };
    return result;
  }
  if (s.panel === "start") {
    if (m.page === "difficulty")
      return screen(
        "Difficulty",
        "Choose how challenging visitors should be.",
        (["easy", "medium", "hard"] as const).map((d) =>
          button(d, () => {
            a.patch({ difficulty: d });
            m.page = "home";
          }),
        ),
        nav("home"),
      );
    if (m.page === "night")
      return screen(
        "Choose a night",
        "Complete each night to unlock the next.",
        [1, 2, 3].map((n) =>
          button(
            `Night ${n}`,
            () => {
              a.patch({ selectedNight: n });
              m.page = "home";
            },
            n > unlockedNight(s.save) && s.runSeconds !== 60,
          ),
        ),
        nav("home"),
      );
    return screen(
      "Start your shift",
      `1 player · ${s.mode === "normal" ? "Night " + s.selectedNight : "Infinite"} · Five-minute nights`,
      [
        button(`Difficulty: ${s.difficulty}`, nav("difficulty")),
        button(`Mode: ${s.mode === "normal" ? "Story" : "Infinite"}`, () =>
          a.patch({ mode: s.mode === "normal" ? "infinite" : "normal" }),
        ),
        button(`Night ${s.selectedNight}`, nav("night"), s.mode === "infinite"),
        button("Start shift", s.start),
      ],
    );
  }
  if (s.panel === "tutorial")
    return screen(
      "Learn to play",
      "Point at objects and press either trigger. Hold the screen’s top bar to move it.",
      [button("Start practice", s.beginTutorial)],
    );
  if (s.panel === "progress") {
    m.index =
      ((m.index % achievements.length) + achievements.length) %
      achievements.length;
    const v = achievements[m.index];
    return screen(
      "Your progress",
      `${v.name}: ${v.description}\nReward: ${v.coins} coins`,
      [
        button("Previous", () => {
          m.index--;
        }),
        button("Next", () => {
          m.index++;
        }),
        button(
          "Claim reward",
          () => s.claim(v.id),
          !s.save.achievements.includes(v.id) ||
            s.save.claimedRewards.includes("achievement:" + v.id),
        ),
      ],
      () => s.open("pause"),
    );
  }
  if (s.panel === "pause")
    return screen("Paused", "Take your time.", [
      button("Resume", close),
      button("VR settings", nav("settings")),
      button("Progress", () => s.open("progress")),
      button("Return to lobby", s.lobby),
    ]);
  if (r.survival.phase === "gameover")
    return screen("Game Over", "The Auditor has ended your shift.", [
      button("Retry shift", s.start),
      button("Return to lobby", s.lobby),
    ]);
  if (r.night?.status === "completed")
    return screen("Night complete", "You survived the judgement.", [
      button(
        "Next night",
        s.nextNight,
        r.night.mode !== "normal" || r.night.number >= 3,
      ),
      button("Replay night", s.start),
      button("Return to lobby", s.lobby),
    ]);
  if (["inspect", "door", "cctv"].includes(r.view)) {
    const waiting = e?.phase === "waiting",
      v = e ? encounterVisitor(e, s.session?.difficulty) : null;
    const seconds = waiting
      ? Math.max(
          0,
          Math.ceil(
            DECISION_SECONDS[s.session?.difficulty ?? "easy"] - e.elapsed,
          ),
        )
      : null;
    const title = waiting
      ? `${v!.name} · ${s.tutorial ? "Practice" : seconds + " seconds"}`
      : "No visitor waiting";
    let result: VRScreen;
    if (m.confirmation) {
      const c = m.confirmation;
      result = screen(
        title,
        `${c.decision === "admit" ? "Let in" : "Send away"} ${v?.name}?`,
        [
          button("Confirm", () => {
            a.decide(c.id, c.decision);
            m.confirmation = null;
            m.page = "home";
          }),
          button("Go back", () => {
            m.confirmation = null;
          }),
        ],
      );
    } else if (m.page === "questions" && waiting)
      result = screen(
        title,
        m.answer ||
          "Ask a question, then compare their story with what you see.",
        QUESTIONS.map((q) =>
          button(q.label, () => {
            s.askVisitor(e.id, q.id);
            m.answer = v!.dialogue[q.id];
          }),
        ),
        nav("home"),
      );
    else if (m.page === "cameras") {
      const start = Math.floor(m.index / 4) * 4;
      result = screen(
        "Choose camera",
        `Page ${Math.floor(m.index / 4) + 1} of 2`,
        FEEDS.slice(start, start + 4).map((f, i) =>
          button(f.label, () => {
            a.patch({
              room: { ...s.room, feed: (start + i) as typeof r.feed },
            });
            if (start + i === 4) s.tutorialAdvance("camera");
            s.roomView("cctv");
            m.page = "home";
          }),
        ),
        nav("home"),
      );
    } else if (!waiting) {
      result = screen(
        r.view === "cctv"
          ? `CCTV · ${FEEDS[r.feed].label}`
          : "Nobody at the door",
        "Choose a camera, or close to return to the room.",
        [
          button("Change camera", nav("cameras")),
          ...(r.view === "cctv" && !s.tutorial
            ? [
                button(
                  "Play Impossible Shift",
                  () => s.roomView("arcade"),
                  !!e && e.phase !== "approaching",
                ),
              ]
            : []),
        ],
      );
    } else
      result = screen(
        title,
        r.view === "cctv"
          ? `CCTV · ${FEEDS[r.feed].label}`
          : "Peephole · Check carefully before choosing.",
        [
          button(
            "Let in",
            () => {
              m.confirmation = { id: e!.id, decision: "admit" };
            },
            !waiting,
          ),
          button(
            "Send away",
            () => {
              m.confirmation = { id: e!.id, decision: "reject" };
            },
            !waiting,
          ),
          button("Ask a question", nav("questions"), !waiting),
          button("Cameras", nav("cameras")),
        ],
      );
    result.feed = true;
    return result;
  }
  if (r.view === "console")
    return screen("Security console", "Keep an eye on the house.", [
      button("View cameras", () => s.roomView("cctv")),
      button(
        "Impossible Shift",
        () => s.roomView("arcade"),
        (!!e && e.phase !== "approaching") || !!s.tutorial,
      ),
    ]);
  if (r.view === "arcade")
    return {
      ...screen(
        "Impossible Shift",
        "Trigger to jump. Close to return to the room.",
        [],
      ),
      feed: true,
    };
  if (r.view === "donut")
    return screen(
      "Donut",
      `Donut is ${donutMood(r.encounters.trust)}. Watch his reactions, but remember that a quiet pet does not guarantee a visitor is safe.`,
      [],
    );
  if (r.view === "tv" || r.view === "lounge-tv")
    return screen(
      "Anomalous News",
      broadcastSegment(newsForNight(r.night?.number ?? 1), r.newsSeconds)
        .subtitle,
      [],
    );
  if (s.tutorial === "finish")
    return screen("Practice complete", "You are ready for your first shift.", [
      button("Return to lobby", s.lobby),
    ]);
  const tutorial = s.tutorial
    ? ({
        move: "Use the left stick to move.",
        look: "Look around with your head. Right stick turns.",
        tablet: "Find the tutorial tablet. Point and press trigger.",
        camera: "Open CCTV and select Door rear.",
        decide: "Let Bea in from the door or CCTV.",
      }[s.tutorial as string] ?? tutorialCopy[s.tutorial].body)
    : "";
  return screen("The Anomalous", s.tutorialMessage || tutorial, []);
}

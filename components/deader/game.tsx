"use client";
import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GameSettings, SurvivalUI } from "./survival-ui";
import { TouchControls } from "./touch-controls";
import { WeaponUI } from "./weapon";
import { JudgementUI } from "./judgement";
import { GameAudio } from "./game-audio";
import { supportsWebGL2 } from "@/lib/deader/compatibility";
import { renderScale } from "@/lib/deader/presentation";
import { NIGHT_TITLES } from "@/lib/deader/night";
import { unlockedNight } from "@/lib/deader/progression";
import { Modal } from "./modal";
import { RoomUI } from "./room-ui";
import { interactRoom } from "./room-controller";
import { Puppy, PetHints } from "./sidekick";
import { TutorialUI } from "./tutorial-ui";
import { pets } from "@/lib/deader/pets";
import { Cone } from "./character";
import {
  clockLabel,
  cosmetics,
  type Difficulty,
  type GameMode,
} from "@/lib/deader/game";
import {
  bundles, bundleOutfit,
  accessories,
  type Outfit,
  type AccessoryCategory,
} from "@/lib/deader/cosmetics";
import { achievements } from "@/lib/deader/achievements";
import { useGame } from "@/lib/deader/store";
import styles from "./game.module.css";
const Lobby = lazy(() => import("./scenes/lobby"));
const Room = lazy(() => import("./scenes/room"));
class RenderBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className={styles.fallback}>
        <h1>The lights went out.</h1>
        <p>
          The 3D renderer could not start. Try a browser with WebGL enabled.
        </p>
        <a href="/playground">Return to Playground</a>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Diagnostics({
  onContextLost,
}: {
  onContextLost: (lost: boolean) => void;
}) {
  const { gl } = useThree();
  const shadows = useGame((s) => s.save.settings.shadows);
  useEffect(() => {
    gl.shadowMap.needsUpdate = true;
  }, [gl, shadows]);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = () => onContextLost(true);
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onContextLost]);
  const samples = useRef({ seconds: 0, frames: 0 });
  useFrame((_, dt) => {
    if (process.env.NODE_ENV !== "development") return;
    const s = samples.current;
    s.seconds += dt;
    s.frames++;
    if (s.seconds >= 1) {
      gl.domElement.dataset.renderStats = JSON.stringify({
        fps: Math.round(s.frames / s.seconds),
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
      });
      s.seconds = 0;
      s.frames = 0;
    }
  });
  return null;
}
function Preview({ colour, outfit, pet = false }: { colour: string; outfit: Outfit; pet?: boolean }) {
  const scale = useGame((s) => renderScale(s.save.settings));
  return (
    <div className={styles.preview} aria-label="Rotating 3D outfit preview">
      <Canvas dpr={[0.75, scale]} camera={{ position: [0, 1.2, 3.2], fov: 38 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[3, 5, 4]} intensity={3} />
        <pointLight position={[-3, 2, -2]} intensity={12} color="#b6caba" />
        {pet ? <Puppy colour={colour} /> : <Cone colour={colour} outfit={outfit} />}
        <OrbitControls
          target={[0, 0.8, 0]}
          autoRotate
          autoRotateSpeed={2}
          enablePan={false}
          enableZoom={false}
        />
      </Canvas>
    </div>
  );
}
function Cosmetics({ wardrobe }: { wardrobe: boolean }) {
  const { save, buy, wear, buyAccessory, wearAccessory } = useGame();
  const [category, setCategory] = useState<"colour" | "pet" | "bundle" | AccessoryCategory>(
    "colour",
  );
  const [selected, select] = useState<string>(save.equipped);
  const catalogue = [...cosmetics, ...accessories, ...bundles, ...pets.map(p=>({...p,category:"pet" as const}))];
  const owns = (id: string) =>
    [...save.owned, ...save.ownedAccessories, ...save.ownedPets,...save.ownedBundles].some((v) => v === id) || !!bundles.find(b=>b.id===id&&b.items.every(piece=>save.ownedAccessories.includes(piece)));
  const items = catalogue.filter(
    (c) => c.category === category && (!wardrobe || owns(c.id)),
  );
  const item =
    selected === "none"
      ? undefined
      : (items.find((c) => c.id === selected) ?? items[0]);
  const owned = item ? owns(item.id) : false;
  const equippedId =
    category === "bundle" ? null : category === "colour" ? save.equipped : category === "pet" ? save.equippedPet : save.outfit[category];
  const equipped = !!item && (item.category === "bundle" ? item.items.every(id=>{const piece=accessories.find(a=>a.id===id)!;return save.outfit[piece.category]===id;}) : equippedId === item.id);
  const colour =
    (item?.category === "colour" || item?.category === "pet")
      ? item.colour
      : cosmetics.find((c) => c.id === save.equipped)!.colour;
  const outfit = item?.category === "bundle" ? bundleOutfit(save.outfit,item.id) : { ...save.outfit };
  if (item && item.category !== "colour" && item.category !== "pet" && item.category !== "bundle") outfit[item.category] = item.id;
  return (
    <Modal label={wardrobe ? "Character customisation" : "Cosmetics shop"} className={styles.shopModal} closeLabel="Back to lobby">
      <div className={styles.shopScroll}>
      <p className={styles.eyebrow}>
        AFTER HOURS / {wardrobe ? "DRESSING ROOM" : "SUPPLY COUNTER"}
      </p>
      <h2>{wardrobe ? "Make it personal." : "Made for the night shift."}</h2>
      <p className={styles.balance}>
        {save.coins} <span>COINS</span>
      </p>
      <div className={styles.categories} aria-label="Cosmetic categories">
        {(
          [
            ["bundle","Bundles"],
            ["colour", "Colours"],
            ["finish","Finishes"],["hand","Hand props"],["face","Faces"],["wrap","Bandages"],["effect","Effects"],
            ["hat", "Hats"],
            ["backpack", "Backpacks"],
            ["glasses", "Glasses"],
            ["pet", "Sidekicks"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={category === id}
            onClick={() => {
              setCategory(id);
              select("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {item?.category === "bundle" && <p className={styles.bundleContents}>{item.description} Mix and match all four pieces.</p>}
      <div className={styles.shopGrid}>
        <Preview colour={colour} outfit={outfit} pet={category === "pet"} />
        <div className={styles.items}>
          {items.map((c) => (
            <button
              key={c.id}
              className={item?.id === c.id ? styles.selected : ""}
              aria-pressed={item?.id === c.id}
              onClick={() => select(c.id)}
            >
              <i style={{ background: c.colour }} />
              <span>
                {c.name}
                <small>
                  {equippedId === c.id
                    ? "EQUIPPED"
                    : owns(c.id)
                      ? "OWNED"
                      : `${c.price} COINS`}
                </small>
              </span>
            </button>
          ))}
          {!items.length && (
            <p>
              No owned items in this category yet. Visit the shop to preview
              them.
            </p>
          )}
        </div>
      </div>
      </div>
      <div className={styles.purchase}>
        <div>
          <strong>{item?.name ?? "Your current outfit"}</strong>
          <p>{item?.category === "bundle" ? item.description+" Pieces can also be equipped separately." : category === "pet" ? "Barks at arrivals and points out clues you have seen. All sidekicks help equally." : "Preview only · equip to update your character."}</p>
        </div>
        {item && (
          <button
            className={styles.primary}
            disabled={equipped || (!owned && save.coins < item.price)}
            onClick={() => {
              if(item.category === "bundle"){if(owned)useGame.getState().wearBundle(item.id);else useGame.getState().buyBundle(item.id);}
              else if (item.category === "colour") {
                if (owned) wear(item.id);
                else buy(item.id);
              } else if (item.category === "pet") {
                if(owned) useGame.getState().wearPet(item.id); else useGame.getState().buyPet(item.id);
              } else {
                if (owned) wearAccessory(item.category, item.id);
                else buyAccessory(item.id);
              }
            }}
          >
            {equipped
              ? "Equipped"
              : owned
                ? item.category === "bundle" ? "Equip set" : "Equip"
                : save.coins < item.price
                  ? "Not enough coins"
                  : `Buy · ${item.price}`}
          </button>
        )}
        {category !== "colour" && category !== "bundle" && (
          <button
            disabled={category === "pet" ? !save.equippedPet : !save.outfit[category]}
            onClick={() => {
              if(category === "pet")useGame.getState().wearPet(null);else wearAccessory(category, null);
              select("none");
            }}
          >
            Unequip {category}
          </button>
        )}
      </div>
    </Modal>
  );
}
function Progress() {
  const { save, claim } = useGame();
  return (
    <Modal label="Achievements and progression">
      <p className={styles.eyebrow}>YOUR NIGHT-SHIFT RECORD</p>
      <h2>A little worse for wear.</h2>
      <p className={styles.balance}>
        {save.coins} <span>COINS</span>
      </p>
      <p className={styles.note}>
        Rewards are claimed once and saved on this device. Rehearsals do not
        count.
      </p>
      <div className={styles.achievements}>
        {achievements.map((a) => {
          const unlocked = save.achievements.includes(a.id),
            claimed = save.claimedRewards.includes(`achievement:${a.id}`);
          return (
            <article key={a.id}>
              <div>
                <h3>{a.name}</h3>
                <p>{a.description}</p>
                <small>{a.coins} coins</small>
              </div>
              <button
                disabled={!unlocked || claimed}
                onClick={() => claim(a.id)}
              >
                {claimed
                  ? "Claimed"
                  : unlocked
                    ? `Claim ${a.coins} coins`
                    : "Locked"}
              </button>
            </article>
          );
        })}
      </div>
      <p className={styles.note}>
        Story nights completed: {save.completedNights} / 3 · Infinite nights
        survived: {save.infiniteRecords.totalNights}
      </p>
    </Modal>
  );
}
function StartMenu() {
  const { difficulty, mode, start, runSeconds, rehearsal, selectedNight, save } = useGame();
  const deadline = { easy: 60, medium: 45, hard: 30 }[difficulty];
  return (
    <Modal label="Start game" className={styles.setupModal}>
      <header className={styles.setupHeader}>
        <p className={styles.eyebrow}>NIGHT SHIFT / SOLO</p>
        <h2>Choose your shift.</h2>
      </header>
      <div className={styles.setupBody}>
        <section className={styles.setupOptions} aria-label="Session settings">
          <fieldset className={styles.segmentGroup}>
            <legend>Difficulty</legend>
            <div className={styles.segments}>
              {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
                <button key={d} aria-pressed={difficulty === d} onClick={() => useGame.setState({ difficulty: d })}>
                  {d[0].toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
            <p>{deadline}s to decide · {difficulty === "easy" ? "Extra guidance" : difficulty === "medium" ? "More visitors" : "Subtler clues"}</p>
          </fieldset>
          <fieldset className={styles.segmentGroup}>
            <legend>Game mode</legend>
            <div className={styles.segments}>
              {(["normal", "infinite"] as GameMode[]).map(m => (
                <button key={m} aria-pressed={mode === m} onClick={() => useGame.setState({ mode: m })}>
                  {m === "normal" ? "Story" : "Infinite"}
                </button>
              ))}
            </div>
          </fieldset>
          <details className={styles.setupHelp}>
            <summary>How to play</summary>
            <p>Inspect visitors, ask questions and decide who to let in. Three mistakes fail the dawn judgement. Missing a deadline adds one mistake. Story has three five-minute nights; Infinite keeps going. Progress saves on this device.</p>
          </details>
        </section>
        <section className={styles.shiftList} aria-label="Story nights">
          {mode === "normal" ? NIGHT_TITLES.map((title, i) => {
            const locked = i + 1 > unlockedNight(save) && !(process.env.NODE_ENV === "development" && runSeconds === 60);
            return <button key={title} disabled={locked} aria-pressed={selectedNight === i + 1} onClick={() => useGame.setState({ selectedNight: i + 1 })}>
              <span className={styles.shiftNumber}>{String(i + 1).padStart(2, "0")}</span>
              <span><strong>{title}</strong><small>{locked ? `Complete Night ${i} to unlock` : save.completions[difficulty].includes(i + 1) ? "Completed · Replay" : "5 minutes · Judgement at dawn"}</small></span>
              <span aria-hidden="true">{locked ? "Locked" : selectedNight === i + 1 ? "✓" : ""}</span>
            </button>;
          }) : <div className={styles.infiniteCard}><p className={styles.eyebrow}>UNTIL YOUR LUCK RUNS OUT</p><h3>The endless shift.</h3><p>Judgement every five minutes. Survive with fewer than three mistakes, then start a fresh shift.</p><small>Best night: {save.infiniteRecords.night} · Best streak: {save.infiniteRecords.streak}</small></div>}
          {process.env.NODE_ENV === "development" && <label className={styles.devRun}>Local test length<select value={runSeconds} onChange={e => useGame.setState({runSeconds: Number(e.target.value) === 60 ? 60 : 300, selectedNight: Number(e.target.value) === 60 ? selectedNight : Math.min(selectedNight, unlockedNight(save))})}><option value="300">Full night · 5 minutes</option><option value="60">Development rehearsal · 60 seconds · no rewards saved</option></select></label>}
          {process.env.NODE_ENV === "development" && runSeconds === 60 && <label className={styles.devRun}>Rehearsal scene<select value={rehearsal} onChange={e=>useGame.setState({rehearsal:e.target.value as typeof rehearsal})}><option value="standard">Normal arrivals</option><option value="lounge">Full lounge · 12 residents</option><option value="scare">Anomaly at the door</option><option value="armed">Gun · open doorway</option>{["mimic","splitter","glitched","kids","pair","push","rainbow","injured"].map(id=><option key={id} value={id}>{id} · local fixture</option>)}<option value="judgement-pass">Dawn · pass</option><option value="judgement-fail">Dawn · fail</option></select></label>}
        </section>
      </div>
      <footer className={styles.setupFooter}>
        <span>{mode === "normal" ? `Night ${selectedNight}` : "Infinite"} · {difficulty}<small>1 player · Six shots</small></span>
        <button className={styles.primary} onClick={start}>Start shift <span aria-hidden="true">→</span></button>
      </footer>
    </Modal>
  );
}
export default function Game() {
  const s = useGame();
  const scale = renderScale(s.save.settings);
  const dpr = useMemo<[number, number]>(() => [0.75, scale], [scale]);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => {
    useGame.getState().hydrate();
    setWebgl(supportsWebGL2(() => document.createElement("canvas")));
  }, []); // Hydrate once, before mounting the game.
  const [lost, setLost] = useState(false);
  useEffect(() => {
    if (lost) useGame.setState({ suspension: "interrupted" });
  }, [lost]);
  return (
    <div
      className={`${styles.game} ${s.scene === "room" && s.room.weapon.collected ? styles.armed : ""} ${s.touchActive ? styles.touchGame : ""} ${s.scene === "room" && s.room.view === "cctv" ? styles.surveillance : ""}`}
    >
      <GameAudio />
      <WeaponUI />
      <JudgementUI />
      <TouchControls />
      {s.scene === "room" && s.save.settings.effects && (
        <div className={styles.filmGrain} aria-hidden="true" />
      )}
      <RenderBoundary>
        {webgl === false ? (
          <div className={styles.fallback}>
            <h1>This shift needs WebGL.</h1>
            <p>
              Enable hardware acceleration or try a WebGL 2 capable browser.
            </p>
            <Link href="/playground">Back to Playground</Link>
          </div>
        ) : s.ready && webgl ? (
          <Canvas
            shadows={
              s.save.settings.shadows && s.save.settings.quality !== "low"
                ? "percentage"
                : false
            }
            dpr={dpr}
            camera={{ position: [0, 2.8, 4.6], fov: 55, near: 0.08, far: 35 }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
          >
            <Diagnostics onContextLost={setLost} />
            <Suspense fallback={null}>
              {s.scene === "lobby" ? (
                <Lobby />
              ) : (
                <Room key={s.room.encounters.runId} />
              )}
            </Suspense>
          </Canvas>
        ) : (
          <div className={styles.fallback}>Opening the night shift…</div>
        )}
      </RenderBoundary>
      {s.scene === "room" && (
        <div className={styles.atmosphere} aria-hidden="true" />
      )}
      <header
        className={`${styles.top} ${s.scene === "room" ? styles.roomTop : ""}`}
      >
        <div>
          <p className={styles.eyebrow}>FENN’S AFTER HOURS CLUB</p>
          <h1>
            THE
            <br />
            <em>ANOMALOUS</em>
          </h1>
        </div>
        <div className={styles.topRight}>
          <span className={styles.coin}>
            {s.save.coins} <small>COINS</small>
          </span>
          <button onClick={() => s.open("pause")}>
            Menu <kbd>ESC</kbd>
          </button>
        </div>
      </header>
      {s.scene === "room" && !["cctv", "arcade", "console"].includes(s.room.view) && !s.tutorial && (
        <div className={styles.night}>
          <b>NIGHT {s.room.night?.number ?? 1}</b>
          <span>
            {clockLabel(
              s.room.night?.mode === "infinite"
                ? s.room.night.elapsed % 600
                : (s.room.night?.elapsed ?? 0),
            )}
          </span>
          <span
            className={styles.mistakeCount}
            aria-label={`${s.room.encounters.mistakes-s.room.mistakeBaseline} mistakes. Judgement at dawn.`}
          >
            <strong>{s.room.encounters.mistakes-s.room.mistakeBaseline} mistakes</strong><small>Judgement at dawn</small>
          </span>
          <small>
            {s.session?.difficulty} / {s.session?.mode} ·{" "}
            {s.room.night?.duration === 60
              ? "60s REHEARSAL"
              : s.mode === "infinite"
                ? `STREAK ${s.room.encounters.streak}`
                : NIGHT_TITLES[(s.room.night?.number ?? 1) - 1]}
          </small>
        </div>
      )}
      {s.scene === "room" && (
        <>
          <RoomUI />
          <PetHints />
          <SurvivalUI />
        </>
      )}
      {!s.panel && !s.touchActive &&
        (s.scene === "lobby" ||
          (s.room.view === "explore" &&
            s.room.survival.phase === "idle" &&
            s.room.night?.status !== "completed")) && (
          <footer className={styles.bottom}>
            <div>
              <p className={styles.eyebrow}>
                {s.scene === "lobby"
                  ? "01 / THE LOBBY"
                  : "02 / THE NIGHT SHIFT"}
              </p>
              <p>
                {s.scene === "lobby"
                  ? "A fresh face. A very long night."
                  : "Look at an object. E or click to interact."}
              </p>
            </div>
            {s.prompt && (
              <button
                className={styles.interact}
                onClick={() =>
                  s.scene === "room"
                    ? interactRoom()
                    : s.interactLobby()
                }
              >
                <kbd>E</kbd> {s.prompt}
              </button>
            )}
            <div className={styles.controls}>
              <span>
                <kbd>W A S D</kbd> Move
              </span>
              <span>
                {s.scene === "room"
                  ? "Click / drag to look"
                  : "Walk up to a station"}
              </span>
              <small>Keyboard & mouse required</small>
            </div>
          </footer>
        )}
      {s.storageFailed && (
        <p role="status" className={styles.warning}>
          {s.saveNotice ?? "Storage is unavailable."} Progress won’t be saved.
        </p>
      )}
      {lost && (
        <div className={styles.scrim} style={{ zIndex: 60 }}>
          <div className={styles.modal}>
            <h2>The renderer lost connection.</h2>
            <p>Your saved cosmetics are safe. Reload to restart.</p>
            <button onClick={() => location.reload()}>Reload game</button>
          </div>
        </div>
      )}
      <TutorialUI />
      {s.panel === "shop" && <Cosmetics wardrobe={false} />}
      {s.panel === "wardrobe" && <Cosmetics wardrobe />}
      {s.panel === "start" && <StartMenu />}
      {s.panel === "progress" && <Progress />}
      {s.panel === "pause" && (
        <Modal label="Paused">
          <p className={styles.eyebrow}>TAKE A BREATHER</p>
          <h2>Off the clock.</h2>
          <p>
            The shift clock and visitors are paused. Inspect carefully and
            choose who to trust. Three mistakes fail the judgement at 5:55 AM.
          </p>
          <button onClick={() => s.open("progress")}>
            Achievements & rewards
            {achievements.some(
              (a) =>
                s.save.achievements.includes(a.id) &&
                !s.save.claimedRewards.includes(`achievement:${a.id}`),
            )
              ? " · Ready to claim"
              : ""}
          </button>
          <GameSettings />
          <div className={styles.pauseActions}>
            <button className={styles.primary} onClick={() => {
              s.open(null);
              if (s.suspension === "interrupted") useGame.setState({ suspension: null, focused: true });
            }}>
              Resume
            </button>
            {s.scene === "room" && (
              <button onClick={s.lobby}>Return to lobby</button>
            )}
            <Link href="/playground">Back to Playground ↗</Link>
          </div>
        </Modal>
      )}
    </div>
  );
}

"use client";
import { ActionIcon } from "./action-icon";
import { useEffect, useState } from "react";
import { useGame } from "@/lib/deader/store";
import {
  specialDescriptions,
  hourlyOffer,
  offerCountdown,
  ownsSpecial,
  specialEquipped,
  specialItem,
  specialPreview,
} from "@/lib/deader/hourly-shop";
import { SPECIAL_IDS, type SpecialId } from "@/lib/deader/special-ids";
import { Modal } from "./modal";
import { Preview } from "./preview";
import { Cone } from "./character";
import { GlitchBits } from "./special-details";
import { Sign } from "./environment";
import styles from "./game.module.css";
export function useOfferTime() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const sync = () => setNow(Date.now());
    const timer = setInterval(sync, 1000);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return now;
}
export function HourlyShop() {
  const now = useOfferTime(),
    s = useGame(),
    offer = hourlyOffer(now),
    fixture = process.env.NODE_ENV === "development" ? s.specialFixture : null,
    id = fixture ?? offer.id,
    item = specialItem(id),
    owned = ownsSpecial(s.save, id),
    equipped = specialEquipped(s.save, id);
  const preview = specialPreview(s.save, id);
  return (
    <Modal
      label="Hourly special"
      closeLabel="Back to lobby"
      className={`${styles.shopModal} ${styles.hourlyModal}`}
    >
      <div className={styles.shopScroll}>
        {process.env.NODE_ENV === "development" && (
          <label>
            Local preview fixture
            <select
              value={fixture ?? ""}
              onChange={(e) =>
                useGame.setState({
                  specialFixture: (e.target.value as SpecialId) || null,
                })
              }
            >
              <option value="">Live hourly offer</option>
              {SPECIAL_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className={styles.hourlyDetails}><p className={styles.eyebrow}>ONE ITEM · EVERY HOUR</p>
        <h2>{item.name}</h2>
        <p className={styles.balance}>{s.save.coins} COINS</p>
        <p>
          Changes in <strong>{offerCountdown(now)}</strong> · The same item may
          stay.
        </p>
        <p>
          {specialDescriptions[id]}
        </p>
        <p>Yours forever once purchased. Find owned specials in Customise.</p></div>
        <Preview {...preview} />
      </div>
      <div className={styles.purchase}>
        <button
          disabled={!!fixture || owned || s.save.coins < item.price}
          onClick={() => s.buySpecial(offer.id, offer.hour)}
        >
          <ActionIcon name="shop" />{owned ? "Owned" : `Purchase · ${item.price} coins`}
        </button>
        <button
          className={styles.primary}
          disabled={!!fixture || !owned || equipped}
          onClick={() => {
            if (item.category === "pet") s.wearPet("mini-anomaly");
            else s.wearAccessory(item.category, item.id);
          }}
        >
          <ActionIcon name="equip" />{equipped ? "Equipped" : "Equip"}
        </button>
        <button onClick={() => s.open("shop")}><ActionIcon name="back" />Back to shop</button>
      </div>
    </Modal>
  );
}
export function HourlyDisplay() {
  const now = useOfferTime(),
    offer = hourlyOffer(now),
    item = specialItem(offer.id);
  return (
    <group
      position={[-3.1, 0, 1.25]}
      rotation={[0, 0.45, 0]}
      userData={{ vrInteraction: "Hourly special", vrAim: [0, 1.3, 0] }}
    >
      <Cone colour="#343737" lowDetail />
      <GlitchBits />
      <mesh position={[-0.63, 0.85, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 1.7, 8]} />
        <meshStandardMaterial color="#282927" roughness={0.8} />
      </mesh>
      <Sign
        text={`HOURLY SPECIAL\n${item.name}\nChanges in ${offerCountdown(now)}`}
        position={[-0.35, 1.95, 0.03]}
        width={1.4}
        height={0.65}
        background="#10171a"
        colour="#eee4cf"
      />
    </group>
  );
}

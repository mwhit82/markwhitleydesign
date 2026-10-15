"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useGame } from "@/lib/deader/store";
import styles from "./game.module.css";
export function Modal({
  children,
  label,
  onClose,
}: {
  children: ReactNode;
  label: string;
  onClose?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    return () => old?.focus();
  }, []);
  return (
    <div className={styles.scrim}>
      <div
        ref={ref}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const items = ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)",
          );
          if (!items?.length) return;
          const first = items[0],
            last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
      >
        <button
          className={styles.close}
          onClick={onClose ?? (() => useGame.getState().open(null))}
          aria-label="Close menu"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

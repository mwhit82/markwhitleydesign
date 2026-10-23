"use client";
import { ActionIcon } from "./action-icon";
import { useEffect, useRef, type ReactNode } from "react";
import { tutorialCopy } from "@/lib/deader/tutorial";
import { useGame } from "@/lib/deader/store";
import styles from "./game.module.css";
export function Modal({
  children,
  label,
  onClose,
  className = "",
  closeLabel,
  focusDialog = false,
  header,
}: {
  children: ReactNode;
  header?: ReactNode;
  label: string;
  onClose?: () => void;
  className?: string;
  closeLabel?: string;
  focusDialog?: boolean;
}) {
  const tutorial = useGame(s => s.tutorial);
  const tutorialMessage = useGame(s => s.tutorialMessage);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    if(focusDialog)ref.current?.focus();
    else ref.current?.querySelector<HTMLElement>("button")?.focus();
    return () => old?.focus();
  }, [focusDialog]);
  return (
    <div className={styles.scrim}>
      <div
        ref={ref}
        tabIndex={-1}
        className={`${styles.modal} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const items = ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), summary",
          );
          if (!items?.length) return;
          const first = items[0],
            last = items[items.length - 1];
          if (document.activeElement === ref.current) {
            e.preventDefault();
            (e.shiftKey ? last : first).focus();
          } else if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
      >
        {header ?? <button
          className={styles.close}
          onClick={onClose ?? (() => useGame.getState().open(null))}
          aria-label={closeLabel ?? "Close menu"}
        >
          {closeLabel ?? "×"}
        </button>}
        {tutorial && <div className={styles.practiceNote}><p>{tutorialMessage ?? tutorialCopy[tutorial].body}</p><button onClick={()=>useGame.getState().lobby()}><ActionIcon name="close" />Exit tutorial</button></div>}
        {children}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const currentTheme = document.documentElement.dataset.theme;
    if (currentTheme === "dark" || currentTheme === "light") {
      setTheme(currentTheme);
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";

    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("theme", nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] text-[color:var(--foreground)] hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]"
      aria-label="Toggle theme"
    >
      <Icon icon={theme === "light" ? Moon02Icon : Sun01Icon} size={18} />
    </button>
  );
}

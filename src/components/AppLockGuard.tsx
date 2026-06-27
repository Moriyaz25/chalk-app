"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { hashPin } from "@/components/settings/DeviceLockSettings";

export function AppLockGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const hasLock = Boolean(localStorage.getItem("chalk-lock-hash"));
      setLocked(pathname !== "/login" && hasLock && sessionStorage.getItem("chalk-unlocked") !== "1");
    });
  }, [pathname]);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    const expected = localStorage.getItem("chalk-lock-hash");
    if (expected && (await hashPin(pin)) === expected) {
      sessionStorage.setItem("chalk-unlocked", "1");
      setLocked(false);
      setError("");
    } else {
      setError("That PIN is not correct.");
      setPin("");
    }
  }

  if (!locked) return children;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-paper p-5 text-ink">
      <form onSubmit={unlock} className="w-full max-w-xs rounded-3xl border border-line bg-card p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-chalk-amber/20">
          <LockKeyhole size={25} />
        </div>
        <h1 className="mt-4 font-hand text-3xl">Your space is locked</h1>
        <p className="mt-1 text-xs text-ink-soft/60">Enter your device PIN to open Chalk.</p>
        <input
          autoFocus
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
          type="password"
          inputMode="numeric"
          className="mt-5 w-full rounded-2xl border border-line bg-card-muted px-4 py-3 text-center text-lg tracking-[0.4em] outline-none focus:border-chalk-amber"
        />
        {error && <p className="mt-2 text-xs text-dust-pink">{error}</p>}
        <button className="mt-4 w-full rounded-full bg-ink py-3 text-sm font-semibold text-paper">Unlock</button>
      </form>
    </div>
  );
}

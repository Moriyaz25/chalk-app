"use client";

import { useEffect, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";

export function DeviceLockSettings() {
  const [enabled, setEnabled] = useState(false);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setEnabled(Boolean(localStorage.getItem("chalk-lock-hash")));
    });
  }, []);

  async function enable() {
    if (!/^\d{4,8}$/.test(pin)) return setMessage("Use a 4-8 digit PIN.");
    localStorage.setItem("chalk-lock-hash", await hashPin(pin));
    sessionStorage.setItem("chalk-unlocked", "1");
    setPin("");
    setEnabled(true);
    setMessage("Device lock enabled.");
  }

  function disable() {
    localStorage.removeItem("chalk-lock-hash");
    sessionStorage.removeItem("chalk-unlocked");
    setEnabled(false);
    setMessage("Device lock disabled.");
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-xl bg-chalk-mint/15 p-2 text-chalk-mint">
          <LockKeyhole size={17} />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Device PIN lock</p>
          <p className="text-xs leading-5 text-ink-soft/60">Locks Chalk when this browser session closes.</p>
        </div>
      </div>
      {enabled ? (
        <button type="button" onClick={disable} className="w-full rounded-full border border-line py-2.5 text-xs font-semibold text-dust-pink">
          Disable device lock
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
            type="password"
            inputMode="numeric"
            placeholder="4-8 digit PIN"
            className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none"
          />
          <button type="button" onClick={enable} className="flex items-center gap-1 rounded-xl bg-ink px-3 text-xs font-semibold text-paper">
            <ShieldCheck size={14} /> Enable
          </button>
        </div>
      )}
      {message && <p className="mt-2 text-xs text-ink-soft/60">{message}</p>}
    </div>
  );
}

export async function hashPin(pin: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`chalk-device:${pin}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PenLine, Plus, Sparkles, UserPlus } from "lucide-react";
import { CircleCard, type CircleSummary } from "@/components/board/CircleCard";

export default function HomePage() {
  const [circles, setCircles] = useState<CircleSummary[] | null>(null);

  useEffect(() => {
    fetch("/api/circles")
      .then((res) => res.json())
      .then((data) => setCircles(data.circles))
      .catch(() => setCircles([]));
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-5 overflow-hidden rounded-lg border border-line bg-card shadow-sm">
        <div className="board-texture p-5">
          <div className="mb-7 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-chalk-white/10 px-3 py-1 text-xs font-medium text-chalk-white/75">
              <Sparkles size={13} />
              Chalk studio
            </div>
            <Link
              href="/circles/new"
              aria-label="Create or join a circle"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-chalk-white text-slate-950 shadow-sm transition active:scale-95"
            >
              <Plus size={19} />
            </Link>
          </div>
          <h1 className="font-hand text-5xl leading-none text-chalk-white">Your boards</h1>
          <p className="mt-2 max-w-[280px] text-sm text-chalk-white/60">
            Handwritten moments for the circles that matter.
          </p>
        </div>
      </header>

      {circles === null && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-lg bg-ink/5" />
          ))}
        </div>
      )}

      {circles?.length === 0 && (
        <div className="glass-panel mt-5 flex flex-col items-center gap-3 rounded-lg px-6 py-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-chalk-amber/20">
            <UserPlus className="text-cork-dark" size={26} />
          </div>
          <p className="font-hand text-3xl text-ink">No one yet</p>
          <p className="text-sm text-ink-soft/70 max-w-[240px]">
            Connect with someone to start leaving each other chalk messages.
          </p>
          <Link
            href="/circles/new"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper shadow-lg shadow-ink/10"
          >
            <PenLine size={16} />
            Connect with someone
          </Link>
        </div>
      )}

      {circles && circles.length > 0 && (
        <div className="space-y-2.5">
          {circles.map((circle) => (
            <CircleCard key={circle.id} circle={circle} />
          ))}
        </div>
      )}
    </div>
  );
}

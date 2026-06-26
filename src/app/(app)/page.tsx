"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
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
    <div className="px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 max-w-md mx-auto">
      <h1 className="font-hand text-4xl text-ink mb-1">Your boards</h1>
      <p className="text-sm text-ink-soft/70 mb-6">
        Handwritten messages, just for the people you choose.
      </p>

      {circles === null && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[68px] rounded-2xl bg-ink/5 animate-pulse" />
          ))}
        </div>
      )}

      {circles?.length === 0 && (
        <div className="flex flex-col items-center text-center mt-16 gap-3">
          <div className="h-16 w-16 rounded-full bg-chalk-amber/20 flex items-center justify-center">
            <UserPlus className="text-cork-dark" size={26} />
          </div>
          <p className="font-hand text-2xl text-ink">No one yet</p>
          <p className="text-sm text-ink-soft/70 max-w-[240px]">
            Connect with someone to start leaving each other chalk messages.
          </p>
          <Link
            href="/circles/new"
            className="mt-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm font-medium"
          >
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

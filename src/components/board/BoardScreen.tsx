"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Pencil, LayoutGrid, Square } from "lucide-react";
import { BoardPlayback } from "@/components/board/BoardPlayback";
import { BOARD_COLORS, type BoardColorKey, type ChalkDrawing } from "@/types/chalk";
import clsx from "clsx";

type BoardItem = {
  id: string;
  drawing: ChalkDrawing;
  boardColor: BoardColorKey;
  createdAt: string;
  sender: { id: string; name: string | null; image: string | null };
};

type ViewMode = "single" | "grid";

export function BoardScreen({
  circleId,
  circleName,
}: {
  circleId: string;
  circleName: string;
}) {
  const [boards, setBoards] = useState<BoardItem[] | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("single");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/boards/${circleId}`);
      const data = await res.json();
      if (cancelled) return;
      setBoards(data.boards ?? []);

      if (data.boards?.length > 0) {
        fetch(`/api/boards/${circleId}/${data.boards[0].id}/seen`, {
          method: "POST",
        }).catch(() => {});
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [circleId]);

  const latest = boards?.[0];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center h-9 w-9 rounded-full bg-ink/5 text-ink-soft active:scale-90"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </Link>
          <p className="font-hand text-2xl text-ink leading-none">{circleName}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode("single")}
            className={clsx(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              viewMode === "single" ? "bg-ink/10 text-ink" : "text-ink-soft/50"
            )}
            aria-label="Single view"
          >
            <Square size={16} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={clsx(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              viewMode === "grid" ? "bg-ink/10 text-ink" : "text-ink-soft/50"
            )}
            aria-label="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 pb-28">
        {boards === null && (
          <div className="h-72 rounded-2xl bg-ink/5 animate-pulse" />
        )}

        {boards?.length === 0 && (
          <div className="flex flex-col items-center text-center mt-16 gap-3">
            <p className="font-hand text-2xl text-ink">Nothing here yet</p>
            <p className="text-sm text-ink-soft/70 max-w-[240px]">
              Draw the first chalk message for {circleName}.
            </p>
          </div>
        )}

        {viewMode === "single" && latest && (
          <div className="space-y-4">
            <div
              className="rounded-2xl overflow-hidden ring-1 ring-ink/5 aspect-square"
              style={{ backgroundColor: BOARD_COLORS[latest.boardColor] }}
            >
              <BoardPlayback
                drawing={latest.drawing}
                boardColorHex={BOARD_COLORS[latest.boardColor]}
                animate
                className="h-full w-full"
              />
            </div>
            <p className="text-xs text-ink-soft/60 text-center">
              {latest.sender.name} · {new Date(latest.createdAt).toLocaleString()}
            </p>
          </div>
        )}

        {viewMode === "grid" && boards && boards.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {boards.map((board) => (
              <div key={board.id} className="space-y-1.5">
                <div
                  className="rounded-xl overflow-hidden ring-1 ring-ink/5 aspect-square"
                  style={{ backgroundColor: BOARD_COLORS[board.boardColor] }}
                >
                  <BoardPlayback
                    drawing={board.drawing}
                    boardColorHex={BOARD_COLORS[board.boardColor]}
                    className="h-full w-full"
                  />
                </div>
                <p className="text-[11px] text-ink-soft/60 px-1 truncate">
                  {board.sender.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href={`/board/${circleId}/draw`}
        className="fixed bottom-24 right-5 flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-3 shadow-lg active:scale-95"
      >
        <Pencil size={18} />
        <span className="text-sm font-medium">Draw</span>
      </Link>
    </div>
  );
}

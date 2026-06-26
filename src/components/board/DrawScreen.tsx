"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChalkCanvas, type ChalkCanvasHandle } from "@/components/draw/ChalkCanvas";
import { ChalkTray } from "@/components/draw/ChalkTray";
import { DrawToolbar } from "@/components/draw/DrawToolbar";
import { BOARD_COLORS, CHALK_COLORS, type BoardColorKey } from "@/types/chalk";
import { ChevronLeft } from "lucide-react";

type DrawScreenProps = {
  circleId: string;
  circleName: string;
};

export function DrawScreen({ circleId, circleName }: DrawScreenProps) {
  const router = useRouter();
  const canvasRef = useRef<ChalkCanvasHandle>(null);
  const [color, setColor] = useState<string>(CHALK_COLORS[0].hex);
  const [brushWidth, setBrushWidth] = useState(8);
  const [boardColor, setBoardColor] = useState<BoardColorKey>("chalkboard-green");
  const [sending, setSending] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [redoAvailable, setRedoAvailable] = useState(false);

  const handleStrokesChange = useCallback((count: number) => {
    setStrokeCount(count);
  }, []);

  const handleUndo = useCallback(() => {
    canvasRef.current?.undo();
    setRedoAvailable(true);
  }, []);

  const handleRedo = useCallback(() => {
    canvasRef.current?.redo();
  }, []);

  const handleClear = useCallback(() => {
    canvasRef.current?.clear();
    setRedoAvailable(false);
  }, []);

  const handleSend = useCallback(async () => {
    const strokes = canvasRef.current?.getStrokes() ?? [];
    if (strokes.length === 0) return;

    setSending(true);
    try {
      const res = await fetch(`/api/boards/${circleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drawing: { strokes, viewBox: { width: 600, height: 600 } },
          boardColor,
        }),
      });

      if (!res.ok) throw new Error("Failed to send board");

      canvasRef.current?.clear();
      setRedoAvailable(false);
      router.push(`/board/${circleId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }, [circleId, boardColor, router]);

  return (
    <div className="flex h-dvh flex-col board-texture">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center h-9 w-9 rounded-full bg-white/5 text-chalk-white/80 active:scale-90"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="font-hand text-2xl text-chalk-white leading-none">{circleName}</p>
          <p className="text-[11px] text-chalk-white/50 font-sans">drawing for them</p>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1 px-3">
        <div
          className="h-full w-full rounded-2xl overflow-hidden ring-1 ring-white/5"
          style={{ backgroundColor: BOARD_COLORS[boardColor] }}
        >
          <ChalkCanvas
            ref={canvasRef}
            color={color}
            strokeWidth={brushWidth}
            boardColorHex={BOARD_COLORS[boardColor]}
            className="h-full w-full"
            onStrokesChange={handleStrokesChange}
          />
        </div>
      </div>

      {/* Chalk tray + toolbar */}
      <div className="px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
        <div className="flex items-center justify-between gap-4">
          <ChalkTray selected={color} onSelect={setColor} />
        </div>
        <DrawToolbar
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onSend={handleSend}
          sending={sending}
          canUndo={strokeCount > 0}
          canRedo={redoAvailable}
          brushWidth={brushWidth}
          onBrushWidthChange={setBrushWidth}
          boardColor={boardColor}
          onBoardColorChange={setBoardColor}
        />
      </div>
    </div>
  );
}

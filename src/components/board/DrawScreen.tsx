"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChalkCanvas, type ChalkCanvasHandle } from "@/components/draw/ChalkCanvas";
import { ChalkTray } from "@/components/draw/ChalkTray";
import { DrawToolbar } from "@/components/draw/DrawToolbar";
import {
  EMPTY_EXPERIENCE,
  ExperienceTray,
} from "@/components/board/ExperienceTray";
import {
  BOARD_COLORS,
  CARD_FONTS,
  CHALK_COLORS,
  type BoardColorKey,
  type ChalkTextElement,
  type BoardExperience,
  type ChalkDrawing,
} from "@/types/chalk";
import { ChevronLeft, Move, Radio, Sparkles, Users } from "lucide-react";

type DrawScreenProps = {
  circleId: string;
  circleName: string;
  initialDrawing?: ChalkDrawing | null;
  replyToId?: string;
};

type ToolMode = "draw" | "text";

export function DrawScreen({ circleId, circleName, initialDrawing, replyToId }: DrawScreenProps) {
  const router = useRouter();
  const canvasRef = useRef<ChalkCanvasHandle>(null);
  const [color, setColor] = useState<string>(CHALK_COLORS[0].hex);
  const [brushWidth, setBrushWidth] = useState(8);
  const [boardColor, setBoardColor] = useState<BoardColorKey>("chalkboard-green");
  const [mode, setMode] = useState<ToolMode>("draw");
  const [textElements, setTextElements] = useState<ChalkTextElement[]>(
    initialDrawing?.textElements ?? []
  );
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [strokeCount, setStrokeCount] = useState(initialDrawing?.strokes.length ?? 0);
  const [redoAvailable, setRedoAvailable] = useState(false);
  const [experience, setExperience] = useState<BoardExperience>({
    ...EMPTY_EXPERIENCE,
    replyToId,
  });
  const [liveTogether, setLiveTogether] = useState(false);
  const [liveLabel, setLiveLabel] = useState("");
  const lastRemoteUpdate = useRef("");

  useEffect(() => {
    if (!liveTogether) return;
    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/circles/${circleId}/draft`);
      const data = await res.json();
      if (
        !cancelled &&
        data.draft?.updatedAt &&
        data.draft.updatedAt !== lastRemoteUpdate.current &&
        data.draft.updatedBy !== data.currentUserId
      ) {
        lastRemoteUpdate.current = data.draft.updatedAt;
        canvasRef.current?.loadStrokes(data.draft.drawing?.strokes ?? []);
        setTextElements(data.draft.drawing?.textElements ?? []);
        setLiveLabel(`${data.draft.updater?.name ?? "Your person"} is drawing too`);
      }
    }

    poll();
    const timer = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [circleId, liveTogether]);

  useEffect(() => {
    if (!liveTogether) return;
    const timer = window.setTimeout(async () => {
      const drawing = {
        strokes: canvasRef.current?.getStrokes() ?? [],
        textElements,
        viewBox: { width: 600, height: 600 },
      };
      const res = await fetch(`/api/circles/${circleId}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawing }),
      });
      const data = await res.json();
      if (data.draft?.updatedAt) lastRemoteUpdate.current = data.draft.updatedAt;
      setLiveLabel("Shared canvas is live");
    }, 450);
    return () => window.clearTimeout(timer);
  }, [circleId, liveTogether, strokeCount, textElements]);

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
    setTextElements([]);
    setSelectedTextId(null);
    setRedoAvailable(false);
  }, []);

  const handleAddText = useCallback(() => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `text-${Date.now()}`;

    const next: ChalkTextElement = {
      id,
      text: "Write here",
      x: 300,
      y: 310,
      fontFamily: CARD_FONTS[0].value,
      fontSize: 42,
      color: "#fbf6e8",
      outlineColor: "#20201d",
      outlineWidth: 2,
      backgroundColor: "transparent",
      rotation: -2,
    };

    setTextElements((prev) => [...prev, next]);
    setSelectedTextId(id);
    setMode("text");
  }, []);

  const handleUpdateText = useCallback(
    (patch: Partial<ChalkTextElement>) => {
      if (!selectedTextId) return;
      setTextElements((prev) =>
        prev.map((item) => (item.id === selectedTextId ? { ...item, ...patch } : item))
      );
    },
    [selectedTextId]
  );

  const handleMoveText = useCallback((id: string, x: number, y: number) => {
    setTextElements((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              x: Math.min(560, Math.max(40, x)),
              y: Math.min(560, Math.max(50, y)),
            }
          : item
      )
    );
  }, []);

  const handleDeleteText = useCallback(() => {
    if (!selectedTextId) return;
    setTextElements((prev) => prev.filter((item) => item.id !== selectedTextId));
    setSelectedTextId(null);
  }, [selectedTextId]);

  const handleSend = useCallback(async () => {
    const strokes = canvasRef.current?.getStrokes() ?? [];
    const meaningfulText = textElements.filter((item) => item.text.trim().length > 0);
    if (
      strokes.length === 0 &&
      meaningfulText.length === 0 &&
      !experience.media &&
      !experience.gift
    ) return;

    const expiryMs = {
      never: 0,
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    }[experience.expiresIn];

    setSending(true);
    setSendError("");
    try {
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => resolve())
      );
      const payload = {
        drawing: {
          strokes,
          textElements: meaningfulText,
          viewBox: { width: 600, height: 600 },
        },
        boardColor,
        kind: experience.kind,
        deliveryMode: experience.deliveryMode,
        unlockAt: experience.unlockAt
          ? new Date(experience.unlockAt).toISOString()
          : null,
        expiresAt: expiryMs ? new Date(Date.now() + expiryMs).toISOString() : null,
        viewOnce: experience.viewOnce,
        media: experience.media,
        prompt: experience.prompt,
        gift: experience.gift,
        replyToId: experience.replyToId,
      };
      const res = await fetch(`/api/boards/${circleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn’t send this chalk");
      }

      canvasRef.current?.clear();
      setTextElements([]);
      setSelectedTextId(null);
      setRedoAvailable(false);
      setExperience(EMPTY_EXPERIENCE);
      if (liveTogether) {
        fetch(`/api/circles/${circleId}/draft`, { method: "DELETE" }).catch(() => {});
      }
      router.push(`/board/${circleId}`);
    } catch (err) {
      console.error(err);
      setSendError(
        err instanceof Error
          ? `${err.message}. Your drawing is still here—tap send to retry.`
          : "Couldn’t send. Your drawing is safe—tap send to retry."
      );
    } finally {
      setSending(false);
    }
  }, [boardColor, circleId, experience, liveTogether, router, textElements]);

  const selectedText = textElements.find((item) => item.id === selectedTextId) ?? null;
  const hasContent =
    strokeCount > 0 ||
    textElements.some((item) => item.text.trim().length > 0) ||
    !!experience.media ||
    !!experience.gift;

  return (
    <div className="board-texture flex h-dvh flex-col">
      <header className="z-10 flex items-center gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-chalk-white/85 active:scale-90"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-hand text-2xl leading-none text-chalk-white">{circleName}</p>
          <p className="flex items-center gap-1.5 font-sans text-[11px] text-chalk-white/55">
            <Sparkles size={12} />
            handmade card studio
          </p>
        </div>
        {mode === "text" && selectedText && (
          <div className="hidden items-center gap-1 rounded-full bg-chalk-white/10 px-3 py-1 text-xs text-chalk-white/70 sm:flex">
            <Move size={13} />
            Drag text on card
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setLiveTogether((value) => !value);
            setLiveLabel(liveTogether ? "" : "Opening a shared canvas…");
          }}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs ${
            liveTogether
              ? "bg-chalk-mint/20 text-chalk-mint ring-1 ring-chalk-mint/40"
              : "bg-white/8 text-chalk-white/65"
          }`}
        >
          {liveTogether ? <Radio size={13} /> : <Users size={13} />}
          {liveTogether ? "Live" : "Together"}
        </button>
      </header>

      <div className="min-h-0 flex-1 px-3">
        <div
          className="h-full w-full overflow-hidden rounded-lg ring-1 ring-white/10 shadow-2xl shadow-black/25"
          style={{ backgroundColor: BOARD_COLORS[boardColor] }}
        >
          <ChalkCanvas
            ref={canvasRef}
            color={color}
            strokeWidth={brushWidth}
            boardColorHex={BOARD_COLORS[boardColor]}
            mode={mode}
            textElements={textElements}
            selectedTextId={selectedTextId}
            onSelectText={setSelectedTextId}
            onMoveText={handleMoveText}
            className="h-full w-full"
            onStrokesChange={handleStrokesChange}
            initialStrokes={initialDrawing?.strokes}
          />
        </div>
      </div>

      <div className="max-h-[47dvh] space-y-4 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {liveLabel && (
          <p className="flex items-center justify-center gap-2 text-xs text-chalk-mint">
            <span className="h-2 w-2 animate-pulse rounded-full bg-chalk-mint" />
            {liveLabel}
          </p>
        )}
        {sendError && (
          <p role="alert" className="rounded-xl bg-dust-pink/15 px-3 py-2 text-center text-xs text-dust-pink">
            {sendError}
          </p>
        )}
        <ExperienceTray value={experience} onChange={setExperience} />
        <div className="overflow-x-auto">
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
          mode={mode}
          onModeChange={setMode}
          selectedText={selectedText}
          onAddText={handleAddText}
          onUpdateText={handleUpdateText}
          onDeleteText={handleDeleteText}
          hasContent={hasContent}
        />
      </div>
    </div>
  );
}

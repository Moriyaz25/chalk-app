"use client";

import { Undo2, Redo2, Trash2, Send } from "lucide-react";
import { BOARD_COLORS, type BoardColorKey } from "@/types/chalk";
import clsx from "clsx";

type DrawToolbarProps = {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSend: () => void;
  sending: boolean;
  canUndo: boolean;
  canRedo: boolean;
  brushWidth: number;
  onBrushWidthChange: (w: number) => void;
  boardColor: BoardColorKey;
  onBoardColorChange: (c: BoardColorKey) => void;
};

export function DrawToolbar({
  onUndo,
  onRedo,
  onClear,
  onSend,
  sending,
  canUndo,
  canRedo,
  brushWidth,
  onBrushWidthChange,
  boardColor,
  onBoardColorChange,
}: DrawToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ToolButton label="Undo" onClick={onUndo} disabled={!canUndo}>
            <Undo2 size={18} />
          </ToolButton>
          <ToolButton label="Redo" onClick={onRedo} disabled={!canRedo}>
            <Redo2 size={18} />
          </ToolButton>
          <ToolButton label="Clear" onClick={onClear} disabled={!canUndo && !canRedo}>
            <Trash2 size={18} />
          </ToolButton>
        </div>

        <button
          onClick={onSend}
          disabled={sending || !canUndo}
          className={clsx(
            "flex items-center gap-2 rounded-full px-5 py-2.5 font-medium text-sm transition-all",
            "bg-chalk-amber text-ink shadow-sm",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            !sending && canUndo && "hover:brightness-105 active:scale-95"
          )}
        >
          <Send size={16} />
          {sending ? "Sending…" : "Send"}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-chalk-white/60 font-sans w-12">Width</span>
        <input
          type="range"
          min={3}
          max={16}
          value={brushWidth}
          onChange={(e) => onBrushWidthChange(Number(e.target.value))}
          className="flex-1 accent-chalk-amber"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-chalk-white/60 font-sans w-12">Board</span>
        {(Object.keys(BOARD_COLORS) as BoardColorKey[]).map((key) => (
          <button
            key={key}
            aria-label={key}
            onClick={() => onBoardColorChange(key)}
            className={clsx(
              "h-7 w-7 rounded-md border-2 transition-transform",
              boardColor === key ? "border-chalk-amber scale-110" : "border-transparent opacity-70"
            )}
            style={{ backgroundColor: BOARD_COLORS[key] }}
          />
        ))}
      </div>
    </div>
  );
}

function ToolButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex items-center justify-center h-9 w-9 rounded-full transition-colors",
        "bg-white/5 text-chalk-white/80",
        disabled ? "opacity-30" : "hover:bg-white/10 active:scale-90"
      )}
    >
      {children}
    </button>
  );
}

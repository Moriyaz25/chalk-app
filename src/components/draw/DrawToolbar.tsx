"use client";

import {
  CaseSensitive,
  PaintBucket,
  Palette,
  PenLine,
  Plus,
  Redo2,
  Send,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import {
  BOARD_COLORS,
  CARD_FONTS,
  type BoardColorKey,
  type ChalkTextElement,
} from "@/types/chalk";
import clsx from "clsx";

type ToolMode = "draw" | "text";

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
  mode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  selectedText: ChalkTextElement | null;
  onAddText: () => void;
  onUpdateText: (patch: Partial<ChalkTextElement>) => void;
  onDeleteText: () => void;
  hasContent: boolean;
};

const TEXT_COLORS = [
  "#fbf6e8",
  "#20201d",
  "#f1c36f",
  "#f19a94",
  "#8ec9de",
  "#a5d59d",
  "#ffffff",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#22c55e",
  "#2563eb",
];

const BACKGROUND_COLORS = [
  "transparent",
  "#ffffff",
  "#fff4c7",
  "#ffd7d7",
  "#dff1ff",
  "#e7f9df",
  "#25241f",
  "#1c2620",
  "#f4ead7",
  "#c9a66b",
];

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
  mode,
  onModeChange,
  selectedText,
  onAddText,
  onUpdateText,
  onDeleteText,
  hasContent,
}: DrawToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="grid grid-cols-2 rounded-lg border border-chalk-white/10 bg-black/18 p-1">
          <ModeButton active={mode === "draw"} onClick={() => onModeChange("draw")} icon={<PenLine size={16} />}>
            Draw
          </ModeButton>
          <ModeButton active={mode === "text"} onClick={() => onModeChange("text")} icon={<Type size={16} />}>
            Text
          </ModeButton>
        </div>
        <button
          onClick={onSend}
          disabled={sending || !hasContent}
          className={clsx(
            "flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
            "bg-chalk-amber text-slate-950 shadow-sm",
            "disabled:cursor-not-allowed disabled:opacity-40",
            !sending && hasContent && "hover:brightness-105 active:scale-95"
          )}
        >
          <Send size={16} />
          {sending ? "Sending..." : "Send"}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ToolButton label="Undo" onClick={onUndo} disabled={!canUndo}>
            <Undo2 size={18} />
          </ToolButton>
          <ToolButton label="Redo" onClick={onRedo} disabled={!canRedo}>
            <Redo2 size={18} />
          </ToolButton>
          <ToolButton label="Clear" onClick={onClear} disabled={!hasContent && !canRedo}>
            <Trash2 size={18} />
          </ToolButton>
        </div>
        {mode === "text" && (
          <button
            onClick={onAddText}
            className="flex items-center gap-2 rounded-full bg-chalk-white px-4 py-2 text-xs font-semibold text-slate-950 active:scale-95"
          >
            <Plus size={15} />
            Add text
          </button>
        )}
      </div>

      {mode === "draw" && (
        <Panel>
          <div className="flex items-center gap-3">
            <span className="flex w-16 items-center gap-1.5 text-xs font-semibold text-chalk-white/70">
              <PenLine size={14} />
              Width
            </span>
            <input
              type="range"
              min={2}
              max={22}
              value={brushWidth}
              onChange={(e) => onBrushWidthChange(Number(e.target.value))}
              className="flex-1 accent-chalk-amber"
            />
            <span className="w-8 text-right text-xs text-chalk-white/55">{brushWidth}</span>
          </div>
        </Panel>
      )}

      {mode === "text" && (
        <Panel>
          {!selectedText ? (
            <button
              onClick={onAddText}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-chalk-white/20 px-4 py-4 text-sm font-semibold text-chalk-white/75"
            >
              <Plus size={16} />
              Add a handmade text layer
            </button>
          ) : (
            <div className="space-y-3">
              <input
                value={selectedText.text}
                onChange={(e) => onUpdateText({ text: e.target.value })}
                placeholder="Write your message"
                className="w-full rounded-lg border border-chalk-white/10 bg-chalk-white/95 px-3 py-2.5 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-chalk-amber"
              />

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-chalk-white/55">Font</span>
                  <select
                    value={selectedText.fontFamily}
                    onChange={(e) => onUpdateText({ fontFamily: e.target.value })}
                    className="w-full rounded-lg border border-chalk-white/10 bg-chalk-white/95 px-2 py-2 text-xs font-semibold text-slate-950 outline-none"
                  >
                    {CARD_FONTS.map((font) => (
                      <option key={font.label} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-chalk-white/55">Size</span>
                  <input
                    type="range"
                    min={18}
                    max={86}
                    value={selectedText.fontSize}
                    onChange={(e) => onUpdateText({ fontSize: Number(e.target.value) })}
                    className="mt-3 w-full accent-chalk-amber"
                  />
                </label>
              </div>

              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <ColorInput
                  label="Text"
                  value={selectedText.color}
                  onChange={(color) => onUpdateText({ color })}
                />
                <ColorInput
                  label="Outline"
                  value={selectedText.outlineColor}
                  onChange={(outlineColor) => onUpdateText({ outlineColor })}
                />
                <button
                  onClick={onDeleteText}
                  className="mt-5 flex h-10 w-10 items-center justify-center rounded-lg bg-dust-pink/15 text-dust-pink"
                  aria-label="Delete text"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-chalk-white/55">Outline width</span>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    value={selectedText.outlineWidth}
                    onChange={(e) => onUpdateText({ outlineWidth: Number(e.target.value) })}
                    className="mt-3 w-full accent-chalk-amber"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-chalk-white/55">Rotate</span>
                  <input
                    type="range"
                    min={-18}
                    max={18}
                    value={selectedText.rotation}
                    onChange={(e) => onUpdateText({ rotation: Number(e.target.value) })}
                    className="mt-3 w-full accent-chalk-amber"
                  />
                </label>
              </div>

              <Swatches
                icon={<CaseSensitive size={14} />}
                label="Text colors"
                colors={TEXT_COLORS}
                selected={selectedText.color}
                onSelect={(color) => onUpdateText({ color })}
              />
              <Swatches
                icon={<PaintBucket size={14} />}
                label="Text background"
                colors={BACKGROUND_COLORS}
                selected={selectedText.backgroundColor}
                onSelect={(backgroundColor) => onUpdateText({ backgroundColor })}
              />
            </div>
          )}
        </Panel>
      )}

      <Panel>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-chalk-white/65">
          <Palette size={14} />
          Card background
        </div>
        <div className="grid grid-cols-6 gap-2">
          {(Object.keys(BOARD_COLORS) as BoardColorKey[]).map((key) => (
            <button
              key={key}
              aria-label={key}
              onClick={() => onBoardColorChange(key)}
              className={clsx(
                "h-8 rounded-lg border-2 transition-transform",
                boardColor === key ? "scale-105 border-chalk-amber" : "border-chalk-white/10 opacity-80"
              )}
              style={{ backgroundColor: BOARD_COLORS[key] }}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-chalk-white/10 bg-black/18 p-3 shadow-inner">
      {children}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition",
        active ? "bg-chalk-white text-slate-950 shadow-sm" : "text-chalk-white/62 hover:bg-chalk-white/8"
      )}
    >
      {icon}
      {children}
    </button>
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
        "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        "bg-chalk-white/8 text-chalk-white/85",
        disabled ? "opacity-30" : "hover:bg-chalk-white/14 active:scale-90"
      )}
    >
      {children}
    </button>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold text-chalk-white/55">{label}</span>
      <span className="flex h-10 items-center gap-2 rounded-lg border border-chalk-white/10 bg-chalk-white/95 px-2">
        <input
          type="color"
          value={value === "transparent" ? "#ffffff" : value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-8 border-0 bg-transparent p-0"
        />
        <span className="text-xs font-semibold text-slate-950">{value === "transparent" ? "None" : value}</span>
      </span>
    </label>
  );
}

function Swatches({
  icon,
  label,
  colors,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  colors: string[];
  selected: string;
  onSelect: (color: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-chalk-white/55">
        {icon}
        {label}
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onSelect(color)}
            className={clsx(
              "h-7 rounded-md border-2",
              selected === color ? "border-chalk-amber" : "border-chalk-white/12"
            )}
            style={{
              background:
                color === "transparent"
                  ? "linear-gradient(135deg, transparent 45%, #f19a94 45%, #f19a94 55%, transparent 55%), rgba(255,255,255,0.16)"
                  : color,
            }}
            aria-label={color}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import { CHALK_COLORS } from "@/types/chalk";
import clsx from "clsx";

type ChalkTrayProps = {
  selected: string;
  onSelect: (hex: string) => void;
  onOpenCustom?: () => void;
};

export function ChalkTray({ selected, onSelect, onOpenCustom }: ChalkTrayProps) {
  return (
    <div className="flex items-end gap-3 px-4 py-3 rounded-2xl bg-cork-dark/90 shadow-inner">
      {CHALK_COLORS.map((chalk, i) => {
        const isActive = selected === chalk.hex;
        return (
          <button
            key={chalk.key}
            type="button"
            aria-label={`${chalk.key} chalk`}
            onClick={() => onSelect(chalk.hex)}
            className={clsx(
              "chalk-stick relative h-9 w-7 shrink-0 transition-transform duration-150",
              isActive ? "-translate-y-2 scale-105" : "translate-y-0 opacity-90 hover:-translate-y-1"
            )}
            style={{
              backgroundColor: chalk.hex,
              transform: `${isActive ? "translateY(-8px)" : "translateY(0)"} rotate(${
                (i % 2 === 0 ? -1 : 1) * (3 + i)
              }deg)`,
            }}
          >
            {isActive && (
              <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-chalk-white/70" />
            )}
          </button>
        );
      })}

      {onOpenCustom && (
        <button
          type="button"
          aria-label="More colors"
          onClick={onOpenCustom}
          className="h-9 w-7 shrink-0 rounded-lg border-2 border-dashed border-chalk-white/40 text-chalk-white/70 text-xs flex items-center justify-center hover:bg-white/5"
        >
          +
        </button>
      )}
    </div>
  );
}

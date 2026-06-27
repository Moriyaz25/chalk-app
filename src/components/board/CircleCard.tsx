"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Archive, ChevronRight, Loader2, MoreVertical, Trash2, UserMinus, Users, X } from "lucide-react";
import clsx from "clsx";

export type CircleSummary = {
  id: string;
  name: string;
  isDirect: boolean;
  memberCount: number;
  unreadCount: number;
  currentRole: "OWNER" | "MEMBER";
  members: { id: string; name: string | null; image: string | null }[];
  latestBoard: { id: string; senderName: string | null; createdAt: string } | null;
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CircleCard({ circle, onChanged }: { circle: CircleSummary; onChanged?: () => void }) {
  const avatarMembers = circle.members.slice(0, 3);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState<"hide" | "leave" | "delete" | null>(null);
  const longPressTimer = useRef<number | null>(null);

  function clearLongPress() {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }

  function startLongPress() {
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      navigator.vibrate?.(12);
      setMenuOpen(true);
    }, 430);
  }

  async function hide() {
    setBusy("hide");
    const response = await fetch(`/api/circles/${circle.id}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "hide" }),
    });
    setBusy(null);
    if (!response.ok) return alert((await response.json().catch(() => ({}))).error || "Could not hide this chat.");
    setMenuOpen(false);
    onChanged?.();
  }

  async function leaveOrDeleteForMe() {
    const label = circle.isDirect ? "delete this chat from your boards" : "leave this circle";
    if (!confirm(`Are you sure you want to ${label}?`)) return;
    setBusy("leave");
    const response = await fetch(`/api/circles/${circle.id}/settings`, { method: "DELETE" });
    setBusy(null);
    if (!response.ok) return alert((await response.json().catch(() => ({}))).error || "Could not remove this chat.");
    setMenuOpen(false);
    onChanged?.();
  }

  async function deleteForever() {
    const confirmation = prompt(`This permanently deletes "${circle.name}" and all its messages for everyone.\n\nType DELETE to confirm.`);
    if (confirmation?.trim().toUpperCase() !== "DELETE") return;
    setBusy("delete");
    const response = await fetch(`/api/circles/${circle.id}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteForever", confirmation }),
    });
    setBusy(null);
    if (!response.ok) return alert((await response.json().catch(() => ({}))).error || "Could not permanently delete this chat.");
    setMenuOpen(false);
    onChanged?.();
  }

  return (
    <>
      <div
        className="group flex items-center gap-2 rounded-lg border border-line bg-card/82 p-2 shadow-sm transition hover:-translate-y-0.5 hover:bg-card"
        onPointerDown={startLongPress}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuOpen(true);
        }}
      >
        <Link href={`/board/${circle.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-1">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            {circle.isDirect ? (
              avatarMembers[0]?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarMembers[0].image} alt={circle.name} className="h-12 w-12 rounded-lg object-cover ring-2 ring-paper" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-dust-pink/40 font-hand text-xl text-ink">
                  {circle.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chalk-amber/30">
                <Users size={20} className="text-ink-soft" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-medium text-ink">{circle.name}</p>
              {circle.unreadCount > 0 ? (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-dust-pink px-1.5 text-[11px] font-bold text-white">
                  {circle.unreadCount > 99 ? "99+" : circle.unreadCount}
                </span>
              ) : circle.latestBoard ? (
                <span className="shrink-0 text-xs text-ink-soft/60">{timeAgo(circle.latestBoard.createdAt)}</span>
              ) : null}
            </div>
            <p className="truncate text-sm text-ink-soft/70">
              {circle.latestBoard
                ? `${circle.latestBoard.senderName} left a chalk message`
                : circle.isDirect
                  ? "Say hi - draw the first message"
                  : `${circle.memberCount} people in this circle`}
            </p>
          </div>
          <ChevronRight size={17} className="shrink-0 text-ink-soft/35 transition group-hover:text-ink-soft" />
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft/55 active:scale-95"
          aria-label={`Manage ${circle.name}`}
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)}>
          <div className="w-full max-w-md rounded-[1.75rem] bg-paper p-3 shadow-2xl ring-1 ring-line" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/15" />
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-line">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink/5 font-hand text-xl">
                {circle.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{circle.name}</p>
                <p className="text-xs text-ink-soft/55">{circle.isDirect ? "private chat" : `${circle.memberCount} members`}</p>
              </div>
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5" onClick={() => setMenuOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-2">
              <SheetButton
                icon={<Archive size={18} />}
                label="Hide from boards"
                description="Keep messages, remove this chat from your home list."
                onClick={hide}
                loading={busy === "hide"}
              />
              <SheetButton
                icon={<UserMinus size={18} />}
                label={circle.isDirect ? "Delete for me" : "Leave circle"}
                description={circle.isDirect ? "Remove your access to this chat list." : "Leave this circle from your account."}
                onClick={leaveOrDeleteForMe}
                loading={busy === "leave"}
              />
              {circle.currentRole === "OWNER" && (
                <SheetButton
                  danger
                  icon={<Trash2 size={18} />}
                  label="Delete permanently"
                  description="Delete this board, messages, media, and invites for everyone."
                  onClick={deleteForever}
                  loading={busy === "delete"}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SheetButton({
  icon,
  label,
  description,
  onClick,
  danger,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={clsx(
        "flex items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.98] disabled:opacity-60",
        danger ? "bg-dust-pink/12 text-dust-pink" : "bg-ink/5 text-ink"
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper/60">
        {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className={clsx("mt-0.5 block text-xs leading-4", danger ? "text-dust-pink/75" : "text-ink-soft/60")}>{description}</span>
      </span>
    </button>
  );
}

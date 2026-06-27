"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Clock3,
  CalendarDays,
  Flame,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  LockKeyhole,
  MemoryStick,
  MessageCircleHeart,
  Mic,
  Music2,
  Palette,
  Pencil,
  Pin,
  Reply,
  Search,
  Settings2,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { BoardPlayback } from "@/components/board/BoardPlayback";
import {
  BOARD_COLORS,
  type BoardColorKey,
  type BoardMedia,
  type ChalkDrawing,
} from "@/types/chalk";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { ChatTimeline, type ChatBoard } from "@/components/board/ChatTimeline";

const CircleManagement = dynamic(
  () => import("@/components/board/CircleManagement").then((module) => module.CircleManagement),
  { loading: () => <div className="h-32 animate-pulse rounded-2xl bg-ink/5" /> }
);

type Reaction = {
  id: string;
  emoji: string;
  userId: string;
  user: { id: string; name: string | null };
};

type BoardItem = {
  id: string;
  drawing: ChalkDrawing;
  boardColor: BoardColorKey;
  caption: string | null;
  kind: string;
  deliveryMode: string;
  unlockAt: string | null;
  expiresAt: string | null;
  viewOnce: boolean;
  media: BoardMedia | null;
  prompt: string | null;
  gift: string | null;
  isPinned: boolean;
  replyToId: string | null;
  locked: boolean;
  lockReason: "scheduled" | "viewed" | null;
  currentUserId: string;
  seenCount: number;
  silent: boolean;
  editedAt: string | null;
  createdAt: string;
  sender: { id: string; name: string | null; image: string | null };
  reactions: Reaction[];
  replyTo: {
    id: string;
    kind: string;
    caption: string | null;
    sender: { name: string | null };
  } | null;
};

type Vibe = {
  emoji?: string;
  nickname?: string;
  mood?: string;
  song?: string;
  accent?: string;
  relationshipLabel?: string;
  specialDate?: string;
  coverUrl?: string;
};

type Experience = {
  vibe: Vibe;
  streak: number;
  moments: number;
  pinned: number;
};

type ViewMode = "chat" | "single" | "grid" | "memories";
const REACTIONS = ["❤️", "🥹", "😂", "💋", "✨", "🫶"];

export function BoardScreen({
  circleId,
  circleName,
}: {
  circleId: string;
  circleName: string;
}) {
  const [boards, setBoards] = useState<BoardItem[] | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [showVibe, setShowVibe] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const [boardRes, experienceRes] = await Promise.all([
      fetch(`/api/boards/${circleId}`),
      fetch(`/api/circles/${circleId}/experience?tz=${encodeURIComponent(timeZone)}`),
    ]);
    const [boardData, experienceData] = await Promise.all([
      boardRes.json(),
      experienceRes.json(),
    ]);
    setBoards(boardData.boards ?? []);
    setExperience(experienceData);

    if (boardData.boards?.length > 0) {
      fetch(`/api/circles/${circleId}/read`, {
        method: "POST",
      }).catch(() => {});
    }
  }, [circleId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      load();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  useEffect(() => {
    if (viewMode !== "chat") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 4_000);
    return () => window.clearInterval(timer);
  }, [load, viewMode]);

  const visibleBoards = useMemo(() => {
    const moments = boards?.filter((board) => board.kind !== "text");
    const source = viewMode === "memories" ? moments?.filter((board) => board.isPinned) : moments;
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return source;
    return source?.filter((board) => {
      const date = new Date(board.createdAt).toLocaleDateString();
      return [board.sender.name, board.caption, board.prompt, board.kind, date]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(query));
    });
  }, [boards, searchQuery, viewMode]);
  const latest = visibleBoards?.[0];
  const displayName = experience?.vibe.nickname || circleName;
  const accent = experience?.vibe.accent || "#e89b95";

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/90 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        {experience?.vibe.coverUrl && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden opacity-[0.08]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={experience.vibe.coverUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink-soft active:scale-90" aria-label="Back">
              <ChevronLeft size={20} />
            </Link>
            <div className="min-w-0">
              <p className="truncate font-hand text-2xl leading-none text-ink">
                {experience?.vibe.emoji || "🫶"} {displayName}
              </p>
              <p className="mt-1 truncate text-[11px] text-ink-soft/60">
                {experience?.vibe.relationshipLabel || experience?.vibe.mood || "a quiet little space for your people"}
              </p>
            </div>
          </div>
          <button onClick={() => setShowVibe(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5" aria-label="Customize this space">
            <Settings2 size={17} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat icon={<Flame size={14} />} value={`${experience?.streak ?? "—"} days`} label="chalk streak" color="text-orange-500" />
          <Stat icon={<Heart size={14} />} value={`${experience?.moments ?? 0}`} label="shared moments" color="text-dust-pink" />
          <Stat icon={<Pin size={14} />} value={`${experience?.pinned ?? 0}`} label="kept forever" color="text-chalk-sky" />
        </div>

        {experience?.vibe.song && (
          <div className="mt-2 flex items-center gap-2 rounded-full bg-ink/[0.04] px-3 py-1.5 text-[11px] text-ink-soft">
            <Music2 size={12} style={{ color: accent }} />
            <span className="truncate">our song · {experience.vibe.song}</span>
          </div>
        )}
        {experience?.vibe.specialDate && (
          <div className="mt-2 flex items-center gap-2 rounded-full bg-ink/[0.04] px-3 py-1.5 text-[11px] text-ink-soft">
            <CalendarDays size={12} style={{ color: accent }} />
            <span>{specialDateLabel(experience.vibe.specialDate)}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-center gap-0.5 overflow-x-auto">
          <ViewButton active={viewMode === "chat"} label="Chat" icon={<MessageCircleHeart size={15} />} onClick={() => setViewMode("chat")} />
          <ViewButton active={viewMode === "single"} label="Latest" icon={<Square size={15} />} onClick={() => setViewMode("single")} />
          <ViewButton active={viewMode === "grid"} label="All" icon={<LayoutGrid size={15} />} onClick={() => setViewMode("grid")} />
          <ViewButton active={viewMode === "memories"} label="Memories" icon={<MemoryStick size={15} />} onClick={() => setViewMode("memories")} />
        </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-32 pt-4">
        {viewMode !== "single" && viewMode !== "chat" && (
          <label className="mb-4 flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 text-ink-soft shadow-sm">
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search person, caption, prompt, or date"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft/45"
            />
          </label>
        )}
        {boards === null && <div className="aspect-square animate-pulse rounded-3xl bg-ink/5" />}

        {viewMode === "chat" && boards && (
          <ChatTimeline
            circleId={circleId}
            boards={boards as ChatBoard[]}
            onChanged={load}
            onOpenMoments={() => setViewMode("single")}
          />
        )}

        {viewMode !== "chat" && visibleBoards?.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <p className="text-4xl">{viewMode === "memories" ? "📌" : "✍️"}</p>
            <p className="font-hand text-3xl text-ink">
              {viewMode === "memories" ? "Your memory wall is waiting" : "Nothing here yet"}
            </p>
            <p className="max-w-[280px] text-sm text-ink-soft/70">
              {viewMode === "memories"
                ? "Pin the notes you never want to lose."
                : `Draw the first chalk message for ${displayName}.`}
            </p>
          </div>
        )}

        {viewMode === "single" && latest && (
          <BoardMoment board={latest} circleId={circleId} featured onChanged={load} />
        )}

        {(viewMode === "grid" || viewMode === "memories") && visibleBoards && (
          <div className="grid gap-5 sm:grid-cols-2">
            {visibleBoards.map((board) => (
              <BoardMoment key={board.id} board={board} circleId={circleId} onChanged={load} />
            ))}
          </div>
        )}
      </main>

      {viewMode !== "chat" && (
        <Link href={`/board/${circleId}/draw`} className="fixed bottom-6 right-5 z-20 flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-paper shadow-xl active:scale-95">
          <Pencil size={18} />
          <span className="text-sm font-medium">Leave a chalk</span>
        </Link>
      )}

      {showVibe && (
        <VibeEditor circleId={circleId} initial={experience?.vibe ?? {}} onClose={() => setShowVibe(false)} onSaved={load} />
      )}
    </div>
  );
}

function BoardMoment({
  board,
  circleId,
  featured = false,
  onChanged,
}: {
  board: BoardItem;
  circleId: string;
  featured?: boolean;
  onChanged: () => void;
}) {
  const shouldConceal =
    !board.locked && (board.deliveryMode === "secret" || board.viewOnce);
  const [revealed, setRevealed] = useState(!shouldConceal);
  const [rub, setRub] = useState(0);
  const mine = board.sender.id === board.currentUserId;

  async function open() {
    if (board.locked) return;
    await fetch(`/api/boards/${circleId}/${board.id}/open`, { method: "POST" });
    setRevealed(true);
  }

  function rubReveal() {
    if (revealed || board.locked) return;
    setRub((value) => {
      const next = Math.min(100, value + 12);
      if (next >= 65) open();
      return next;
    });
  }

  async function react(emoji: string) {
    await fetch(`/api/boards/${circleId}/${board.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    onChanged();
  }

  async function pin() {
    await fetch(`/api/boards/${circleId}/${board.id}/pin`, { method: "POST" });
    onChanged();
  }

  const grouped = REACTIONS.map((emoji) => ({
    emoji,
    reactions: board.reactions.filter((reaction) => reaction.emoji === emoji),
  })).filter((group) => group.reactions.length);

  return (
    <article
      className={clsx(
        "space-y-3",
        featured ? "mx-auto max-w-xl" : "[contain-intrinsic-size:420px] [content-visibility:auto]"
      )}
    >
      {board.prompt && (
        <div className="flex items-start gap-2 rounded-2xl bg-chalk-amber/10 px-4 py-3 text-sm text-ink-soft">
          <Sparkles size={15} className="mt-0.5 shrink-0 text-chalk-amber" />
          <span>“{board.prompt}”</span>
        </div>
      )}

      <div
        className="group relative aspect-square overflow-hidden rounded-3xl shadow-sm ring-1 ring-ink/5"
        style={{ backgroundColor: BOARD_COLORS[board.boardColor] || BOARD_COLORS["chalkboard-green"] }}
      >
        {board.locked ? (
          <LockedMoment board={board} />
        ) : (
          <>
            {board.media && revealed && (
              <MomentMedia
                circleId={circleId}
                boardId={board.id}
                metadata={board.media}
              />
            )}
            {board.gift && (
              <div className="absolute inset-0 flex items-center justify-center text-[8rem] drop-shadow-2xl">{board.gift}</div>
            )}
            <BoardPlayback drawing={board.drawing} boardColorHex={BOARD_COLORS[board.boardColor]} animate={featured && revealed} className="relative h-full w-full" />
            {!revealed && (
              <button
                type="button"
                onPointerDown={rubReveal}
                onPointerMove={(event) => event.buttons === 1 && rubReveal()}
                onClick={rubReveal}
                className="absolute inset-0 flex touch-none flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_30%_20%,#40534a,#17231d)] text-chalk-white"
                style={{ opacity: Math.max(0.12, 1 - rub / 100) }}
              >
                <LockKeyhole size={32} />
                <p className="font-hand text-3xl">{board.viewOnce ? "one look only" : "a secret chalk"}</p>
                <p className="text-xs text-chalk-white/60">rub across the board to reveal</p>
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-chalk-amber transition-all" style={{ width: `${rub}%` }} />
                </div>
              </button>
            )}
          </>
        )}

        {!board.locked && revealed && (
          <button onClick={pin} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur" aria-label={board.isPinned ? "Remove from memories" : "Save to memories"}>
            <Pin size={16} fill={board.isPinned ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-1">
        <p className="min-w-0 truncate text-xs text-ink-soft/60">
          {mine ? "you" : board.sender.name || "someone"} · {new Date(board.createdAt).toLocaleString()}
          {board.expiresAt && ` · fades ${new Date(board.expiresAt).toLocaleString()}`}
          {mine && board.seenCount > 0 && ` · seen by ${board.seenCount}`}
        </p>
        {!board.locked && (
          <Link href={`/board/${circleId}/draw?replyTo=${board.id}`} className="flex shrink-0 items-center gap-1 text-xs text-ink-soft">
            <Reply size={14} /> pass doodle
          </Link>
        )}
      </div>

      {!board.locked && revealed && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-ink/[0.035] p-2">
          {REACTIONS.map((emoji) => {
            const active = board.reactions.some((reaction) => reaction.emoji === emoji && reaction.userId === board.currentUserId);
            return (
              <button key={emoji} onClick={() => react(emoji)} className={clsx("flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-base transition hover:-translate-y-0.5", active ? "bg-dust-pink/20 ring-1 ring-dust-pink/40" : "hover:bg-white")}>
                {emoji}
              </button>
            );
          })}
          {grouped.length > 0 && (
            <span className="ml-auto text-[11px] text-ink-soft/50">
              {grouped.map((group) => `${group.emoji}${group.reactions.length}`).join("  ")}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function MomentMedia({
  circleId,
  boardId,
  metadata,
}: {
  circleId: string;
  boardId: string;
  metadata: BoardMedia;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [media, setMedia] = useState<BoardMedia | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        fetch(`/api/boards/${circleId}/${boardId}/media`)
          .then(async (response) => {
            if (!response.ok) throw new Error("Media unavailable");
            return response.json();
          })
          .then((data) => {
            if (!cancelled) setMedia(data.media);
          })
          .catch(() => {
            if (!cancelled) setFailed(true);
          });
      },
      { rootMargin: "240px" }
    );
    observer.observe(host);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [boardId, circleId]);

  if (metadata.type === "photo") {
    return (
      <div ref={hostRef} className="absolute inset-0 bg-white/5">
        {!media?.dataUrl && !failed && <div className="h-full w-full animate-pulse bg-white/5" />}
        {media?.dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.dataUrl}
            alt="Shared memory"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover opacity-80 transition-opacity duration-300"
          />
        )}
      </div>
    );
  }

  return (
    <div ref={hostRef} className="absolute bottom-5 left-5 right-5 z-10 flex min-h-14 items-center gap-3 rounded-2xl bg-black/45 p-3 text-white backdrop-blur">
      <Mic size={18} className="shrink-0" />
      {media?.dataUrl ? (
        <audio preload="metadata" controls src={media.dataUrl} className="h-9 min-w-0 flex-1" />
      ) : (
        <p className="text-xs text-white/65">
          {failed ? "Voice scribble unavailable" : "Loading voice scribble…"}
        </p>
      )}
    </div>
  );
}

function LockedMoment({ board }: { board: BoardItem }) {
  const viewed = board.lockReason === "viewed";
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 text-center text-chalk-white">
      {viewed ? <MessageCircleHeart size={34} /> : <Clock3 size={34} />}
      <p className="font-hand text-3xl">{viewed ? "this moment has faded" : "not yet, cutie"}</p>
      <p className="max-w-[230px] text-xs leading-5 text-chalk-white/55">
        {viewed
          ? "It was sent for one look only."
          : `This capsule opens ${board.unlockAt ? new Date(board.unlockAt).toLocaleString() : "later"}.`}
      </p>
    </div>
  );
}

function Stat({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="rounded-2xl bg-ink/[0.035] px-3 py-2">
      <p className={clsx("flex items-center gap-1 text-xs font-semibold", color)}>{icon}{value}</p>
      <p className="mt-0.5 truncate text-[10px] text-ink-soft/45">{label}</p>
    </div>
  );
}

function ViewButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={clsx("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs", active ? "bg-ink text-paper" : "text-ink-soft/55")}>
      {icon}{label}
    </button>
  );
}

function VibeEditor({
  circleId,
  initial,
  onClose,
  onSaved,
}: {
  circleId: string;
  initial: Vibe;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [vibe, setVibe] = useState<Vibe>({
    emoji: initial.emoji || "🫶",
    nickname: initial.nickname || "",
    mood: initial.mood || "",
    song: initial.song || "",
    accent: initial.accent || "#e89b95",
    relationshipLabel: initial.relationshipLabel || "",
    specialDate: initial.specialDate || "",
    coverUrl: initial.coverUrl || "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/circles/${circleId}/experience`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vibe),
    });
    await onSaved();
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl bg-paper p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-hand text-3xl">Make it yours</p>
            <p className="text-xs text-ink-soft/55">inside jokes strongly encouraged</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-ink/5 p-2"><X size={17} /></button>
        </div>
        <label className="grid grid-cols-[52px_1fr] gap-2">
          <input value={vibe.emoji} onChange={(event) => setVibe({ ...vibe, emoji: event.target.value })} className="rounded-2xl border border-line bg-card p-3 text-center text-xl outline-none" aria-label="Space emoji" />
          <input value={vibe.nickname} onChange={(event) => setVibe({ ...vibe, nickname: event.target.value })} placeholder="Their nickname here" className="rounded-2xl border border-line bg-card p-3 text-sm outline-none" />
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3">
          <Heart size={15} className="text-dust-pink" />
          <input value={vibe.mood} onChange={(event) => setVibe({ ...vibe, mood: event.target.value })} placeholder="today's shared mood" className="w-full bg-transparent py-3 text-sm outline-none" />
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3">
          <Heart size={15} className="text-dust-pink" />
          <input value={vibe.relationshipLabel} onChange={(event) => setVibe({ ...vibe, relationshipLabel: event.target.value })} placeholder="besties · partners · our tiny world" className="w-full bg-transparent py-3 text-sm outline-none" />
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3">
          <CalendarDays size={15} className="text-chalk-amber" />
          <input type="date" value={vibe.specialDate} onChange={(event) => setVibe({ ...vibe, specialDate: event.target.value })} className="w-full bg-transparent py-3 text-sm outline-none" />
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3">
          <ImageIcon size={15} className="text-chalk-mint" />
          <input value={vibe.coverUrl} onChange={(event) => setVibe({ ...vibe, coverUrl: event.target.value })} placeholder="Shared cover photo URL" className="w-full bg-transparent py-3 text-sm outline-none" />
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3">
          <Music2 size={15} className="text-chalk-sky" />
          <input value={vibe.song} onChange={(event) => setVibe({ ...vibe, song: event.target.value })} placeholder="your song · artist" className="w-full bg-transparent py-3 text-sm outline-none" />
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-line bg-card px-3 py-2 text-sm">
          <Palette size={15} />
          Accent color
          <input type="color" value={vibe.accent} onChange={(event) => setVibe({ ...vibe, accent: event.target.value })} className="ml-auto h-8 w-12 bg-transparent" />
        </label>
        <button onClick={save} disabled={saving} className="w-full rounded-full bg-ink py-3 text-sm font-semibold text-paper disabled:opacity-50">
          {saving ? "Saving your space…" : "Save our space"}
        </button>
        <CircleManagement circleId={circleId} />
      </div>
    </div>
  );
}

function specialDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Our special date";
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} until our date`;
  const years = Math.max(0, new Date().getFullYear() - date.getFullYear());
  return years > 0 ? `${years} year${years === 1 ? "" : "s"} of us` : "Our special date";
}

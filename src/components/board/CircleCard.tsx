"use client";

import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";

export type CircleSummary = {
  id: string;
  name: string;
  isDirect: boolean;
  memberCount: number;
  unreadCount: number;
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

export function CircleCard({ circle }: { circle: CircleSummary }) {
  const avatarMembers = circle.members.slice(0, 3);

  return (
    <Link
      href={`/board/${circle.id}`}
      className="group flex items-center gap-3 rounded-lg border border-line bg-card/82 px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:bg-card"
    >
      <div className="relative flex items-center justify-center h-12 w-12 shrink-0">
        {circle.isDirect ? (
          avatarMembers[0]?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarMembers[0].image}
              alt={circle.name}
            className="h-12 w-12 rounded-lg object-cover ring-2 ring-paper"
            />
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

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-ink truncate">{circle.name}</p>
          {circle.unreadCount > 0 ? (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-dust-pink px-1.5 text-[11px] font-bold text-white">
              {circle.unreadCount > 99 ? "99+" : circle.unreadCount}
            </span>
          ) : circle.latestBoard && (
            <span className="text-xs text-ink-soft/60 shrink-0">
              {timeAgo(circle.latestBoard.createdAt)}
            </span>
          )}
        </div>
        <p className="text-sm text-ink-soft/70 truncate">
          {circle.latestBoard
            ? `${circle.latestBoard.senderName} left a chalk message`
            : circle.isDirect
              ? "Say hi — draw the first message"
              : `${circle.memberCount} people in this circle`}
        </p>
      </div>
      <ChevronRight size={17} className="shrink-0 text-ink-soft/35 transition group-hover:text-ink-soft" />
    </Link>
  );
}

"use client";

import Link from "next/link";
import { Users } from "lucide-react";

export type CircleSummary = {
  id: string;
  name: string;
  isDirect: boolean;
  memberCount: number;
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
      className="flex items-center gap-3 rounded-2xl bg-white/60 hover:bg-white/90 transition-colors px-4 py-3 ring-1 ring-ink/5"
    >
      <div className="relative flex items-center justify-center h-12 w-12 shrink-0">
        {circle.isDirect ? (
          avatarMembers[0]?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarMembers[0].image}
              alt={circle.name}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-paper"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-dust-pink/40 flex items-center justify-center font-hand text-xl text-ink">
              {circle.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )
        ) : (
          <div className="h-12 w-12 rounded-full bg-chalk-amber/30 flex items-center justify-center">
            <Users size={20} className="text-ink-soft" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-ink truncate">{circle.name}</p>
          {circle.latestBoard && (
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
    </Link>
  );
}

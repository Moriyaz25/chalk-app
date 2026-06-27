"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BellOff, BellRing, Copy, Crown, Flag, Link2, LogOut,
  ShieldOff, Trash2, UserMinus,
} from "lucide-react";

type Member = {
  id: string;
  name: string | null;
  username?: string | null;
  image: string | null;
  bio?: string | null;
  chalkColor?: string;
  role: "OWNER" | "MEMBER";
  blocked: boolean;
};

type CircleSettings = {
  name: string | null;
  isDirect: boolean;
  muted: boolean;
  currentRole: "OWNER" | "MEMBER";
  currentUserId: string;
  members: Member[];
  invites: { id: string; code: string; uses: number; maxUses: number }[];
};

export function CircleManagement({ circleId }: { circleId: string }) {
  const [circle, setCircle] = useState<CircleSettings | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/circles/${circleId}/settings`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setCircle(data.circle);
  }, [circleId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { load(); });
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  async function action(body: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/circles/${circleId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "That did not work. Please try again.");
      return false;
    }
    await load();
    return true;
  }

  async function createInvite() {
    setBusy(true);
    const response = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "group", circleId, maxUses: 10 }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(data.error || "Could not create invite.");
    await load();
    await navigator.clipboard.writeText(`${window.location.origin}${data.url}`).catch(() => {});
    setMessage("Invite link copied. It can be used up to 10 times.");
  }

  async function leave() {
    if (!window.confirm(circle?.isDirect ? "Leave this conversation?" : "Leave this circle?")) return;
    const response = await fetch(`/api/circles/${circleId}/settings`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(data.error || "Could not leave.");
    window.location.assign("/");
  }

  async function report(userId: string) {
    const details = window.prompt("Briefly tell us what happened. Cancel to go back.");
    if (details === null) return;
    const ok = await action({
      action: "report",
      userId,
      reason: "Circle member report",
      details,
    });
    if (ok) setMessage("Report received. Thank you for helping keep Chalk safe.");
  }

  if (!circle) return <div className="h-32 animate-pulse rounded-2xl bg-ink/5" />;
  const owner = circle.currentRole === "OWNER";

  return (
    <div className="space-y-4 border-t border-line pt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Circle controls</p>
          <p className="text-xs text-ink-soft/55">{circle.members.length} members</p>
        </div>
        <button
          disabled={busy}
          onClick={() => action({ action: "mute", muted: !circle.muted })}
          className="flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-2 text-xs text-ink-soft disabled:opacity-50"
        >
          {circle.muted ? <BellRing size={14} /> : <BellOff size={14} />}
          {circle.muted ? "Unmute" : "Mute"}
        </button>
      </div>

      {owner && !circle.isDirect && (
        <div className="flex gap-2">
          <input defaultValue={circle.name || ""} id="circle-name" maxLength={50} className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none" />
          <button
            disabled={busy}
            onClick={() => action({ action: "rename", name: (document.getElementById("circle-name") as HTMLInputElement).value })}
            className="rounded-xl bg-ink px-3 text-xs font-semibold text-paper disabled:opacity-50"
          >
            Rename
          </button>
        </div>
      )}

      <div className="space-y-2">
        {circle.members.map((member) => (
          <details key={member.id} className="rounded-2xl bg-ink/[0.035] p-3">
            <summary className="flex cursor-pointer list-none items-center gap-3">
              {member.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.image} alt="" className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl font-hand text-lg text-slate-900" style={{ backgroundColor: member.chalkColor || "#F2E9D8" }}>
                  {member.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{member.name || "Chalk member"}</p>
                <p className="truncate text-xs text-ink-soft/55">{member.username ? `@${member.username}` : "Private profile"}</p>
              </div>
              {member.role === "OWNER" && <Crown size={15} className="text-chalk-amber" />}
            </summary>
            <div className="mt-3 space-y-3 border-t border-line/60 pt-3">
              {member.bio && <p className="text-xs leading-5 text-ink-soft">{member.bio}</p>}
              {member.id !== circle.currentUserId && (
                <div className="flex flex-wrap gap-2">
                  <MiniButton onClick={() => action({ action: member.blocked ? "unblock" : "block", userId: member.id })} icon={<ShieldOff size={13} />} label={member.blocked ? "Unblock" : "Block"} />
                  <MiniButton onClick={() => report(member.id)} icon={<Flag size={13} />} label="Report" />
                  {owner && !circle.isDirect && (
                    <>
                      <MiniButton onClick={() => window.confirm(`Make ${member.name || "this member"} the owner?`) && action({ action: "transfer", userId: member.id })} icon={<Crown size={13} />} label="Make owner" />
                      <MiniButton onClick={() => window.confirm(`Remove ${member.name || "this member"} from the circle?`) && action({ action: "remove", userId: member.id })} icon={<UserMinus size={13} />} label="Remove" danger />
                    </>
                  )}
                </div>
              )}
            </div>
          </details>
        ))}
      </div>

      {owner && !circle.isDirect && (
        <div className="rounded-2xl border border-line p-3">
          <button disabled={busy} onClick={createInvite} className="flex w-full items-center justify-center gap-2 rounded-full bg-chalk-amber/20 px-3 py-2.5 text-xs font-semibold text-ink disabled:opacity-50">
            <Link2 size={14} /> Create 10-use invite
          </button>
          {circle.invites.length > 0 && (
            <div className="mt-3 space-y-2">
              {circle.invites.map((invite) => (
                <div key={invite.id} className="flex items-center gap-2 text-xs text-ink-soft">
                  <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${invite.code}`)} className="flex items-center gap-1 font-mono font-semibold text-ink">
                    <Copy size={12} /> {invite.code}
                  </button>
                  <span className="flex-1">{invite.uses}/{invite.maxUses || "∞"} used</span>
                  <button onClick={() => action({ action: "revokeInvite", inviteId: invite.id })} aria-label="Revoke invite">
                    <Trash2 size={14} className="text-dust-pink" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {message && <p className="rounded-xl bg-ink/5 px-3 py-2 text-xs text-ink-soft">{message}</p>}
      <button onClick={leave} className="flex w-full items-center justify-center gap-2 rounded-full border border-dust-pink/30 py-2.5 text-xs font-semibold text-dust-pink">
        <LogOut size={14} /> Leave {circle.isDirect ? "conversation" : "circle"}
      </button>
    </div>
  );
}

function MiniButton({ icon, label, onClick, danger = false }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] ${danger ? "bg-dust-pink/10 text-dust-pink" : "bg-card text-ink-soft"}`}>
      {icon}{label}
    </button>
  );
}

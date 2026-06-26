"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Copy, Check, Users, UserPlus } from "lucide-react";
import clsx from "clsx";

type Tab = "create" | "join";
type CreateMode = "direct" | "group";

export default function NewConnectionPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("create");
  const [createMode, setCreateMode] = useState<CreateMode>("direct");
  const [groupName, setGroupName] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateInvite() {
    setError(null);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        createMode === "direct"
          ? { mode: "direct" }
          : { mode: "group", name: groupName || "New circle" }
      ),
    });

    if (!res.ok) {
      setError("Couldn't create invite. Try again.");
      return;
    }

    const data = await res.json();
    setGeneratedCode(data.code);
  }

  async function handleCopy() {
    if (!generatedCode) return;
    const link = `${window.location.origin}/join/${generatedCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${joinCode.trim().toUpperCase()}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't join with that code.");
        return;
      }
      router.push(`/board/${data.circleId}`);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center h-9 w-9 rounded-full bg-ink/5 text-ink-soft active:scale-90"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-hand text-3xl text-ink">Connect</h1>
      </div>

      <div className="flex rounded-full bg-ink/5 p-1 mb-6">
        <TabButton active={tab === "create"} onClick={() => setTab("create")}>
          Create
        </TabButton>
        <TabButton active={tab === "join"} onClick={() => setTab("join")}>
          Join with code
        </TabButton>
      </div>

      {tab === "create" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <ModeCard
              active={createMode === "direct"}
              icon={<UserPlus size={20} />}
              title="Just us two"
              subtitle="A private connection"
              onClick={() => {
                setCreateMode("direct");
                setGeneratedCode(null);
              }}
            />
            <ModeCard
              active={createMode === "group"}
              icon={<Users size={20} />}
              title="A circle"
              subtitle="Friends or family"
              onClick={() => {
                setCreateMode("group");
                setGeneratedCode(null);
              }}
            />
          </div>

          {createMode === "group" && !generatedCode && (
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Circle name (e.g. The Squad)"
              className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-chalk-amber/50"
            />
          )}

          {!generatedCode ? (
            <button
              onClick={handleCreateInvite}
              className="w-full rounded-full bg-ink text-paper py-3 text-sm font-medium active:scale-95"
            >
              Generate invite code
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-950 board-texture p-6 text-center">
                <p className="text-xs text-chalk-white/50 font-sans mb-2">Your invite code</p>
                <p className="font-hand text-4xl text-chalk-white tracking-wide">
                  {generatedCode}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 rounded-full border border-ink/15 py-3 text-sm font-medium text-ink active:scale-95"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Link copied" : "Copy invite link"}
              </button>
              <p className="text-xs text-ink-soft/60 text-center">
                {createMode === "direct"
                  ? "This code works once — share it with one person."
                  : "Share this code with everyone you want in the circle."}
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "join" && (
        <div className="space-y-4">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter code (e.g. K3F9QZ)"
            maxLength={6}
            className="w-full rounded-xl border border-ink/10 px-4 py-3 text-center text-lg font-hand bg-white focus:outline-none focus:ring-2 focus:ring-chalk-amber/50 tracking-widest"
          />
          <button
            onClick={handleJoin}
            disabled={joining || joinCode.length < 4}
            className="w-full rounded-full bg-ink text-paper py-3 text-sm font-medium disabled:opacity-40 active:scale-95"
          >
            {joining ? "Joining…" : "Join"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-dust-pink mt-4 text-center">{error}</p>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex-1 rounded-full py-2 text-sm font-medium transition-colors",
        active ? "bg-white text-ink shadow-sm" : "text-ink-soft/60"
      )}
    >
      {children}
    </button>
  );
}

function ModeCard({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition-all border",
        active
          ? "border-chalk-amber bg-chalk-amber/10"
          : "border-ink/10 bg-white"
      )}
    >
      <div
        className={clsx(
          "h-9 w-9 rounded-full flex items-center justify-center",
          active ? "bg-chalk-amber/30 text-cork-dark" : "bg-ink/5 text-ink-soft"
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-xs text-ink-soft/60">{subtitle}</p>
      </div>
    </button>
  );
}

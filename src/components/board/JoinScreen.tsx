"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type JoinScreenProps = {
  status: "ready" | "expired" | "used-up" | "not-found" | "own-invite";
  code?: string;
  inviterName?: string | null;
  isGroup?: boolean;
  groupName?: string | null;
};

export function JoinScreen({
  status,
  code,
  inviterName,
  isGroup,
  groupName,
}: JoinScreenProps) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (!code) return;
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${code}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push(`/board/${data.circleId}`);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center board-texture">
      <div className="max-w-sm space-y-5">
        {status === "ready" && (
          <>
            <p className="font-hand text-4xl text-chalk-white">
              {isGroup
                ? `Join ${groupName ?? "this circle"}?`
                : `${inviterName ?? "Someone"} wants to connect`}
            </p>
            <p className="text-sm text-chalk-white/60 font-sans">
              {isGroup
                ? `${inviterName ?? "Someone"} invited you to a circle on Chalk.`
                : "You'll be able to send each other handwritten chalk messages."}
            </p>
            <button
              onClick={handleAccept}
              disabled={joining}
              className="w-full rounded-full bg-chalk-amber text-ink py-3 text-sm font-medium disabled:opacity-50 active:scale-95"
            >
              {joining ? "Joining…" : "Accept & connect"}
            </button>
            {error && <p className="text-sm text-dust-pink">{error}</p>}
          </>
        )}

        {status === "expired" && (
          <Message title="This invite expired" body="Ask for a fresh invite link or code." />
        )}
        {status === "used-up" && (
          <Message
            title="Already used"
            body="This invite code has already been claimed."
          />
        )}
        {status === "not-found" && (
          <Message title="Invite not found" body="Double check the code and try again." />
        )}
        {status === "own-invite" && (
          <Message
            title="That's your own invite"
            body="Share this code with someone else to connect with them."
          />
        )}
      </div>
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <>
      <p className="font-hand text-4xl text-chalk-white">{title}</p>
      <p className="text-sm text-chalk-white/60 font-sans">{body}</p>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Bell, LogOut, Trash2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { logoutAction } from "@/lib/actions";

export default function SettingsPage() {
  const router = useRouter();
  const { status, subscribe, unsubscribe } = usePushNotifications();
  const [busy, setBusy] = useState(false);

  async function handlePushToggle() {
    setBusy(true);
    try {
      if (status === "subscribed") {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } finally {
      setBusy(false);
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
        <h1 className="font-hand text-3xl text-ink">Settings</h1>
      </div>

      <div className="space-y-3">
        <Row
          icon={<Bell size={18} />}
          title="Push notifications"
          subtitle={
            status === "subscribed"
              ? "You'll be notified of new messages"
              : status === "denied"
                ? "Blocked in browser settings"
                : "Get notified when someone draws for you"
          }
          action={
            <button
              onClick={handlePushToggle}
              disabled={busy || status === "denied" || status === "unsupported"}
              className={`h-6 w-11 rounded-full transition-colors relative disabled:opacity-40 ${
                status === "subscribed" ? "bg-chalk-amber" : "bg-ink/15"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  status === "subscribed" ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          }
        />
      </div>

      <div className="mt-8 space-y-1">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full rounded-xl px-3 py-3 text-sm text-ink-soft hover:bg-ink/5"
          >
            <LogOut size={18} />
            Log out
          </button>
        </form>
        <button className="flex items-center gap-3 w-full rounded-xl px-3 py-3 text-sm text-dust-pink hover:bg-dust-pink/10">
          <Trash2 size={18} />
          Delete account
        </button>
      </div>
    </div>
  );
}

function Row({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 ring-1 ring-ink/5">
      <div className="h-9 w-9 rounded-full bg-chalk-amber/15 text-cork-dark flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-xs text-ink-soft/60 truncate">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

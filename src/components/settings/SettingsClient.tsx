"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Accessibility,
  AtSign,
  Bell,
  Camera,
  ChevronLeft,
  Check,
  Clock3,
  Download,
  Eye,
  ImagePlus,
  LogOut,
  Palette,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { ThemeModeSelect } from "@/components/ui/ThemeToggle";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  deleteAccountAction,
  logoutAction,
  signOutEverywhereAction,
  updatePreferencesAction,
  updateProfileAction,
  unblockUserAction,
} from "@/lib/actions";
import { parsePreferences, type UserPreferences } from "@/lib/preferences";
import { DeviceLockSettings } from "@/components/settings/DeviceLockSettings";

type SettingsUser = {
  name: string | null;
  username: string | null;
  bio: string | null;
  chalkColor: string;
  preferences: unknown;
  image: string | null;
  email: string | null;
  createdAt: string;
  blocksCreated: {
    blocked: { id: string; name: string | null; username: string | null; image: string | null };
  }[];
  _count: { sessions: number };
};

export function SettingsClient({ user }: { user: SettingsUser }) {
  const router = useRouter();
  const { status, error: pushError, subscribe, unsubscribe } = usePushNotifications();
  const [busy, setBusy] = useState(false);
  const [profileImage, setProfileImage] = useState(user.image ?? "");
  const [state, formAction, pending] = useActionState(updateProfileAction, {
    ok: false,
    message: "",
  });
  const [imageMessage, setImageMessage] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const preferences = useMemo(() => parsePreferences(user.preferences), [user.preferences]);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(preferences.reducedMotion);
    localStorage.setItem("chalk-reduced-motion", String(preferences.reducedMotion));
  }, [preferences.reducedMotion]);

  const initials = useMemo(() => {
    const label = user.username || user.name || user.email || "Chalk";
    return label
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user.email, user.name, user.username]);

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

  async function sendTestNotification() {
    setTestMessage("Sending test…");
    const response = await fetch("/api/push/test", { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setTestMessage(response.ok ? "Test notification sent." : body.error || "Test failed.");
  }

  async function handleLogout() {
    try {
      const registration = await navigator.serviceWorker?.ready;
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
    } finally {
      await logoutAction();
    }
  }

  async function handleImageFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageMessage("Choose an image file.");
      return;
    }

    try {
      const compressed = await resizeProfileImage(file);
      setProfileImage(compressed);
      setImageMessage("Photo optimized for your profile.");
    } catch {
      setImageMessage("Could not process that image. Try another one.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-md overflow-x-clip px-3 pb-8 pt-[max(1rem,env(safe-area-inset-top))] min-[380px]:px-4">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-ink-soft shadow-sm active:scale-95"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase text-ink-soft/70">
              Studio
            </p>
            <h1 className="font-hand text-4xl leading-none text-ink">Settings</h1>
          </div>
        </div>
      </div>

      <section className="glass-panel theme-shadow overflow-hidden rounded-lg">
        <div className="board-texture px-4 py-5 min-[380px]:px-5 min-[380px]:py-6">
          <div className="flex min-w-0 items-center gap-3 min-[380px]:gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-chalk-amber/20 ring-2 ring-chalk-white/20 min-[380px]:h-20 min-[380px]:w-20">
              {profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-hand text-3xl text-chalk-white">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-hand text-2xl leading-none text-chalk-white min-[380px]:text-3xl">
                {user.username || user.name || "Your profile"}
              </p>
              <p className="mt-1 truncate text-sm text-chalk-white/55">{user.email}</p>
              <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-chalk-white/10 px-2.5 py-1 text-[11px] text-chalk-white/80 min-[380px]:mt-3 min-[380px]:px-3 min-[380px]:text-xs">
                <Sparkles size={13} />
                <span className="truncate">Personal chalk identity</span>
              </div>
            </div>
          </div>
        </div>

        <form action={formAction} className="space-y-4 p-4 min-[380px]:p-5">
          <input type="hidden" name="image" value={profileImage} />
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <User size={16} />
              Display name
            </span>
            <input
              name="name"
              defaultValue={user.name || ""}
              maxLength={40}
              required
              placeholder="The name your people will see"
              className="w-full rounded-lg border border-line bg-card-muted px-4 py-3 text-sm text-ink outline-none transition focus:border-chalk-amber focus:ring-4 focus:ring-chalk-amber/15"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <AtSign size={16} />
              Handle
            </span>
            <input
              name="username"
              defaultValue={user.username || ""}
              minLength={3}
              maxLength={20}
              pattern="[a-z0-9_.-]+"
              required
              autoCapitalize="none"
              placeholder="your.handle"
              className="w-full rounded-lg border border-line bg-card-muted px-4 py-3 text-sm text-ink outline-none transition focus:border-chalk-amber focus:ring-4 focus:ring-chalk-amber/15"
            />
            <span className="mt-1.5 block text-xs text-ink-soft/60">
              Unique, lowercase, and easy to share.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 text-sm font-semibold text-ink">Short bio</span>
            <textarea
              name="bio"
              defaultValue={user.bio || ""}
              maxLength={160}
              rows={3}
              placeholder="A tiny note about you"
              className="w-full resize-none rounded-lg border border-line bg-card-muted px-4 py-3 text-sm text-ink outline-none transition focus:border-chalk-sky focus:ring-4 focus:ring-chalk-sky/15"
            />
          </label>

          <div>
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <Palette size={16} />
              Signature chalk
            </span>
            <div className="flex items-center gap-3 rounded-lg border border-line bg-card-muted p-3">
              <input
                type="color"
                name="chalkColor"
                defaultValue={user.chalkColor}
                className="h-9 w-12 cursor-pointer rounded bg-transparent"
                aria-label="Signature chalk color"
              />
              <p className="text-xs text-ink-soft/70">
                Used as your default color when you start drawing.
              </p>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 min-[380px]:gap-3">
            <label className="min-w-0">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                <Camera size={16} />
                Profile picture
              </span>
              <input
                value={profileImage.startsWith("data:") ? "" : profileImage}
                onChange={(event) => setProfileImage(event.target.value)}
                placeholder="Paste image URL"
                className="min-w-0 w-full rounded-lg border border-line bg-card-muted px-3 py-3 text-sm text-ink outline-none transition focus:border-chalk-sky focus:ring-4 focus:ring-chalk-sky/15 min-[380px]:px-4"
              />
            </label>
            <label className="mt-7 flex h-[46px] w-12 cursor-pointer items-center justify-center rounded-lg border border-line bg-card-muted text-ink-soft transition hover:text-ink">
              <ImagePlus size={19} />
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => handleImageFile(event.target.files?.[0])}
              />
            </label>
          </div>
          {imageMessage && <p className="text-xs text-ink-soft/70">{imageMessage}</p>}
          {profileImage && (
            <button
              type="button"
              onClick={() => {
                setProfileImage("");
                setImageMessage("Photo will be removed when you save.");
              }}
              className="text-xs font-semibold text-dust-pink"
            >
              Remove profile picture
            </button>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper shadow-lg shadow-ink/10 transition active:scale-95 disabled:opacity-60"
          >
            {state.ok ? <Check size={17} /> : <Save size={17} />}
            {pending ? "Saving..." : state.ok ? "Saved" : "Save profile"}
          </button>
          {state.message && (
            <p className={`text-center text-xs ${state.ok ? "text-chalk-mint" : "text-dust-pink"}`}>
              {state.message}
            </p>
          )}
        </form>
      </section>

      <div className="mt-5 space-y-3">
        <Row
          icon={<Palette size={18} />}
          title="Appearance"
          subtitle="Switch between crisp paper and midnight chalkboard."
          action={<ThemeModeSelect />}
        />
        <Row
          icon={<Bell size={18} />}
          title="Push notifications"
          subtitle={
              status === "subscribed"
              ? "This device is registered for notifications."
              : status === "denied"
                ? "Blocked in browser settings."
                : "Get notified when someone draws for you."
          }
          action={
            <button
              onClick={handlePushToggle}
              disabled={busy || status === "denied" || status === "unsupported"}
              className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-40 ${
                status === "subscribed" ? "bg-chalk-amber" : "bg-ink/15"
              }`}
              aria-label="Toggle push notifications"
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  status === "subscribed" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          }
        />
        {pushError && (
          <p className="rounded-lg bg-dust-pink/10 px-4 py-3 text-xs text-dust-pink">
            {pushError}
          </p>
        )}
        {status === "subscribed" && (
          <button
            onClick={sendTestNotification}
            className="w-full rounded-full border border-line bg-card px-4 py-2.5 text-xs font-semibold text-ink"
          >
            Send a test notification
          </button>
        )}
        {testMessage && <p className="px-2 text-xs text-ink-soft/70">{testMessage}</p>}
        <Row
          icon={<ShieldCheck size={18} />}
          title="Account"
          subtitle={`Member since ${new Date(user.createdAt).toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          })} · ${user._count.sessions} active session${user._count.sessions === 1 ? "" : "s"}.`}
          action={
            <form action={signOutEverywhereAction}>
              <button className="text-xs font-semibold text-dust-pink">Sign out all</button>
            </form>
          }
        />
      </div>

      <PreferenceSections preferences={preferences} blockedUsers={user.blocksCreated.map((item) => item.blocked)} />

      <div className="mt-6 space-y-1 rounded-lg border border-line bg-card/70 p-2">
        <a
          href="/api/account/export"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-ink-soft transition hover:bg-ink/5"
        >
          <Download size={18} />
          Download my data
        </a>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-ink-soft transition hover:bg-ink/5"
        >
          <LogOut size={18} />
          Log out
        </button>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-3 text-sm text-dust-pink transition hover:bg-dust-pink/10">
            <Trash2 size={18} />
            Delete account
          </summary>
          <form action={deleteAccountAction} className="space-y-3 px-3 pb-3">
            <p className="text-xs leading-5 text-ink-soft/70">
              This permanently removes your profile, messages, reactions, and device subscriptions.
              Type DELETE to confirm.
            </p>
            <input
              name="confirmation"
              required
              pattern="DELETE"
              autoComplete="off"
              placeholder="DELETE"
              className="w-full rounded-lg border border-dust-pink/40 bg-card-muted px-3 py-2 text-sm text-ink outline-none"
            />
            <button className="w-full rounded-full bg-dust-pink px-4 py-2.5 text-sm font-semibold text-white">
              Permanently delete account
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}

function resizeProfileImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Invalid file result."));
        return;
      }

      image.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Canvas is unavailable."));
          return;
        }

        const side = Math.min(image.width, image.height);
        const sourceX = (image.width - side) / 2;
        const sourceY = (image.height - side) / 2;

        canvas.width = size;
        canvas.height = size;
        context.drawImage(image, sourceX, sourceY, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.76));
      };

      image.onerror = () => reject(new Error("Could not load image."));
      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

function PreferenceSections({
  preferences,
  blockedUsers,
}: {
  preferences: UserPreferences;
  blockedUsers: SettingsUser["blocksCreated"][number]["blocked"][];
}) {
  return (
    <div className="mt-6 space-y-5">
      <section className="glass-panel overflow-hidden rounded-xl p-4 min-[380px]:p-5">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 font-hand text-2xl text-ink">
            <Bell size={18} /> Notification preferences
          </h2>
          <p className="mt-1 text-xs text-ink-soft/65">
            Browser permission and these preferences both need to be enabled.
          </p>
        </div>
        <form action={updatePreferencesAction} className="space-y-3">
          <input type="hidden" name="section" value="notifications" />
          <CheckRow name="notificationsEnabled" label="Allow Chalk notifications" defaultChecked={preferences.notificationsEnabled} />
          <CheckRow name="notifyMessages" label="New chalk messages" defaultChecked={preferences.notifyMessages} />
          <CheckRow name="notifyReactions" label="Reactions to my chalks" defaultChecked={preferences.notifyReactions} />
          <CheckRow name="hideNotificationPreview" label="Hide message previews" defaultChecked={preferences.hideNotificationPreview} />
          <CheckRow name="quietHoursEnabled" label="Quiet hours" defaultChecked={preferences.quietHoursEnabled} />
          <div className="grid min-w-0 grid-cols-2 gap-2 min-[380px]:gap-3">
            <TimeField name="quietStart" label="From" value={preferences.quietStart} />
            <TimeField name="quietEnd" label="Until" value={preferences.quietEnd} />
          </div>
          <SaveButton />
        </form>
        {blockedUsers.length > 0 && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft/60">
              Blocked people
            </p>
            <div className="space-y-2">
              {blockedUsers.map((blocked) => (
                <form key={blocked.id} action={unblockUserAction} className="flex items-center gap-3 rounded-lg bg-ink/[0.035] p-2">
                  <input type="hidden" name="userId" value={blocked.id} />
                  {blocked.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={blocked.image} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink/10 text-xs">
                      {blocked.name?.[0] || "?"}
                    </div>
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs text-ink">
                    {blocked.name || blocked.username || "Chalk member"}
                  </span>
                  <button className="rounded-full bg-card px-3 py-1.5 text-[11px] font-semibold text-ink-soft">
                    Unblock
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="glass-panel overflow-hidden rounded-xl p-4 min-[380px]:p-5">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 font-hand text-2xl text-ink">
            <ShieldCheck size={18} /> Privacy & accessibility
          </h2>
        </div>
        <form action={updatePreferencesAction} className="space-y-3">
          <input type="hidden" name="section" value="privacy" />
          <CheckRow name="profilePublic" label="Show my profile card to circle members" defaultChecked={preferences.profilePublic} icon={<Eye size={15} />} />
          <CheckRow name="readReceipts" label="Share when I have seen a chalk" defaultChecked={preferences.readReceipts} icon={<Check size={15} />} />
          <CheckRow name="reducedMotion" label="Reduce drawing and interface motion" defaultChecked={preferences.reducedMotion} icon={<Accessibility size={15} />} />
          <SaveButton />
        </form>
        <DeviceLockSettings />
      </section>
    </div>
  );
}

function CheckRow({
  name,
  label,
  defaultChecked,
  icon,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl bg-ink/[0.035] px-3 py-3 text-sm text-ink">
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1 leading-5">{label}</span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 shrink-0 accent-[var(--chalk-amber)]"
      />
    </label>
  );
}

function TimeField({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <label className="min-w-0 overflow-hidden rounded-xl bg-ink/[0.035] p-2.5 text-xs text-ink-soft min-[380px]:p-3">
      <span className="mb-1 flex items-center gap-1"><Clock3 size={12} /> {label}</span>
      <input type="time" name={name} defaultValue={value} className="min-w-0 max-w-full bg-transparent text-sm text-ink outline-none" />
    </label>
  );
}

function SaveButton() {
  return (
    <button className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper">
      <Save size={15} /> Save preferences
    </button>
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
    <div className="glass-panel grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 overflow-hidden rounded-xl px-3 py-3.5 min-[380px]:grid-cols-[2.5rem_minmax(0,1fr)_auto] min-[380px]:px-4">
      <div className="row-start-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-chalk-amber/15 text-cork-dark">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="line-clamp-2 break-words text-xs leading-4 text-ink-soft/70">{subtitle}</p>
      </div>
      <div className="col-start-2 row-start-2 min-w-0 justify-self-start min-[380px]:col-start-3 min-[380px]:row-start-1 min-[380px]:justify-self-end">
        {action}
      </div>
    </div>
  );
}

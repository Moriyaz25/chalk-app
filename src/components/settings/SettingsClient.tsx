"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Camera,
  ChevronLeft,
  Check,
  ImagePlus,
  LogOut,
  Palette,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { logoutAction, updateProfileAction } from "@/lib/actions";

type SettingsUser = {
  name: string | null;
  username: string | null;
  image: string | null;
  email: string | null;
  createdAt: string;
};

export function SettingsClient({ user }: { user: SettingsUser }) {
  const router = useRouter();
  const { status, subscribe, unsubscribe } = usePushNotifications();
  const [busy, setBusy] = useState(false);
  const [profileImage, setProfileImage] = useState(user.image ?? "");
  const [state, formAction, pending] = useActionState(updateProfileAction, {
    ok: false,
    message: "",
  });
  const [imageMessage, setImageMessage] = useState("");

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
    <div className="mx-auto max-w-md px-4 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
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
        <ThemeToggle />
      </div>

      <section className="glass-panel theme-shadow overflow-hidden rounded-lg">
        <div className="board-texture px-5 py-6">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-chalk-amber/20 ring-2 ring-chalk-white/20">
              {profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-hand text-3xl text-chalk-white">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-hand text-3xl leading-none text-chalk-white">
                {user.username || user.name || "Your profile"}
              </p>
              <p className="mt-1 truncate text-sm text-chalk-white/55">{user.email}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-chalk-white/10 px-3 py-1 text-xs text-chalk-white/80">
                <Sparkles size={13} />
                Personal chalk identity
              </div>
            </div>
          </div>
        </div>

        <form action={formAction} className="space-y-4 p-5">
          <input type="hidden" name="image" value={profileImage} />
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <User size={16} />
              Username
            </span>
            <input
              name="username"
              defaultValue={user.username || user.name || ""}
              maxLength={24}
              placeholder="Choose a name people will recognize"
              className="w-full rounded-lg border border-line bg-card-muted px-4 py-3 text-sm text-ink outline-none transition focus:border-chalk-amber focus:ring-4 focus:ring-chalk-amber/15"
            />
          </label>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                <Camera size={16} />
                Profile picture
              </span>
              <input
                value={profileImage.startsWith("data:") ? "" : profileImage}
                onChange={(event) => setProfileImage(event.target.value)}
                placeholder="Paste image URL"
                className="w-full rounded-lg border border-line bg-card-muted px-4 py-3 text-sm text-ink outline-none transition focus:border-chalk-sky focus:ring-4 focus:ring-chalk-sky/15"
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
          action={<ThemeToggle />}
        />
        <Row
          icon={<Bell size={18} />}
          title="Push notifications"
          subtitle={
            status === "subscribed"
              ? "You will be notified of new messages."
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
        <Row
          icon={<ShieldCheck size={18} />}
          title="Account"
          subtitle={`Member since ${new Date(user.createdAt).toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          })}.`}
          action={<span className="text-xs font-semibold text-chalk-mint">Active</span>}
        />
      </div>

      <div className="mt-6 space-y-1 rounded-lg border border-line bg-card/70 p-2">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-ink-soft transition hover:bg-ink/5"
          >
            <LogOut size={18} />
            Log out
          </button>
        </form>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-dust-pink transition hover:bg-dust-pink/10">
          <Trash2 size={18} />
          Delete account
        </button>
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
        const size = 512;
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
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.onerror = () => reject(new Error("Could not load image."));
      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
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
    <div className="glass-panel flex items-center gap-3 rounded-lg px-4 py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-chalk-amber/15 text-cork-dark">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="truncate text-xs text-ink-soft/70">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

import { signIn } from "@/lib/auth";
import { LockKeyhole, PenLine, ShieldCheck, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="board-texture relative min-h-dvh overflow-hidden px-4 py-5 text-chalk-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(244,241,232,0.035)_1px,transparent_1px),linear-gradient(0deg,rgba(244,241,232,0.025)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-40 bg-gradient-to-b from-black/35 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-chalk-white/10 bg-chalk-white/10 shadow-sm">
              <PenLine size={19} className="text-chalk-amber" />
            </div>
            <div>
              <p className="font-hand text-3xl leading-none">Chalk</p>
              <p className="text-xs text-chalk-white/45">Private handwritten boards</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <section className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-chalk-white/10 bg-chalk-white/10 px-3 py-1.5 text-xs font-semibold text-chalk-white/75">
              <Sparkles size={14} className="text-chalk-amber" />
              Draw it, send it, keep it close
            </div>
            <h1 className="font-hand text-7xl leading-[0.9] text-chalk-white sm:text-8xl lg:text-9xl">
              Chalk
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-chalk-white/68 sm:text-lg">
              A calmer way to leave handwritten messages for your people. No noisy feed,
              no typing pressure, just a little board waiting for someone you care about.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Signal label="Private circles" value="Invite only" />
              <Signal label="Made for touch" value="Draw first" />
              <Signal label="Fast return" value="One tap" />
            </div>
          </section>

          <section className="mx-auto w-full max-w-md">
            <div className="overflow-hidden rounded-lg border border-chalk-white/12 bg-chalk-white/[0.07] shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="border-b border-chalk-white/10 p-4">
                <div className="rounded-lg bg-slate-800/80 p-4 ring-1 ring-chalk-white/10">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-dust-pink" />
                      <span className="h-2.5 w-2.5 rounded-full bg-chalk-amber" />
                      <span className="h-2.5 w-2.5 rounded-full bg-chalk-mint" />
                    </div>
                    <span className="text-[11px] font-medium text-chalk-white/35">Today</span>
                  </div>
                  <svg viewBox="0 0 360 190" className="h-48 w-full">
                    <path
                      d="M44 108 C80 50, 117 51, 148 101 S227 130, 279 52"
                      fill="none"
                      stroke="#f1c36f"
                      strokeLinecap="round"
                      strokeWidth="9"
                    />
                    <path
                      d="M57 133 C99 154, 139 152, 177 126 C215 101, 255 110, 305 143"
                      fill="none"
                      stroke="#f19a94"
                      strokeLinecap="round"
                      strokeWidth="7"
                    />
                    <path
                      d="M74 58 C117 39, 164 34, 214 47"
                      fill="none"
                      stroke="#8ec9de"
                      strokeLinecap="round"
                      strokeWidth="5"
                      strokeDasharray="1 16"
                    />
                    <text
                      x="54"
                      y="174"
                      fill="#fbf6e8"
                      opacity="0.55"
                      fontSize="18"
                      fontFamily="cursive"
                    >
                      see you after class
                    </text>
                  </svg>
                </div>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <p className="font-hand text-4xl leading-none text-chalk-white">
                    Welcome back
                  </p>
                  <p className="mt-2 text-sm leading-6 text-chalk-white/55">
                    Sign in to open your boards, invites, and saved profile.
                  </p>
                </div>

                <form
                  action={async () => {
                    "use server";
                    await signIn("google", { redirectTo: next || "/" });
                  }}
                >
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-3 rounded-full bg-chalk-white px-5 py-4 text-sm font-semibold text-slate-950 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-white active:scale-95"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>
                </form>

                <div className="grid gap-2 text-xs text-chalk-white/50">
                  <p className="flex items-center gap-2">
                    <ShieldCheck size={15} className="text-chalk-mint" />
                    Invite-only circles keep your boards personal.
                  </p>
                  <p className="flex items-center gap-2">
                    <LockKeyhole size={15} className="text-chalk-sky" />
                    By continuing, you agree to keep your boards kind.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-chalk-white/10 bg-chalk-white/[0.07] px-4 py-3 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase text-chalk-white/40">{label}</p>
      <p className="mt-1 text-sm font-semibold text-chalk-white/85">{value}</p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.81 2.73v2.27h2.92c1.71-1.57 2.69-3.88 2.69-6.64z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.7c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V4.97H.96A8.997 8.997 0 0 0 0 9c0 1.45.35 2.83.96 4.03l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.97l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

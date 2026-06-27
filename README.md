# Chalk

Handwritten chalk messages for the people you care about — built with Next.js, PostgreSQL, and Web Push. A PWA you can install to your home screen.

This is a clone-and-improve of an app called Chalkee, with one major change: **connections aren't limited to 1-on-1**. You can have unlimited direct connections *and* group circles, all free.

---

## Stack

- **Next.js 16** (App Router, TypeScript)
- **PostgreSQL** + **Prisma ORM**
- **NextAuth.js v5** — Google sign-in
- **Web Push API** — real notifications when someone draws for you, no native app needed
- **Tailwind CSS v4** + **Framer Motion**
- Hand-rolled service worker (no Workbox) for full control over push payloads

---

## 1. Install dependencies

```bash
npm install
```

This also runs `prisma generate` automatically via the `postinstall` script.

> **Note:** if you're on a machine with restricted network access (e.g. a sandboxed CI runner), `prisma generate` needs to reach `binaries.prisma.sh` to download its query engine. On a normal dev machine or most hosting providers this just works.

## 2. Set up PostgreSQL

Use a local Postgres install, or a free hosted one (Neon, Supabase, Railway all work fine).

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` in `.env`.

Then push the schema:

```bash
npx prisma migrate dev --name init
```

## 3. Google OAuth

1. Go to Google Cloud Console -> Credentials (console.cloud.google.com/apis/credentials)
2. Create an OAuth Client ID (type: Web application)
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy the Client ID + Secret into `.env` as `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`

Generate an auth secret:

```bash
npx auth secret
```

This writes `AUTH_SECRET` into `.env` for you.

## 4. Web Push (VAPID keys)

```bash
npx web-push generate-vapid-keys
```

Copy the output into `.env`:

```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...   # same as VAPID_PUBLIC_KEY
VAPID_SUBJECT=mailto:you@example.com
```

## 5. Run it

```bash
npm run dev
```

Open http://localhost:3000. Sign in with Google, then go to **Connect** to generate an invite code/link. Open that link in a second browser (or incognito window, or your phone) signed in as a different Google account to test the connection both ways.

## Installing as a PWA

On Android Chrome or desktop Chrome/Edge: visit the site, then use "Install app" from the browser menu (or the install icon in the address bar). On iOS Safari: Share -> Add to Home Screen. The custom icon and name ("Chalk") will show up like a native app.

---

## How connections work

Every connection — whether it's just you and one other person, or a whole friend group — is internally a **Circle**. A 1-on-1 is just a Circle with two members and `isDirect: true`. This is the main upgrade over the original Chalkee app, which hard-limits you to one connection unless you pay.

- **Direct invite**: generates a single-use code. Whoever redeems it forms a new private Circle with you.
- **Group invite**: you name a circle, generate a code with `maxUses` set to 0 (unlimited) or a specific number, and anyone who redeems it joins that same circle.

## How drawings are stored

Each board is stored as **SVG path data** (an array of `{ d, color, width, opacity }` stroke objects) in a Postgres `Json` column — not as a PNG. This keeps storage tiny, keeps the drawing crisp at any screen size, and lets us animate the "writing it live" effect on playback by revealing each stroke's path over time.

## Project structure

```
src/
  app/
    (auth)/login/          — Google sign-in screen
    (app)/                 — authenticated app shell (bottom nav)
      page.tsx             — circles list (home)
      board/[circleId]/    — view a circle's board history
      board/[circleId]/draw/ — full-screen drawing canvas
      circles/new/         — create/join an invite
      settings/            — push toggle, account actions
    join/[code]/           — public invite landing page
    api/                   — route handlers (circles, invites, boards, push)
  components/
    draw/                  — ChalkCanvas, ChalkTray, DrawToolbar
    board/                 — BoardScreen, BoardPlayback, CircleCard, JoinScreen
  lib/                     — prisma client, auth config, push helper
  hooks/                   — usePushNotifications
  types/                   — chalk.ts (drawing data shapes), next-auth.d.ts
prisma/
  schema.prisma
public/
  sw.js                    — hand-written service worker (push + basic caching)
  manifest.json
  icons/
```

## Personal-space features

- Secret rub-to-reveal, view-once, disappearing, scheduled, and “open when” boards
- Photo doodles, voice scribbles, digital gifts, and rotating drawing prompts
- Chalk reactions, shared streaks, pinned memory walls, and pass-the-doodle replies
- Per-circle emoji, nickname, mood, shared song, and accent color
- Lightweight shared canvases that sync an in-progress draft between circle members

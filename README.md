# Trackstack

Version control for Ableton Live projects. A desktop app snapshots your `.als` file and audio samples on every "push," and a web app gives you a browsable history of commits from anywhere.

---

## What's in this repo

```
trackstack/
├── apps/
│   ├── web/          Next.js 14 SSR app — project history, auth
│   └── desktop/      Tauri v2 + Next.js static export — local project scanning, push
├── packages/
│   ├── core/         Shared Supabase client + TypeScript types
│   └── ui/           Shared React components (FileTree, AudioPlayer)
└── package.json      npm workspaces root
```

All JavaScript dependencies are hoisted to the root `node_modules` via npm workspaces. Internal packages (`@trackstack/core`, `@trackstack/ui`) are referenced with `"*"` versions so changes are picked up immediately without a build step.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | [nvm](https://github.com/nvm-sh/nvm): `nvm install 20 && nvm use 20` |
| Rust | stable | [rustup](https://rustup.rs): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Tauri CLI | v2 | bundled in `devDependencies` — no global install needed |

---

## One-time setup

```bash
# from the repo root
npm install
```

That installs dependencies for all workspaces at once.

---

## Running the web app

```bash
npm run dev:web
# → http://localhost:3000
```

Create `apps/web/.env.local` if it doesn't exist:

```
NEXT_PUBLIC_SUPABASE_URL=<your project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
```

Routes:

| Path | Description |
|------|-------------|
| `/login` | Sign in with email + password |
| `/signup` | Create an account |
| `/dashboard` | Project history (placeholder — requires auth) |

All routes except `/login` and `/signup` are protected by middleware (`apps/web/middleware.ts`). Unauthenticated requests are redirected to `/login`. The middleware uses `getUser()` — not `getSession()` — so tokens are validated and refreshed server-side on every request.

---

## Running the desktop app

The desktop is a Tauri v2 window that loads a Next.js static export. There are two ways to run it:

### Next.js only (no native shell)

Useful for UI work — runs in the browser but Tauri IPC calls will fail since there's no native host.

```bash
npm run dev:desktop
# → http://localhost:3001
```

### Full Tauri dev mode

Requires Xcode Command Line Tools on macOS.

```bash
cd apps/desktop
npm run tauri:dev
```

This starts the Next.js dev server on port 3001 and opens a native window pointed at it. Hot reload works.

Create `apps/desktop/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<your project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
```

### Building a distributable

```bash
cd apps/desktop
npm run tauri:build
```

The `.dmg` / `.app` lands in `apps/desktop/src-tauri/target/release/bundle/`.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Paste the migration into the SQL editor and run it:
   - `packages/core/supabase/migrations/001_init.sql`
3. Copy the project URL and anon key into both `.env.local` files.

The migration creates three tables with row-level security:

| Table | Description |
|-------|-------------|
| `projects` | One row per Ableton project folder a user has registered |
| `commits` | Each "push" from the desktop app; stores track names at snapshot time |
| `commit_files` | Individual `.wav` files touched by a commit (new / modified / deleted) |

RLS policies enforce that users can only read and write their own rows. `commit_files` uses a two-hop join (`commit_files → commits → projects → auth.users`) to verify ownership without duplicating `user_id` into every table.

---

## How the desktop app works

The app is a three-state machine rendered in `apps/desktop/app/page.tsx`:

```
auth → welcome → staging
```

- **auth** — shown when there's no active Supabase session; renders `LoginView`
- **welcome** — user picks an Ableton `.als` file via a native file dialog (Tauri `open` dialog); previous snapshot is loaded from `localStorage`
- **staging** — shows a diff of what changed since the last snapshot (new / modified / deleted `.wav` files and any track name changes); user writes a commit message and pushes

The Rust backend (`apps/desktop/src-tauri/src/`) exposes two Tauri IPC commands:

| Command | What it does |
|---------|-------------|
| `parse_project` | Decompresses the gzipped `.als` XML, extracts track names, and SHA-256 hashes every `.wav` in the sibling `Samples/` directory |
| `diff_project` | Compares two `ProjectSnapshot` objects and returns lists of new / modified / deleted sample files |

Dependencies used in the Rust crate: `flate2` (gzip decompression), `quick-xml` (event-based XML parsing), `sha2` (hashing), `tauri-plugin-dialog` (native file picker).

---

## Package overview

### `packages/core`

- `src/supabase.ts` — exports a single `createClient` singleton (uses `@supabase/supabase-js` with localStorage sessions; suitable for the static-export desktop app)
- `src/types.ts` — shared `Project`, `Track`, `User` TypeScript interfaces

### `packages/ui`

- `src/components/FileTree.tsx` — renders a diff tree of changed files grouped by status
- `src/components/AudioPlayer.tsx` — basic waveform/playback component for sample preview

Both apps import from these packages directly — no build step required in development because Next.js transpiles them via `transpilePackages` in each `next.config.mjs`.

---

## Auth split: web vs desktop

The web app uses `@supabase/ssr` (`createBrowserClient` / `createServerClient`) so sessions live in cookies and the Next.js middleware can validate them server-side.

The desktop app uses the plain `createClient` from `@trackstack/core` so sessions live in `localStorage`. This is intentional — the desktop is a fully static export (`output: 'export'`) with no server, so cookie-based SSR auth isn't available.

# Trackstack

Version control for Ableton Live projects. The desktop app snapshots your `.als` file and audio samples on every "push," and the web app gives you a browsable history of commits from anywhere.

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

---

## Running the web app

```bash
npm run dev:web
# → http://localhost:3000
```

| Path | Description |
|------|-------------|
| `/login` | Sign in with email + password |
| `/signup` | Create an account |
| `/dashboard` | Project history (requires auth) |

All routes except `/login` and `/signup` redirect to `/login` if you're not signed in.

---

## Running the desktop app

Two ways to run it, depending on what you're working on:

### Browser only (no native shell)

```bash
npm run dev:desktop
# → http://localhost:3001
```

UI works in the browser but Tauri IPC calls (file picker, project parsing) will fail since there's no native host. Good for styling/layout work only.

### Full Tauri window

```bash
cd apps/desktop
npm run tauri:dev
```

Starts the Next.js dev server on port 3001 and opens a real native desktop window. This is the one you want for actual testing. Hot reload works.

### Building a distributable

```bash
cd apps/desktop
npm run tauri:build
# Output: apps/desktop/src-tauri/target/release/bundle/
```

---

## How the desktop app works

The app moves through three states:

```
auth → welcome → staging
```

- **auth** — shown when there's no active session; renders the login form
- **welcome** — pick an Ableton `.als` file via the native file dialog
- **staging** — shows what changed since the last push (new / modified / deleted `.wav` files, track name changes); write a commit message and push

The Rust backend exposes two commands over Tauri IPC:

| Command | What it does |
|---------|-------------|
| `parse_project` | Decompresses the gzipped `.als` XML, extracts track names, SHA-256 hashes every `.wav` in `Samples/` |
| `diff_project` | Compares two snapshots and returns lists of new / modified / deleted files |

---

## Database tables

| Table | Description |
|-------|-------------|
| `projects` | One row per Ableton project folder registered by a user |
| `commits` | Each push from the desktop app; stores track names at snapshot time |
| `commit_files` | Individual `.wav` files touched by a commit (new / modified / deleted) |

---

## Auth: web vs desktop

The web app stores sessions in **cookies** — the Next.js middleware can validate them server-side on every request.

The desktop app stores sessions in **localStorage** — necessary because the desktop is a fully static export with no server.

---

## Known limitations

- No `.als` merge conflict resolution. If two people edit the same project, you'll need to sort it out in Ableton manually.
- Requires "Collect All and Save" in Ableton before pushing, otherwise samples referenced from outside the project folder won't be captured.
- Plugin states are not version-controlled. Missing VSTs will show as Ableton's native "ghost plugins" when loading an old snapshot on a different machine.
# Trackstack

Version control for Ableton Live projects. The desktop app snapshots your `.als` file and audio samples on every "push," and the web app gives you a browsable commit history from anywhere.

---

## What's in this repo

```
trackstack/
├── apps/
│   ├── web/          Next.js 14 SSR app — dashboard, project history, auth
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
| `/dashboard` | Home — recent activity, pinned projects, push history |
| `/dashboard/projects` | All repositories with search |
| `/dashboard/projects/[id]` | Commit history for a single project |
| `/dashboard/projects/[id]/commit/[id]` | Commit detail — changed files, audio preview |
| `/dashboard/activity` | Full activity feed across all projects |
| `/dashboard/settings` | Account settings |

All routes under `/dashboard` redirect to `/login` if you're not signed in.

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

Starts the Next.js dev server on port 3001 and opens a real native desktop window. This is what you want for actual testing. Hot reload works.

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

The web app stores sessions in **cookies** — the Next.js middleware validates them server-side on every request.

The desktop app stores sessions in **localStorage** — necessary because the desktop is a fully static export with no server.

---

## Supabase Storage setup

Create a private bucket called `wav-files` in the Supabase dashboard (Storage → New bucket). Then add two RLS policies:

**INSERT policy** — allows uploads:
```sql
CREATE POLICY "wav-files: authenticated users can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'wav-files' AND auth.role() = 'authenticated');
```

**SELECT policy** — allows signed URL generation:
```sql
CREATE POLICY "wav-files: authenticated users can read own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'wav-files' AND auth.role() = 'authenticated');
```

---

## Known limitations

- **No merge conflict resolution.** If two people edit the same project, changes must be reconciled manually in Ableton.
- **Requires "Collect All and Save" in Ableton** before pushing, otherwise samples referenced from outside the project folder won't be captured by the hash scanner.
- **Plugin states are not version-controlled.** Missing VSTs will show as Ableton's native "ghost plugins" when loading a snapshot on a different machine.
- **Signed audio URLs expire after 1 hour.** Long browser sessions on the commit detail page will need a page reload to re-generate playback links.
- **Next.js 14 has known CVEs.** Upgrade to 15+ before production use (`npm install next@latest` in both `apps/web` and `apps/desktop`).

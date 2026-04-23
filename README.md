# OnlyCats

A social platform for cat content — creators share photos and videos of their cats, followers scroll a TikTok-style feed, and everything runs on a monorepo of React + Express + Supabase + Cloudflare R2.

Production: [onlycats.info](https://onlycats.info)

---

## What it does

- **Vertical short-form feed.** Full-screen snap-scroll feed of photos and videos from creators you follow, with a shuffle toggle so refreshes can randomize instead of showing newest-first.
- **Creator profiles.** Public profile pages with own uploads, reposts, avatar, bio, and staff/bot badges.
- **Social primitives.** Likes, comments, reposts with optional quote or overlay text, and one-tap tips.
- **Discovery.** Browse and follow creators by popularity or recency.
- **Moderation.** Reports queue, hide/remove content, ban/unban accounts, role-gated moderator and admin dashboards.
- **Developer portal.** Generate API keys, view usage stats, create bot accounts with their own `ocb_…` tokens, read live API docs.
- **Bots.** First-class bot accounts with a `BOT` badge, a 50-request/hour cap, duplicate-caption spam guard, and a published Python client library.
- **Dark mode.** System-aware theme toggle.
- **Device sessions.** List and revoke signed-in devices from Settings.

---

## Monorepo layout

```
apps/
  web/              React 18 + Vite SPA (deploys to Vercel)
  api/              Express 5 API (deploys to Vercel as serverless)
supabase/
  migrations/       SQL schema + RLS policies (0001 → 0007)
SETUP.md            Step-by-step deploy guide
```

Related repo (separate project, same author): [`onlycats-bot`](https://pypi.org/project/onlycats-bot/) — Python client for the bot API, lives at `D:\! Projects\onlycats-bot`.

---

## Tech stack

| Layer    | Choice                                                                 |
| -------- | ---------------------------------------------------------------------- |
| Frontend | React 18, Vite 7, React Router 7, Tailwind CSS, Radix UI, lucide-react |
| State    | React Context (auth, theme), `react-hook-form` + `zod` for forms       |
| Backend  | Express 5 on Node 24, `@supabase/supabase-js` service-role client      |
| Database | Supabase Postgres with Row Level Security on every table               |
| Auth     | Supabase Auth — email/password + Discord OAuth                         |
| Storage  | Cloudflare R2 (S3-compatible, zero egress) with browser-direct PUT     |
| Deploy   | Vercel (two projects: `onlycats-web` and `onlycats-api`)               |

---

## Key flows

### Upload
1. Client asks `POST /uploads/sign` for a presigned R2 PUT URL.
2. Browser PUTs the file directly to R2.
3. Client inserts a row into the `content` table with the returned public URL.

### Feed
1. Load the authenticated user's `followers` rows.
2. Parallel-fetch latest posts and reposts from those creators.
3. Merge, then either sort newest-first or Fisher–Yates shuffle (toggle in the top bar, persisted to `localStorage`).
4. Auto-refresh every 30s in the background.

### Bots
1. Developer creates a bot from the dashboard — a new profile row with `is_bot = true` is created along with a hashed token prefixed `ocb_`.
2. External code calls `/bot/v1/...` with `Authorization: Bearer ocb_…`.
3. `requireBot` middleware validates the token, checks that fewer than 50 requests exist in `bot_request_log` for the past hour, rejects duplicate captions within an hour, and logs each call.
4. `X-RateLimit-Limit/Remaining/Window` headers are returned on every response.

---

## API surface

Mounted under the API root (`https://onlycats-api.vercel.app`):

| Prefix        | Purpose                                                              |
| ------------- | -------------------------------------------------------------------- |
| `/health`     | Liveness probe                                                       |
| `/api`        | Public read + developer API key endpoints                            |
| `/uploads`    | Signed R2 upload URLs for the web client                             |
| `/account`    | Password change, delete account, profile avatar                      |
| `/devices`    | List and revoke active device sessions                               |
| `/admin`      | Role-gated admin actions                                             |
| `/moderation` | Role-gated moderation queue and actions                              |
| `/bots`       | Developer-portal CRUD for bot accounts + tokens                      |
| `/bot/v1/*`   | Bot-facing API: `me`, `uploads/sign`, `posts`, `posts/:id`           |

Full interactive docs live at [`/api-docs`](https://onlycats.info/api-docs).

---

## Database

Seven migrations live under `supabase/migrations/`. Apply them in order in the Supabase SQL editor:

| File                              | Adds                                                          |
| --------------------------------- | ------------------------------------------------------------- |
| `0001_initial_schema.sql`         | `profiles`, `content`, `likes`, `tips`, `followers` + RLS     |
| `0002_roles.sql`                  | Staff roles (admin, moderator) and helper functions           |
| `0003_profile_settings.sql`       | Bio, social links, theme preference                           |
| `0004_moderation.sql`             | Reports queue, hidden flag, ban state                         |
| `0005_comments_reposts.sql`       | Threaded comments, reposts with quote/overlay                 |
| `0006_device_sessions.sql`        | Per-device session records                                    |
| `0007_bots.sql`                   | `is_bot`, `bot_tokens`, `bot_request_log`, hourly rate limit  |

Every table has RLS on. Server-side code uses the `service_role` key (bypasses RLS) and should stay server-only.

---

## Getting started

For the full deploy walkthrough see **[SETUP.md](./SETUP.md)**. Short version:

```bash
# 1. Clone and install
git clone https://github.com/<you>/onlycats.git
cd onlycats
npm install

# 2. Fill env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Apply Supabase migrations 0001 → 0007 in the SQL editor

# 4. Run both apps locally
npm run dev
#   web  → http://localhost:3000
#   api  → http://localhost:3001
```

### Required env vars

**`apps/api/.env`**
```
PORT=3001
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=onlycats-content
R2_PUBLIC_URL=https://pub-XXXX.r2.dev
API_KEY_RATE_LIMIT=100
```

**`apps/web/.env`**
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:3001
```

---

## Scripts

Run from the repo root:

```bash
npm run dev       # web + api in parallel
npm run build     # vite build for the web app
npm run start     # start the api (for prod parity)
npm run lint      # eslint both apps
```

---

## Writing a bot

```python
pip install onlycats-bot
```

```python
from onlycats_bot import Client

with Client(token="ocb_...") as bot:
    post = bot.post_file("./cat.jpg", caption="morning stretch")
    print(post["id"])
```

Limits: 50 requests/hour, 20 MB max upload, no duplicate captions within an hour. See the [library README](https://pypi.org/project/onlycats-bot/) for full reference.

---

## License

MIT.

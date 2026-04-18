# Setup Guide — GitHub + Supabase + Vercel

This repo is a monorepo with two apps:

- `apps/web` — React + Vite frontend (deploys to Vercel as a static SPA)
- `apps/api` — Express API (deploys to Vercel as a serverless function)

The database, auth, storage, and Discord OAuth all live on **Supabase** (free tier).

---

## 1. Push to GitHub

```bash
cd "horizons-export-b79ccb46-dae1-4dd0-b3b6-57044350c67a"
git init -b main
git add .
git commit -m "Initial commit"
gh repo create my-app --public --source=. --push
```

No `gh` CLI? Create the repo on github.com, then:

```bash
git remote add origin https://github.com/<you>/my-app.git
git push -u origin main
```

The included `.gitignore` keeps `node_modules/`, `dist/`, and `.env` out of the repo.

---

## 2. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) (free tier: 500 MB DB, 1 GB storage, 50k MAU).
2. **New Project** → pick a region close to your users, set a strong DB password.
3. Wait ~2 minutes for provisioning.

### 2a. Apply the schema

1. In the Supabase Dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/migrations/0001_initial_schema.sql`](./supabase/migrations/0001_initial_schema.sql).
3. Click **Run**. This creates all tables, RLS policies, counter triggers, and the auto-provision-profile trigger.

(Alternative: install the Supabase CLI and run `supabase db push` from the repo root.)

### 2b. Create the storage buckets

In the Dashboard, open **Storage → New bucket** and create two **public** buckets:

- `avatars` — for profile avatars
- `content` — for creator content (images + videos)

The SQL migration already created storage policies that only let users write to a folder prefixed with their own user id, so avatars/content can't be overwritten by other users.

### 2c. Enable Discord OAuth (optional)

1. Create a Discord app at [discord.com/developers/applications](https://discord.com/developers/applications).
2. Under **OAuth2 → General**, copy the **Client ID** and **Client Secret**.
3. Add redirect: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
4. In Supabase, **Authentication → Providers → Discord** → toggle on, paste client id/secret.
5. Also add your site URLs under **Authentication → URL Configuration → Redirect URLs**:
   - `http://localhost:3000/**` (dev)
   - `https://your-vercel-url.vercel.app/**` (prod)

### 2d. Grab your keys

From **Project Settings → API**:

- **Project URL** → `VITE_SUPABASE_URL` / `SUPABASE_URL`
- **anon (publishable) key** → `VITE_SUPABASE_ANON_KEY` (safe for the browser)
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (**server-only — never commit, never ship to the client**)

---

## 3. Deploy the frontend to Vercel

1. Go to [vercel.com/new](https://vercel.com/new), import your GitHub repo.
2. **Root Directory:** `apps/web`
3. Framework preset auto-detects as **Vite** (confirmed by `apps/web/vercel.json`).
4. Add environment variables:
   - `VITE_SUPABASE_URL` = `https://YOUR-PROJECT.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your anon key
   - `VITE_API_URL` = (leave empty — fill in after step 4 deploys the API)
5. Click **Deploy**.

Subsequent pushes to `main` auto-deploy. PRs get preview URLs automatically.

---

## 4. Deploy the API to Vercel

Create a **second** Vercel project from the same repo:

1. [vercel.com/new](https://vercel.com/new) → import same repo.
2. **Root Directory:** `apps/api`
3. Framework preset: **Other** (configured by `apps/api/vercel.json`).
4. Add environment variables:
   - `SUPABASE_URL` = `https://YOUR-PROJECT.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key
   - `CORS_ORIGIN` = your frontend URL (e.g. `https://my-app.vercel.app`)
   - `API_KEY_RATE_LIMIT` = `100` (optional)
5. Click **Deploy**. Note the URL, e.g. `https://my-app-api.vercel.app`.
6. Go back to the **frontend** project → Settings → Environment Variables → set `VITE_API_URL` to that URL → redeploy.

---

## 5. Local development

```bash
# one-time
cp apps/api/.env.example apps/api/.env    # fill in SUPABASE_URL + service role key
cp apps/web/.env.example apps/web/.env    # fill in VITE_SUPABASE_URL + anon key
npm install

# run everything
npm run dev
```

This runs web (`:3000`) and api (`:3001`) in parallel. Both talk to your remote Supabase project — there's no separate local DB to boot.

Want a fully local Supabase? Install the [Supabase CLI](https://supabase.com/docs/guides/local-development) and run `supabase start`, then point your `.env` files at `http://127.0.0.1:54321` and the CLI-printed keys.

---

## 6. CI / PR workflow

Vercel auto-creates a preview deployment for every PR and comments the URL on the PR. Recommended minimum:

- Open PRs against `main`.
- Wait for Vercel preview + `npm run lint` to pass.
- Squash-merge to `main` → production deploy fires automatically.

If you want a GitHub Actions lint gate, add `.github/workflows/ci.yml`:

```yaml
name: CI
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: npm run lint
```

---

## Gotchas

- **`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS.** Keep it server-side only — never in `VITE_*` variables, never committed. If leaked, rotate immediately in **Project Settings → API**.
- **Row Level Security is on for every table.** If a query mysteriously returns no rows, it's almost always a missing or mismatched policy — not a bug in the query.
- **CORS.** In prod, set `CORS_ORIGIN` on the API to the exact frontend URL — `*` won't work when `credentials: true`.
- **Storage bucket paths.** The storage policies require file paths to start with `<user-id>/...`. `apps/web/src/components/ContentUpload.jsx` already does this; keep the convention if you add new upload flows.
- **Custom domains.** Once live, add them in Vercel project settings; update `CORS_ORIGIN`, your Supabase **Redirect URLs** list, and the Discord OAuth redirect URL to match.

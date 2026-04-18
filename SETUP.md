# Setup Guide — GitHub + Vercel + Free DB Hosting

This repo is a monorepo with three apps:

- `apps/web` — React + Vite frontend (deploys to Vercel as a static SPA)
- `apps/api` — Express API (deploys to Vercel as a serverless function)
- `apps/pocketbase` — local PocketBase server (does **not** deploy to Vercel; use a free host, see below)

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

The included `.gitignore` keeps `node_modules/`, `pb_data/`, `dist/`, and `.env` out of the repo.

---

## 2. Free database hosting — use PocketHost

**Recommended: [PocketHost](https://pockethost.io)** — the simplest free option for this app because it runs the exact same PocketBase the app already uses. Zero code changes beyond an env var.

1. Sign up at pockethost.io (free tier: 1 instance, 1 GB storage).
2. Click **New Instance** → pick a subdomain, e.g. `your-app.pockethost.io`.
3. Open `https://your-app.pockethost.io/_/` and create an admin account — save the email/password.
4. Import your local schema:
   - Locally run `cd apps/pocketbase && ./pocketbase serve` (or `pocketbase.exe` on Windows).
   - In the local admin UI (`http://127.0.0.1:8090/_/`), go to **Settings → Export collections**, download the JSON.
   - In the PocketHost admin UI, **Settings → Import collections**, upload the JSON.

Alternatives if you outgrow PocketHost:

| Option | Why | Downside |
|---|---|---|
| **Supabase** free | Postgres + auth + storage, great Vercel integration | Requires rewriting PocketBase calls |
| **Neon** free | Serverless Postgres, generous free tier | DB only — no auth/storage included |
| **Fly.io** / **Railway** | Host your own PocketBase binary | Both now have limited free tiers; pay ~$5/mo |

---

## 3. Deploy the frontend to Vercel

1. Go to [vercel.com/new](https://vercel.com/new), import your GitHub repo.
2. **Root Directory:** `apps/web`
3. Framework preset auto-detects as **Vite** (confirmed by `apps/web/vercel.json`).
4. Add environment variables:
   - `VITE_POCKETBASE_URL` = `https://your-app.pockethost.io`
   - `VITE_API_URL` = (leave empty for now — fill in after step 4 deploys the API)
5. Click **Deploy**.

Subsequent pushes to `main` auto-deploy. PRs get preview URLs automatically.

---

## 4. Deploy the API to Vercel

Create a **second** Vercel project from the same repo:

1. [vercel.com/new](https://vercel.com/new) → import same repo.
2. **Root Directory:** `apps/api`
3. Framework preset: **Other** (configured by `apps/api/vercel.json`).
4. Add environment variables:
   - `POCKETBASE_URL` = `https://your-app.pockethost.io`
   - `PB_SUPERUSER_EMAIL` = your PocketHost admin email
   - `PB_SUPERUSER_PASSWORD` = your PocketHost admin password
   - `CORS_ORIGIN` = your frontend URL (e.g. `https://my-app.vercel.app`)
   - `API_KEY_RATE_LIMIT` = `100` (optional)
5. Click **Deploy**. Note the URL, e.g. `https://my-app-api.vercel.app`.
6. Go back to the **frontend** project → Settings → Environment Variables → set `VITE_API_URL` to that URL → redeploy.

---

## 5. Local development

```bash
# one-time
cp apps/api/.env.example apps/api/.env    # fill in values
cp apps/web/.env.example apps/web/.env    # usually leave empty for local
npm install

# run everything
npm run dev
```

This runs web (`:3000`), api (`:3001`), and the local PocketBase (`:8090`) in parallel.

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

- **PocketBase can't run on Vercel.** Vercel functions are stateless and ephemeral; PocketBase needs persistent disk. That's why step 2 uses PocketHost.
- **`apps/pocketbase/pb_data/` is gitignored.** Your local dev data stays local. Production data lives on PocketHost.
- **CORS.** In prod, set `CORS_ORIGIN` on the API to the exact frontend URL — `*` won't work when `credentials: true`.
- **Custom domains.** Once live, add them in Vercel project settings; update `CORS_ORIGIN` and `VITE_POCKETBASE_URL`/`VITE_API_URL` to match.

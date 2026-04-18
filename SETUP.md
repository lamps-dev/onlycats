# Setup Guide — GitHub + Supabase + Cloudflare R2 + Vercel

This repo is a monorepo with two apps:

- `apps/web` — React + Vite frontend (deploys to Vercel as a static SPA)
- `apps/api` — Express API (deploys to Vercel as a serverless function)

Services:

- **Supabase** — Postgres DB, Auth (email + Discord OAuth), Row Level Security.
- **Cloudflare R2** — file storage for creator uploads (free 10 GB, zero egress).

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

1. Sign up at [supabase.com](https://supabase.com) (free tier: 500 MB DB, 50k MAU).
2. **New Project** → pick a region close to your users, set a strong DB password.
3. Wait ~2 minutes for provisioning.

### 2a. Apply the schema

1. **SQL Editor → New query**.
2. Paste [`supabase/migrations/0001_initial_schema.sql`](./supabase/migrations/0001_initial_schema.sql) and **Run**.

### 2b. Storage buckets — skip

This app uses **Cloudflare R2** for file storage (see §3). You do **not** need to create Supabase Storage buckets. The `avatars_*` / `content_*` storage policies in the migration are harmless no-ops when the buckets don't exist — leave them.

### 2c. Enable Discord OAuth (optional)

1. Create a Discord app at [discord.com/developers/applications](https://discord.com/developers/applications).
2. Under **OAuth2 → General**, copy the **Client ID** and **Client Secret**.
3. Add redirect: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
4. In Supabase: **Authentication → Providers → Discord** → toggle on, paste client id/secret.
5. In Supabase: **Authentication → URL Configuration**:
   - **Site URL**: your prod URL (e.g. `https://my-app.vercel.app`). This is the fallback after OAuth.
   - **Redirect URLs**: add both `http://localhost:3000/**` and `https://my-app.vercel.app/**`.

### 2d. Data API

**Project Settings → API → Exposed schemas** should include `public` (default). Leave `auth` and `storage` as Supabase defaults them.

### 2e. Grab your keys

From **Project Settings → API**:

- **Project URL** → `VITE_SUPABASE_URL` / `SUPABASE_URL`
- **anon (publishable) key** → `VITE_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (**server-only — never ship to the client**)

---

## 3. Cloudflare R2 (file storage)

R2 is S3-compatible, has no egress fees, and gives 10 GB free. Creator uploads are signed server-side and PUT directly from the browser.

1. Sign up / log in at [dash.cloudflare.com](https://dash.cloudflare.com) → **R2** (left sidebar) → **Create bucket**. Name it e.g. `onlycats-content`. Location: Automatic.
2. Open the bucket → **Settings** tab.
   - **Public access → R2.dev subdomain**: **Allow**. Copy the public URL (looks like `https://pub-XXXXXXXX.r2.dev`). This becomes `R2_PUBLIC_URL`.
   - For prod, attach a **custom domain** instead (e.g. `cdn.yourdomain.com`) and use that as `R2_PUBLIC_URL` — no bandwidth costs, better cache control.
3. **CORS**: under the bucket's **Settings → CORS policy**, paste:
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://my-app.vercel.app"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   Swap in your own frontend URLs. Without this, browser PUTs will be blocked.
4. Back on the R2 overview page → **Manage R2 API Tokens** → **Create API token**.
   - Permissions: **Object Read & Write**
   - Specify bucket: select your bucket
   - TTL: none
5. Copy the **Access Key ID** and **Secret Access Key** (shown once). Also note your **Account ID** from the top-right of the R2 dashboard.

Env vars for the API (§5):

```
R2_ACCOUNT_ID=<your account id>
R2_ACCESS_KEY_ID=<access key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET=onlycats-content
R2_PUBLIC_URL=https://pub-XXXXXXXX.r2.dev
```

---

## 4. Deploy the frontend to Vercel

1. [vercel.com/new](https://vercel.com/new), import your GitHub repo.
2. **Root Directory**: `apps/web`
3. Framework preset auto-detects as **Vite**.
4. Env vars:
   - `VITE_SUPABASE_URL` = `https://YOUR-PROJECT.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` = (fill in after §5 deploys the API)
5. **Deploy**.

---

## 5. Deploy the API to Vercel

Create a **second** Vercel project from the same repo:

1. [vercel.com/new](https://vercel.com/new) → import same repo.
2. **Root Directory**: `apps/api`
3. Framework preset: **Other**.
4. Env vars:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CORS_ORIGIN` — exact frontend URL (e.g. `https://my-app.vercel.app`)
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
   - `API_KEY_RATE_LIMIT` = `100` (optional)
5. **Deploy**. Note the URL, e.g. `https://my-app-api.vercel.app`.
6. Back on the frontend project → set `VITE_API_URL` to that URL → redeploy.

---

## 6. Local development

```bash
cp apps/api/.env.example apps/api/.env    # fill everything in
cp apps/web/.env.example apps/web/.env    # fill VITE_* in
npm install
npm run dev
```

Web on `:3000`, API on `:3001`.

---

## 7. CI / PR workflow

Vercel auto-creates preview deployments per PR. Recommended minimum: open PRs against `main`, wait for Vercel preview + `npm run lint`, squash-merge.

Optional GitHub Actions lint gate at `.github/workflows/ci.yml`:

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

- **`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS.** Server-side only. Rotate immediately if leaked.
- **Row Level Security is on for every table.** Empty query result = missing policy, not a code bug.
- **CORS.** In prod, set `CORS_ORIGIN` on the API to the exact frontend URL.
- **R2 CORS.** If browser uploads fail with a CORS error, check §3 step 3.
- **Custom domains.** Add them in Vercel, then update `CORS_ORIGIN`, Supabase **Redirect URLs**, and R2 CORS to match.

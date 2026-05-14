# Jasign

MVP e-signing flow: requester uploads a PDF, shares a link, signer places a signature, requester downloads the signed PDF from the dashboard.

## How to run locally

Follow these steps in order. You need a **Supabase** project (free tier is fine) before the app can sign in or upload.

### 1. Prerequisites

- [Bun](https://bun.sh/) 1.1+ (for the API)
- [Node.js](https://nodejs.org/) 20+ and npm (for the Vite frontend)
- A [Supabase](https://supabase.com/) project

### 2. Clone the repository and create env files

```bash
git clone <repository-url>
cd <repository-directory>
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in **`backend/.env`** and **`frontend/.env`** using values from the Supabase dashboard (see **Environment variables** below). Do **not** commit real `.env` files or the service role key.

### 3. Configure Supabase

Complete **[Supabase setup](#supabase-setup)** in this README: run both SQL migrations, enable email auth (and redirect URLs if you use password reset), create the `documents` and `signed` storage buckets, and copy API keys into your env files.

### 4. Install dependencies

From the repository root:

```bash
cd backend && bun install
cd ../frontend && npm install
```

### 5. Start the backend

In one terminal:

```bash
cd backend && bun run dev
```

The API listens on **http://localhost:3001** by default. Check **http://localhost:3001/health** — it should return `{"ok":true}`.

### 6. Start the frontend

In a second terminal:

```bash
cd frontend && npm run dev
```

Vite serves the app at **http://localhost:5173**.

### 7. Smoke test in the browser

1. Open **http://localhost:5173**.
2. **Create account** / **Log in** (Supabase email auth).
3. On **Upload**, pick a PDF, add title and signer details, and **Send signature request**.
4. Open the signing link (or use the dashboard) and complete a signature.

If anything fails, confirm `CORS_ORIGIN` in `backend/.env` matches your Vite origin (default `http://localhost:5173`) and that storage bucket names match what the API expects (`documents`, `signed`).

## Submission & tooling (assessments)

- **Documentation:** Keep the README accurate and commit your work to a **Git** repository (initialize a new repo for the submission if the brief requires it). This repo includes a root **`.gitignore`** (e.g. `node_modules/`, `dist/`, `.env`); run `git init`, commit, and push to your submission remote as needed.
- **AI-assisted development:** Using coding agents or similar tools to build or refine this project is encouraged. **You are responsible** for reading, understanding, testing, and validating everything you submit—treat generated output as code you own.
- **Local run:** Reviewers should be able to follow **How to run locally** above without guesswork.

## Architecture

| Layer | Stack |
|--------|--------|
| API | [Bun](https://bun.sh/) + [Elysia](https://elysiajs.com/) (REST) |
| Web | [React](https://react.dev/) + [Vite](https://vitejs.dev/) |
| Data | [Supabase](https://supabase.com/) (Postgres + Storage) |
| PDF | [pdf-lib](https://pdf-lib.js.org/) (embed signature on server) |

```
<repo>/
├── backend/          # Elysia REST API (Bun)
├── frontend/         # React + Vite SPA
├── supabase/         # SQL migrations (run in Supabase SQL editor)
└── .github/workflows # CI: Vitest (frontend + backend)
```

Deploy later by hosting the SPA on any static host (Vercel, Netlify, S3+CloudFront) and the API on a Bun-friendly host (Fly.io, Railway, VPS) with environment variables set.

_Tool versions are listed under [How to run locally](#how-to-run-locally)._

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com/).
2. **SQL**: In the SQL editor, run `supabase/migrations/001_documents.sql`, then `002_requester_auth.sql` (adds `requester_id` for authenticated requesters).
3. **Auth**: In **Authentication → Providers**, ensure **Email** is enabled. For local demos you can disable **Confirm email** under Authentication → Providers → Email (so sign-up can sign in immediately).
4. **Password reset**: In **Authentication → URL Configuration**, add your app URLs to **Redirect URLs** (e.g. `http://localhost:5173/reset-password` for local dev and your production origin with `/reset-password`). The “Forgot password?” flow sends a link that must redirect to that route so the user can set a new password.
5. **Storage**: Create two public buckets (for MVP speed):
   - `documents` — original PDFs
   - `signed` — signed PDFs  
   (Alternatively use private buckets + signed URLs; the MVP uses public URLs stored in `pdf_url` / `signed_pdf_url`.)
6. **API keys**: In Project Settings → API, copy **Project URL**, **anon public** key (for the SPA + API JWT verification), and **service_role** for the backend only (never expose the service role in the browser).

SMS or phone OTP sign-in is not part of this MVP (it would need an SMS provider such as Twilio plus Supabase configuration).

## Environment variables

**`backend/.env`**

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-public-key
PORT=3001
CORS_ORIGIN=http://localhost:5173
PUBLIC_STORAGE_BASE=https://xxxx.supabase.co/storage/v1/object/public

# Optional — email signing link to signer (Resend)
# RESEND_API_KEY=re_...
# EMAIL_FROM=Jasign <onboarding@resend.dev>
# PUBLIC_APP_URL=https://your-spa.example.com
```

Use the **same** `SUPABASE_URL` as in the dashboard. `SUPABASE_ANON_KEY` is the **anon public** key; the API uses it only to validate `Authorization: Bearer <access_token>` from the React app (still uses the **service role** for storage and DB writes).

**Signer emails (optional):** set `RESEND_API_KEY` in `backend/.env` to send the signing link to the signer when you create a request ([Resend](https://resend.com)). For quick tests, use sender `Jasign <onboarding@resend.dev>` (leave `EMAIL_FROM` empty to use the default) and note Resend may only allow recipients allowed on your plan until you verify a domain. Set `EMAIL_FROM` to your verified domain address in production. Use `PUBLIC_APP_URL` if the link in emails must differ from `CORS_ORIGIN` (for example API on a subdomain and SPA elsewhere).

**`frontend/.env`**

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

The SPA signs in with Supabase Auth and sends the session access token to protected API routes.

## API routes (REST)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/upload` | **Auth:** Bearer JWT. Multipart `file` (PDF) → storage |
| `POST` | `/request-signature` | **Auth:** Bearer JWT. Creates row; optional Resend email to `signer_email`. Response includes `emailSent` |
| `GET` | `/document/:token` | Public (signing link). Metadata + `pdf_url`, pages, `status` |
| `POST` | `/submit-signature` | Public. Signer submits signature by `token` |
| `GET` | `/documents` | **Auth:** Bearer JWT. Lists documents for the signed-in requester |

## Tests (Vitest)

```bash
cd backend && bun run test
cd frontend && npm run test
```

CI runs on push/PR via `.github/workflows/ci.yml`.

## MVP notes

- Your **Jasign account** (email + password through Supabase) is how you upload PDFs and see everything you have sent in one place.
- **Signers** only open `/sign/:token` from the message or link you give them; they do not need to register.
- If **`RESEND_API_KEY`** is configured on the API, we can email that link to the signer automatically; you can always copy it from the app as well.
- `expired` status exists in the schema for future use.

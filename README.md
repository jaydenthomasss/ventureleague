# VentureLeague

A competitive business simulation game for high school students built with Next.js 14, Supabase, and Tailwind CSS.

## Deployment Guide

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New Project** and fill in your project name, password, and region.
3. Wait for the project to provision (~2 minutes).
4. Go to **Project Settings > API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 2 — Run the SQL Migration

1. In your Supabase dashboard, go to **SQL Editor**.
2. Click **New Query**.
3. Open the file `supabase/migrations/001_initial.sql` from this repo.
4. Paste the entire contents into the SQL editor.
5. Click **Run**. All tables, RLS policies, indexes, and realtime settings will be created.

### Step 3 — (Optional) Run Seed Data

The seed file at `supabase/seed.sql` includes demo data for 4 teams across 2 rounds.

> **Important:** Supabase auth users cannot be created via SQL. The user inserts in `seed.sql` are commented out by default. To use the seed data:
> 1. Create auth users via **Supabase Auth > Users > Invite user** (or via the app sign-up flow).
> 2. Note the UUIDs assigned by Supabase.
> 3. Replace the placeholder UUIDs in `seed.sql` with real UUIDs.
> 4. Uncomment the users INSERT block.
> 5. Run the seed SQL.

### Step 4 — Clone and Configure Environment

```bash
git clone https://github.com/your-username/ventureleague.git
cd ventureleague
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
ADMIN_SECRET_CODE=choose-a-secret-code-for-teachers
NEXT_PUBLIC_SITE_URL=https://your-vercel-app.vercel.app
```

> Keep `ADMIN_SECRET_CODE` secret. Teachers enter this during onboarding to get admin access. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

Test locally:
```bash
npm install
npm run dev
```

### Step 5 — Deploy to Vercel

1. Push this repo to GitHub (or import directly).
2. Go to [vercel.com](https://vercel.com) and click **New Project**.
3. Import your GitHub repository.
4. Under **Environment Variables**, add all variables from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_SECRET_CODE`
   - `NEXT_PUBLIC_SITE_URL` (set to your Vercel URL after first deploy)
5. Click **Deploy**. Vercel will build and deploy automatically.

### Step 6 — Share with Students

1. Share the Vercel URL with your students.
2. Students go to the URL, sign up, and enter their team join code during onboarding.
3. Teachers sign up, enter the admin code during onboarding, and access `/admin`.

---

## Game Flow

### For Teachers (Admin Panel at `/admin`)

1. **Create a session** — Name your class session (e.g. "Spring 2025 — Period 3").
2. **Create teams** — Add teams with unique join codes (e.g. `ALPHA01`).
3. **Set a scenario** — Write a market description and optionally adjust demand multiplier and cost shock.
4. **Open submissions** — Click "Open Submissions" to let students submit decisions.
5. **Monitor progress** — Watch the submission counter to see who has submitted.
6. **Close submissions** — Click "Close Submissions" when ready.
7. **Calculate results** — Click "Calculate Results" to run the simulation. Results are stored and the round advances automatically.
8. **Review and export** — View per-round results in the Results tab. Export CSV for grading.

### For Students (Dashboard at `/dashboard`)

1. Sign up and enter your team join code during onboarding.
2. When submissions open, set your:
   - **Price** ($1–$200 slider)
   - **Marketing spend** ($0–$5,000 slider)
   - **Units to produce** (0–1,000 slider)
3. Write a 1–2 sentence pitch explaining your strategy.
4. Submit. You can update until the teacher closes submissions.
5. View your performance charts and the live leaderboard.

### Public Leaderboard at `/leaderboard`

The leaderboard is publicly accessible (no login required) and auto-refreshes every 30 seconds via Supabase Realtime. Project it on a screen during class.

---

## Simulation Logic

```
base_demand = 500
price_sensitivity = 1.5
fair_price = 50

demand = base_demand x (fair_price^1.5 / price^1.5) x (1 + marketing_spend/1000) x demand_multiplier
units_sold = min(units_produced, demand)
revenue = units_sold x price
cost_per_unit = 20 + cost_shock
total_costs = (units_produced x cost_per_unit) + marketing_spend
profit = revenue - total_costs
market_share = team_units_sold / total_units_sold_all_teams
```

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL + Realtime)
- **Auth:** Supabase Auth
- **Styling:** Tailwind CSS + tailwindcss-animate
- **UI Components:** Radix UI primitives (shadcn-style)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Deployment:** Vercel

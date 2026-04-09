-- VentureLeague Initial Schema Migration
-- Run this in the Supabase SQL editor to initialize the database.

-- ============================================================
-- TABLES
-- ============================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  team_id     UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  current_round    INT NOT NULL DEFAULT 1,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_by       UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  submissions_open BOOLEAN NOT NULL DEFAULT FALSE
);

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  join_code    TEXT UNIQUE NOT NULL,
  cash_balance NUMERIC NOT NULL DEFAULT 10000,
  session_id   UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE
);

-- Add foreign key from users to teams after both tables exist
ALTER TABLE public.users
  ADD CONSTRAINT users_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- Scenarios table
CREATE TABLE IF NOT EXISTS public.scenarios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  round_number      INT NOT NULL,
  description       TEXT NOT NULL,
  demand_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  cost_shock        NUMERIC NOT NULL DEFAULT 0,
  UNIQUE (session_id, round_number)
);

-- Decisions table
CREATE TABLE IF NOT EXISTS public.decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  round_number    INT NOT NULL,
  price           NUMERIC NOT NULL,
  marketing_spend NUMERIC NOT NULL,
  units_produced  INT NOT NULL,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, round_number)
);

-- Round results table
CREATE TABLE IF NOT EXISTS public.round_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id          UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  round_number     INT NOT NULL,
  units_sold       NUMERIC NOT NULL,
  revenue          NUMERIC NOT NULL,
  costs            NUMERIC NOT NULL,
  profit           NUMERIC NOT NULL,
  market_share     NUMERIC NOT NULL,
  cumulative_profit NUMERIC NOT NULL,
  UNIQUE (team_id, round_number)
);

-- Pitches table
CREATE TABLE IF NOT EXISTS public.pitches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  pitch_text   TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, round_number)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitches ENABLE ROW LEVEL SECURITY;

-- ---- USERS policies ----

-- Users can read their own row
CREATE POLICY "users_read_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own row
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Service role can do everything (bypasses RLS automatically)

-- ---- SESSIONS policies ----

-- All authenticated users can read sessions
CREATE POLICY "sessions_read_authenticated"
  ON public.sessions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only teachers can create sessions
CREATE POLICY "sessions_insert_teacher"
  ON public.sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Only the teacher who created it can update
CREATE POLICY "sessions_update_teacher"
  ON public.sessions FOR UPDATE
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- ---- TEAMS policies ----

-- All authenticated users can read teams (they need to see other teams for leaderboard)
CREATE POLICY "teams_read_authenticated"
  ON public.teams FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only teachers can create teams
CREATE POLICY "teams_insert_teacher"
  ON public.teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Only teachers can update teams
CREATE POLICY "teams_update_teacher"
  ON public.teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- ---- SCENARIOS policies ----

-- All authenticated users can read scenarios
CREATE POLICY "scenarios_read_authenticated"
  ON public.scenarios FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only teachers can write scenarios
CREATE POLICY "scenarios_write_teacher"
  ON public.scenarios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- ---- DECISIONS policies ----

-- Students can read/write their own team's decisions
CREATE POLICY "decisions_read_own_team"
  ON public.decisions FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "decisions_write_own_team"
  ON public.decisions FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "decisions_update_own_team"
  ON public.decisions FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.users WHERE id = auth.uid()
    )
  );

-- ---- ROUND_RESULTS policies ----

-- Publicly readable (leaderboard page has no auth requirement)
CREATE POLICY "round_results_read_public"
  ON public.round_results FOR SELECT
  USING (true);

-- Only service role can insert/update (enforced at API level, service role bypasses RLS)

-- ---- PITCHES policies ----

-- Students can read/write their own team's pitches
CREATE POLICY "pitches_write_own_team"
  ON public.pitches FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "pitches_update_own_team"
  ON public.pitches FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Teachers can read all pitches; students can read their own
CREATE POLICY "pitches_read"
  ON public.pitches FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- ============================================================
-- REALTIME
-- ============================================================

-- Enable realtime on sessions table (for round open/close events)
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;

-- Enable realtime on round_results table (for leaderboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.round_results;

-- ============================================================
-- INDEXES for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_team_id ON public.users(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_session_id ON public.teams(session_id);
CREATE INDEX IF NOT EXISTS idx_teams_join_code ON public.teams(join_code);
CREATE INDEX IF NOT EXISTS idx_scenarios_session_round ON public.scenarios(session_id, round_number);
CREATE INDEX IF NOT EXISTS idx_decisions_team_round ON public.decisions(team_id, round_number);
CREATE INDEX IF NOT EXISTS idx_round_results_team_round ON public.round_results(team_id, round_number);
CREATE INDEX IF NOT EXISTS idx_pitches_team_round ON public.pitches(team_id, round_number);

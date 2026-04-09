-- VentureLeague Seed Data
-- ============================================================
-- NOTE: These are demo records only.
--
-- Auth users CANNOT be created via SQL — they must be created
-- through Supabase Auth (Dashboard > Authentication > Users, or
-- via supabase.auth.signUp() in the app).
--
-- To use this seed data:
-- 1. Create a real auth user via Supabase Auth for the teacher
-- 2. Replace the teacher UUID below with the real auth.users ID
-- 3. Create 4 student auth users and note their UUIDs
-- 4. Replace the student UUIDs in the users inserts below
--
-- The placeholder UUIDs below are for illustration only and will
-- fail foreign key constraints unless real auth users exist.
-- ============================================================

-- Placeholder UUIDs (replace with real auth.users IDs)
-- Teacher: 00000000-0000-0000-0000-000000000001
-- Student Alpha1: 00000000-0000-0000-0000-000000000002
-- Student Beta1:  00000000-0000-0000-0000-000000000003
-- Student Gamma1: 00000000-0000-0000-0000-000000000004
-- Student Delta1: 00000000-0000-0000-0000-000000000005

-- ============================================================
-- SESSION
-- ============================================================

INSERT INTO public.sessions (id, name, current_round, status, created_by, submissions_open)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Demo Season 1',
  3,
  'active',
  '00000000-0000-0000-0000-000000000001', -- teacher
  false
);

-- ============================================================
-- TEAMS
-- ============================================================

INSERT INTO public.teams (id, name, join_code, cash_balance, session_id)
VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Alpha',  'ALPHA01', 10000, 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Beta',   'BETA01',  10000, 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'Gamma',  'GAMMA01', 10000, 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'Delta',  'DELTA01', 10000, 'aaaaaaaa-0000-0000-0000-000000000001');

-- ============================================================
-- USERS (comment out if auth users don't exist yet)
-- ============================================================

-- INSERT INTO public.users (id, email, name, role, team_id)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', 'teacher@school.edu',  'Ms. Rivera',  'teacher', NULL),
--   ('00000000-0000-0000-0000-000000000002', 'alpha1@school.edu',   'Alex Chen',   'student', 'bbbbbbbb-0000-0000-0000-000000000001'),
--   ('00000000-0000-0000-0000-000000000003', 'beta1@school.edu',    'Jordan Kim',  'student', 'bbbbbbbb-0000-0000-0000-000000000002'),
--   ('00000000-0000-0000-0000-000000000004', 'gamma1@school.edu',   'Sam Patel',   'student', 'bbbbbbbb-0000-0000-0000-000000000003'),
--   ('00000000-0000-0000-0000-000000000005', 'delta1@school.edu',   'Maya Torres', 'student', 'bbbbbbbb-0000-0000-0000-000000000004');

-- ============================================================
-- SCENARIOS
-- ============================================================

INSERT INTO public.scenarios (id, session_id, round_number, description, demand_multiplier, cost_shock)
VALUES
  (
    'cccccccc-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    1,
    'The market is brand new and consumer awareness is low. Your primary challenge is building brand recognition while managing costs carefully.',
    1.0,
    0
  ),
  (
    'cccccccc-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000001',
    2,
    'A viral social media trend has boosted demand for your product category by 50%. However, supply chain disruptions have raised raw material costs.',
    1.5,
    5
  );

-- ============================================================
-- DECISIONS (Rounds 1 and 2)
-- ============================================================

-- Round 1 decisions
INSERT INTO public.decisions (id, team_id, round_number, price, marketing_spend, units_produced)
VALUES
  ('dddddddd-0000-0000-0000-000000000101', 'bbbbbbbb-0000-0000-0000-000000000001', 1, 55.00, 1000, 300),
  ('dddddddd-0000-0000-0000-000000000102', 'bbbbbbbb-0000-0000-0000-000000000002', 1, 45.00, 2000, 400),
  ('dddddddd-0000-0000-0000-000000000103', 'bbbbbbbb-0000-0000-0000-000000000003', 1, 60.00, 500,  250),
  ('dddddddd-0000-0000-0000-000000000104', 'bbbbbbbb-0000-0000-0000-000000000004', 1, 40.00, 1500, 500);

-- Round 2 decisions
INSERT INTO public.decisions (id, team_id, round_number, price, marketing_spend, units_produced)
VALUES
  ('dddddddd-0000-0000-0000-000000000201', 'bbbbbbbb-0000-0000-0000-000000000001', 2, 52.00, 1500, 350),
  ('dddddddd-0000-0000-0000-000000000202', 'bbbbbbbb-0000-0000-0000-000000000002', 2, 48.00, 2500, 450),
  ('dddddddd-0000-0000-0000-000000000203', 'bbbbbbbb-0000-0000-0000-000000000003', 2, 58.00, 800,  280),
  ('dddddddd-0000-0000-0000-000000000204', 'bbbbbbbb-0000-0000-0000-000000000004', 2, 42.00, 1800, 550);

-- ============================================================
-- ROUND RESULTS
-- ============================================================
-- These are pre-calculated for demonstration. In production,
-- use the /api/calculate-results endpoint to generate them.

-- Round 1 results
-- Alpha:  price=55, mkt=1000, produced=300 → demand≈453, sold=300, rev=16500, costs=7000, profit=9500
-- Beta:   price=45, mkt=2000, produced=400 → demand≈741, sold=400, rev=18000, costs=10000, profit=8000
-- Gamma:  price=60, mkt=500,  produced=250 → demand≈344, sold=250, rev=15000, costs=5500, profit=9500
-- Delta:  price=40, mkt=1500, produced=500 → demand≈934, sold=500, rev=20000, costs=11500, profit=8500
-- Total sold: 1450

INSERT INTO public.round_results (id, team_id, round_number, units_sold, revenue, costs, profit, market_share, cumulative_profit)
VALUES
  ('eeeeeeee-0000-0000-0000-000000000101', 'bbbbbbbb-0000-0000-0000-000000000001', 1, 300, 16500,  7000,  9500, 0.2069, 9500),
  ('eeeeeeee-0000-0000-0000-000000000102', 'bbbbbbbb-0000-0000-0000-000000000002', 1, 400, 18000,  10000, 8000, 0.2759, 8000),
  ('eeeeeeee-0000-0000-0000-000000000103', 'bbbbbbbb-0000-0000-0000-000000000003', 1, 250, 15000,  5500,  9500, 0.1724, 9500),
  ('eeeeeeee-0000-0000-0000-000000000104', 'bbbbbbbb-0000-0000-0000-000000000004', 1, 500, 20000,  11500, 8500, 0.3448, 8500);

-- Round 2 results (demand_multiplier=1.5, cost_shock=+5 → cost=25/unit)
-- Alpha:  price=52, mkt=1500, produced=350 → demand≈731*1.5≈1097, sold=350, rev=18200, costs=10250, profit=7950
-- Beta:   price=48, mkt=2500, produced=450 → demand≈971*1.5≈1457, sold=450, rev=21600, costs=13750, profit=7850
-- Gamma:  price=58, mkt=800,  produced=280 → demand≈530*1.5≈795,  sold=280, rev=16240, costs=7800,  profit=8440
-- Delta:  price=42, mkt=1800, produced=550 → demand≈1084*1.5≈1626, sold=550, rev=23100, costs=15550, profit=7550
-- Total sold: 1630

INSERT INTO public.round_results (id, team_id, round_number, units_sold, revenue, costs, profit, market_share, cumulative_profit)
VALUES
  ('eeeeeeee-0000-0000-0000-000000000201', 'bbbbbbbb-0000-0000-0000-000000000001', 2, 350, 18200,  10250, 7950, 0.2147, 17450),
  ('eeeeeeee-0000-0000-0000-000000000202', 'bbbbbbbb-0000-0000-0000-000000000002', 2, 450, 21600,  13750, 7850, 0.2761, 15850),
  ('eeeeeeee-0000-0000-0000-000000000203', 'bbbbbbbb-0000-0000-0000-000000000003', 2, 280, 16240,  7800,  8440, 0.1718, 17940),
  ('eeeeeeee-0000-0000-0000-000000000204', 'bbbbbbbb-0000-0000-0000-000000000004', 2, 550, 23100,  15550, 7550, 0.3374, 16050);

-- ============================================================
-- PITCHES
-- ============================================================

INSERT INTO public.pitches (id, team_id, round_number, pitch_text)
VALUES
  ('ffffffff-0000-0000-0000-000000000101', 'bbbbbbbb-0000-0000-0000-000000000001', 1, 'We priced above fair value to capture a premium margin, betting that our quality reputation would sustain demand. We kept marketing lean to protect costs.'),
  ('ffffffff-0000-0000-0000-000000000102', 'bbbbbbbb-0000-0000-0000-000000000002', 1, 'We went aggressive on marketing spend to capture market share early, pricing slightly below fair value to drive volume and build a loyal customer base.'),
  ('ffffffff-0000-0000-0000-000000000103', 'bbbbbbbb-0000-0000-0000-000000000003', 1, 'Our high-price, low-marketing strategy targets efficiency — fewer units sold but at a better margin, keeping costs minimal for maximum profit.'),
  ('ffffffff-0000-0000-0000-000000000104', 'bbbbbbbb-0000-0000-0000-000000000004', 1, 'We deployed a volume strategy: low price point with strong marketing to maximize units sold, accepting thinner margins in exchange for dominant market share.'),
  ('ffffffff-0000-0000-0000-000000000201', 'bbbbbbbb-0000-0000-0000-000000000001', 2, 'With the viral trend boosting demand, we slightly lowered our price and increased marketing to capture the wave while managing the supply cost increase.'),
  ('ffffffff-0000-0000-0000-000000000202', 'bbbbbbbb-0000-0000-0000-000000000002', 2, 'We doubled down on marketing during the demand surge, sacrificing some margin to lock in market share before competitors can react.'),
  ('ffffffff-0000-0000-0000-000000000203', 'bbbbbbbb-0000-0000-0000-000000000003', 2, 'Despite cost shocks, we maintained premium positioning. Our conservative approach protected profitability even as the market got noisier.'),
  ('ffffffff-0000-0000-0000-000000000204', 'bbbbbbbb-0000-0000-0000-000000000004', 2, 'We leaned into the demand surge with an aggressive volume play — higher production and strong marketing spend to own the largest slice of an expanding market.');

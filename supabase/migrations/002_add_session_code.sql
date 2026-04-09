-- Migration: Add session_code to sessions and session_id to users
-- Run this in the Supabase SQL editor AFTER 001_initial.sql

-- Add session_code column to sessions (short unique room code teachers share)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS session_code TEXT UNIQUE;

-- Add session_id to users so unassigned students can still be linked to a session
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL;

-- Index for fast lookup by room code
CREATE INDEX IF NOT EXISTS idx_sessions_session_code ON public.sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_users_session_id ON public.users(session_id);

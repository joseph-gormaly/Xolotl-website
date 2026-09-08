-- ==============================================================================
-- XOLOTL CANADIAN SHIELD COOPERATIVE — BETA SIGNUPS SCHEMA & RLS POLICIES
-- ==============================================================================
-- Run this SQL in your Supabase Project: Dashboard -> SQL Editor -> New Query
-- ==============================================================================

-- 1. Create the Beta Signups Table
CREATE TABLE IF NOT EXISTS public.beta_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    platform TEXT DEFAULT 'all',              -- 'macos_arm', 'macos_intel', 'windows', 'linux_x86', 'linux_arm', 'other'
    interest_type TEXT DEFAULT 'individual',   -- 'privacy_advocate', 'developer_node', 'legal_mna', 'defense_sec', 'enterprise'
    city TEXT,
    region TEXT,                               -- Province or State (e.g. 'Manitoba', 'Quebec')
    country TEXT,                              -- e.g. 'Canada', 'Switzerland'
    country_code TEXT,                         -- e.g. 'CA', 'CH', 'IS'
    latitude NUMERIC(8, 4),                    -- Coarse location (~1km radius) for privacy
    longitude NUMERIC(8, 4),
    detected_timezone TEXT,                    -- e.g. 'America/Winnipeg'
    language TEXT DEFAULT 'en',                -- 'en', 'fr', 'es'
    notes TEXT,                                -- Why data sovereignty matters / custom requirements
    node_badge_id TEXT,                        -- Generated Node ID e.g. 'NODE-CA-7F2A'
    status TEXT DEFAULT 'waitlist',            -- 'waitlist', 'approved', 'invited', 'active'
    ip_address INET                            -- Coarse client IP (optional)
);

-- 2. Create Indexes for Quick Retrieval and Analytics
CREATE INDEX IF NOT EXISTS idx_beta_signups_email ON public.beta_signups (email);
CREATE INDEX IF NOT EXISTS idx_beta_signups_country ON public.beta_signups (country_code);
CREATE INDEX IF NOT EXISTS idx_beta_signups_created_at ON public.beta_signups (created_at DESC);

-- 3. Enable Row-Level Security (RLS)
-- Crucial for a privacy-first platform: prevents any anonymous public user or scraper
-- from reading other participants' emails, names, or locations.
ALTER TABLE public.beta_signups ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Allow Anonymous / Public Insertion
-- Enables your static website frontend to submit new waitlist signups using the public anon key.
DROP POLICY IF EXISTS "Allow anonymous beta signup insert" ON public.beta_signups;
CREATE POLICY "Allow anonymous beta signup insert"
ON public.beta_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 5. Policy: Deny Anonymous / Public Read Access
-- Guarantees that public website visitors cannot query or scrape existing waitlist entries.
DROP POLICY IF EXISTS "Deny anonymous beta signup read" ON public.beta_signups;
CREATE POLICY "Deny anonymous beta signup read"
ON public.beta_signups
FOR SELECT
TO anon
USING (false);

-- 6. Policy: Authenticated Admins / Service Role Full Access
-- Supabase Dashboard authenticated users or service_role can view, export, and update records.
DROP POLICY IF EXISTS "Allow service role full access" ON public.beta_signups;
CREATE POLICY "Allow service role full access"
ON public.beta_signups
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- VERIFICATION QUERY
-- Run after execution to confirm table and RLS posture:
-- ==============================================================================
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'beta_signups';

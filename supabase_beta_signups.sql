-- ==============================================================================
-- XOLOTL CANADIAN SHIELD COOPERATIVE — BETA SIGNUPS SCHEMA & RLS POLICIES
-- ==============================================================================
-- Run this SQL in your Supabase Project: Dashboard -> SQL Editor -> New Query
-- It is completely idempotent (safe to run multiple times).
-- ==============================================================================

-- 1. Create the Beta Signups Table
CREATE TABLE IF NOT EXISTS public.beta_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    platform TEXT DEFAULT 'all',              -- 'macos_arm', 'macos_intel', 'windows', 'linux_x86', 'linux_arm', 'other'
    interest_type TEXT DEFAULT 'individual',   -- 'privacy_advocate', 'developer_node', 'legal_mna', 'defense_sec', 'enterprise'
    city TEXT,
    region TEXT,                               -- Province or State (e.g. 'Manitoba', 'Quebec')
    country TEXT,                              -- e.g. 'Canada', 'Switzerland'
    country_code TEXT,                         -- e.g. 'CA', 'CH', 'IS'
    latitude NUMERIC(6, 2),                    -- Coarse location (~1km radius) for privacy —
    longitude NUMERIC(6, 2),                   -- enforced at the column, not just the client:
                                                -- NUMERIC(8,4) previously allowed ~11m resolution,
                                                -- far finer than "coarse" — 2 decimals is what
                                                -- actually delivers ~1km (0.01 degree latitude).
    detected_timezone TEXT,                    -- e.g. 'America/Winnipeg'
    language TEXT DEFAULT 'en',                -- 'en', 'fr', 'es'
    notes TEXT,                                -- Why data sovereignty matters / custom requirements
    node_badge_id TEXT,                        -- Generated Node ID e.g. 'NODE-CA-7F2A'
    status TEXT DEFAULT 'waitlist',            -- 'waitlist', 'approved', 'invited', 'active'
    ip_address INET                            -- Coarse client IP (optional)
);

-- 1b. Narrow an already-deployed table's coordinate precision to match.
-- CREATE TABLE IF NOT EXISTS is a no-op against a table that already exists,
-- so on a live project this ALTER is what actually applies the NUMERIC(6,2)
-- tightening from NUMERIC(8,4) — idempotent, and safe to re-run (rounding an
-- already-rounded value to the same precision is a no-op).
--
-- The view has to go first: Postgres refuses to change a column's type while
-- a view's rule still depends on it (a live re-run of this file hit exactly
-- that — 0A000, "cannot alter type of a column used by a view or rule").
-- Section 9 below recreates it with CREATE OR REPLACE VIEW, so dropping it
-- here is safe and this file stays idempotent end to end.
DROP VIEW IF EXISTS public.beta_nodes_geographic_distribution;

ALTER TABLE public.beta_signups ALTER COLUMN latitude TYPE NUMERIC(6, 2);
ALTER TABLE public.beta_signups ALTER COLUMN longitude TYPE NUMERIC(6, 2);

-- 2. Performance & Retrieval Indexes
CREATE INDEX IF NOT EXISTS idx_beta_signups_email ON public.beta_signups (email);
CREATE INDEX IF NOT EXISTS idx_beta_signups_country ON public.beta_signups (country_code);
CREATE INDEX IF NOT EXISTS idx_beta_signups_status ON public.beta_signups (status);
CREATE INDEX IF NOT EXISTS idx_beta_signups_created_at ON public.beta_signups (created_at DESC);

-- 3. Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION public.handle_beta_signups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_beta_signups_updated_at ON public.beta_signups;
CREATE TRIGGER tr_beta_signups_updated_at
BEFORE UPDATE ON public.beta_signups
FOR EACH ROW
EXECUTE FUNCTION public.handle_beta_signups_updated_at();

-- 4. Enable Row-Level Security (RLS)
-- Crucial for privacy: prevents any anonymous public user or scraper
-- from reading other participants' emails, names, or locations.
ALTER TABLE public.beta_signups ENABLE ROW LEVEL SECURITY;

-- 5. Explicit Postgres Permissions (Required for Supabase PostgREST API)
-- Ensures the anonymous role has table-level permission to insert records.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT ON TABLE public.beta_signups TO anon, authenticated;
GRANT ALL ON TABLE public.beta_signups TO service_role;

-- 6. Policy: Allow Anonymous / Public Insertion
-- Enables your static website frontend to submit new waitlist signups using the public anon key.
DROP POLICY IF EXISTS "Allow anonymous beta signup insert" ON public.beta_signups;
CREATE POLICY "Allow anonymous beta signup insert"
ON public.beta_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 7. Policy: Deny Anonymous / Public Read Access
-- Guarantees that public website visitors cannot query or scrape existing waitlist entries.
DROP POLICY IF EXISTS "Deny anonymous beta signup read" ON public.beta_signups;
CREATE POLICY "Deny anonymous beta signup read"
ON public.beta_signups
FOR SELECT
TO anon
USING (false);

-- 8. Policy: Authenticated Admins / Service Role Full Access
-- Supabase Dashboard authenticated users or service_role can view, export, and update records.
DROP POLICY IF EXISTS "Allow service role full access" ON public.beta_signups;
CREATE POLICY "Allow service role full access"
ON public.beta_signups
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 9. Geographic Node Distribution Analytics View (For Dashboards)
-- Query this in your Supabase SQL editor to see community node clusters:
--
-- No minimum group size here (deliberate — reverted 2026-09-13; an earlier
-- version of this view had HAVING COUNT(*) >= 3, which correctly suppressed
-- small/single-signup city buckets but also left the public network map
-- empty until a city crossed that threshold). The one remaining privacy
-- layer is §1's NUMERIC(6,2) coordinate coarsening (~1km, not the ~11m the
-- schema briefly allowed) — meaningfully coarser than before, but a city
-- with exactly one signup is still individually identifiable at ~1km
-- resolution on this public, unauthenticated endpoint. Revisit the
-- threshold once real signups are common enough that an empty map isn't
-- the tradeoff.
CREATE OR REPLACE VIEW public.beta_nodes_geographic_distribution AS
SELECT
    COALESCE(country, 'Unknown') AS country,
    COALESCE(country_code, '??') AS country_code,
    COALESCE(region, 'Unknown') AS region,
    COALESCE(city, 'Unknown') AS city,
    COUNT(*) AS total_nodes,
    ROUND(AVG(latitude), 2) AS avg_latitude,
    ROUND(AVG(longitude), 2) AS avg_longitude,
    MAX(created_at) AS latest_node_enlisted
FROM public.beta_signups
GROUP BY country, country_code, region, city
ORDER BY total_nodes DESC;

-- Grant read access on analytics view to public anon and authenticated roles
-- (Exposes coarse ~1km city-level location, country, count, and last-signup
-- timestamp. Zero emails, names, or IPs. No minimum group size — see above.)
GRANT SELECT ON public.beta_nodes_geographic_distribution TO anon, authenticated, service_role;

-- ==============================================================================
-- VERIFICATION QUERIES (Run to verify setup)
-- ==============================================================================
-- 1. Check Table & RLS status:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'beta_signups';
--
-- 2. Test Node Distribution View:
-- SELECT * FROM public.beta_nodes_geographic_distribution;

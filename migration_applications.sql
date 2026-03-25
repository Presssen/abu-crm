-- ============================================================
-- Migration: Internship Application System
-- Public application form with CV upload and internal review
-- ============================================================

-- 1. Create applications table
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    has_computer BOOLEAN NOT NULL DEFAULT false,
    has_phone BOOLEAN NOT NULL DEFAULT false,
    work_mode TEXT NOT NULL DEFAULT 'remote', -- 'remote', 'onsite', 'both'
    cv_url TEXT,
    video_url TEXT,
    linkedin_url TEXT,
    cover_letter TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'accepted', 'rejected'
    notes TEXT, -- Internal notes from reviewers
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Anyone can submit an application (public/anon)
CREATE POLICY "Anyone can submit applications" ON applications
    FOR INSERT WITH CHECK (true);

-- Only authenticated users can view applications
CREATE POLICY "Authenticated users can view applications" ON applications
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only authenticated users can update applications (change status, add notes)
CREATE POLICY "Authenticated users can update applications" ON applications
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. Create storage bucket for CVs (run this in Supabase Dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('applications-cv', 'applications-cv', true);

-- 5. Index for listing applications
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);

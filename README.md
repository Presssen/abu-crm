# ABU CRM

A modern, minimalist CRM built with Next.js 14+, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Authentication**: Email/Password login, Signup, Forgot Password using Supabase Auth.
- **Lead Management**: Complete leads table with search, filtering, and status management.
- **Pipeline Kanban**: Visual sales pipeline to track opportunities through stages.
- **Excel/CSV Import**: Multi-step wizard to import leads from files with column mapping and deduplication.
- **Activities & Meetings**: Task management and a weekly calendar view for scheduling.
- **Emails**: Email logging and template management system.
- **Role-Based Access Control (RBAC)**: Secure `/admin` routes and owner-based RLS for data privacy.
- **Premium UI**: Modern, responsive interface built with Tailwind CSS and Lucide icons.

## Architecture

- **Frontend**: Next.js 14+ (App Router), React 19, Tailwind CSS.
- **Database**: Supabase (PostgreSQL) with RLS for security.
- **Storage**: Supabase Storage for storing imported files.
- **State Management**: React Hooks (useState, useEffect) for component-level state.
- **File Parsing**: `xlsx` and `papaparse` for handling Excel/CSV imports.

## Prerequisites

- Node.js 18+
- npm
- A Supabase project

## Installation

1. **Clone the repository** (or navigate to directory):
   ```bash
   cd abu-crm
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Rename `.env.local.example` (or create `.env.local`) and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://hneahfufowjmfxfkjwtd.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```
   > **Note**: Obtain the `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase Project Settings > API.

## Database Setup

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open the **SQL Editor**.
3. Copy and paste the contents of `supabase_setup.sql` into the editor.
4. Run the script. This will:
   - Create the `profiles` table.
   - Enable RLS and add security policies.
   - Set up the `on_auth_user_created` trigger to automatically create user profiles.
   - Create helper functions.

## Running Locally

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment on Vercel

1. Push your code to a Git repository (GitHub/GitLab/Bitbucket).
2. Import the project in Vercel.
3. In the Vercel **Project Settings > Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## Auth Configuration

Ensure your Supabase Auth settings are configured correctly:
- **Site URL**: `http://localhost:3000` (for local dev) or your Vercel production URL.
- **Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - `https://your-project.vercel.app/auth/callback`

## How to Make a User an Admin

By default, all new users have the `user` role. To make a user an admin:

1. Sign up the user in the app.
2. Go to Supabase Dashboard > **Table Editor** > `profiles`.
3. Find the user and change the `role` column from `user` to `admin`.
4. The user can now access `/admin`.

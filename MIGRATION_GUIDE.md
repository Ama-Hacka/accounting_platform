# Production Migration Guide: IC Multi Services

This guide walks you through migrating the Next.js app to a **new Supabase project** + **Vercel** deployment.

---

## 🔐 Security Reminders

1. **Rotate the old service role key** – it was exposed; treat it as compromised.
2. **Never commit `.env` files** or expose keys in chat/logs.
3. Both storage buckets (`documents`, `tax_returns`) are **private** – no public access.
4. Admin roles (`owner`, `admin`, `staff`) require `@icmultiservices.com` email (enforced by DB trigger).

---

## Step 1: Create New Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose organization, set:
   - **Name**: `icms-production` (or similar)
   - **Database Password**: Generate a strong password (save it securely!)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
4. Click **Create new project** and wait for provisioning (~2 min)

---

## Step 2: Run the Database Migration

1. In your new Supabase project, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/production_setup.sql`
4. Paste into the SQL Editor
5. Click **Run** (or Cmd/Ctrl + Enter)
6. Verify: Go to **Table Editor** – you should see:
   - `profiles`
   - `staff_clients`
   - `user_documents`
   - `tax_returns`
   - `audit_logs`
   - `account_recovery_requests`

7. Go to **Storage** – you should see two private buckets:
   - `documents`
   - `tax_returns`

---

## Step 3: Deploy Edge Function (upload-tax-return)

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if you haven't
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link to your NEW project (get ref from Project Settings > General)
supabase link --project-ref YOUR_NEW_PROJECT_REF

# Deploy the function
supabase functions deploy upload-tax-return --no-verify-jwt
```

### Option B: Via Dashboard

1. Go to **Edge Functions** in dashboard
2. Click **Create a new function**
3. Name it `upload-tax-return`
4. Copy contents of `supabase/functions/upload-tax-return/index.ts`
5. Deploy

---

## Step 4: Get Your New Supabase Keys

In your Supabase dashboard, go to **Settings > API**:

| Key | Where to find | Purpose |
|-----|---------------|---------|
| `Project URL` | Settings > API > Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon public` | Settings > API > Project API keys | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` | Settings > API > Project API keys | `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secret!) |

---

## Step 5: Configure Supabase Auth

1. Go to **Authentication > Providers** and enable **Email**
2. Go to **Authentication > URL Configuration**:
   - **Site URL**: `https://your-vercel-domain.vercel.app` (or custom domain)
   - **Redirect URLs**: Add:
     - `https://your-vercel-domain.vercel.app/auth/callback`
     - `https://your-vercel-domain.vercel.app/dashboard`
     - `http://localhost:3000/**` (for local dev)

3. (Optional) Go to **Authentication > Email Templates** to customize signup/reset emails.

---

## Step 6: Deploy to Vercel

### 6.1 Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Select the `MVP(DEMO)` folder as root (or adjust if needed)

### 6.2 Configure Environment Variables

In Vercel project settings, add these environment variables:

| Name | Value | Notes |
|------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | From Step 4 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | ⚠️ Server-only, never expose |

### 6.3 Deploy

1. Click **Deploy**
2. Wait for build to complete
3. Note your Vercel URL (e.g., `https://icms-demo.vercel.app`)

### 6.4 Update Supabase Auth URLs

Go back to Supabase **Authentication > URL Configuration** and update:
- **Site URL**: Your Vercel production URL
- **Redirect URLs**: Add your production URL patterns

---

## Step 7: Create Your First Admin User

1. Go to your deployed app and **Sign Up** with an `@icmultiservices.com` email
2. Verify the email
3. Run this in Supabase SQL Editor to make yourself an owner:

```sql
UPDATE public.profiles 
SET role = 'owner' 
WHERE email = 'youremail@icmultiservices.com';
```

Now you can access `/admin` routes and manage the firm.

---

## Step 8: (Optional) Set Up Custom Domain

### Vercel Custom Domain
1. Go to Vercel project > **Settings > Domains**
2. Add your domain (e.g., `app.icmultiservices.com`)
3. Configure DNS as instructed

### Supabase Custom Domain (Pro plan)
1. Go to Supabase **Settings > Custom Domains**
2. Follow setup for your API domain

---

## Local Development Setup

Create `.env.local` (gitignored):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Run locally:
```bash
npm install
npm run dev
```

---

## Security Checklist

- [ ] Old Supabase service role key rotated
- [ ] New keys stored securely (not in Git)
- [ ] `.env` and `.env.local` in `.gitignore`
- [ ] Storage buckets set to private
- [ ] RLS enabled on all tables
- [ ] Admin domain enforcement trigger active
- [ ] Site URL and redirect URLs configured in Supabase Auth
- [ ] HTTPS enabled (automatic on Vercel)

---

## Troubleshooting

### "Admin roles require @icmultiservices.com email"
The `enforce_admin_domain` trigger blocks non-firm emails from getting admin roles. Use a valid firm email.

### RLS policy errors
Check that:
1. The user is authenticated
2. The `is_admin()` function exists and works
3. Profile exists for the user (should auto-create on signup)

### Storage upload fails
1. Verify bucket exists and is private
2. Check storage policies are created
3. Ensure file path follows `{user_id}/...` pattern

### Edge Function returns 403
The function checks:
1. Valid JWT token
2. User has `owner` or `staff` role
3. Email ends with `@icmultiservices.com`
4. Staff must be assigned to the client

---

## Files Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/production_setup.sql` | Complete DB schema + RLS |
| `supabase/functions/upload-tax-return/index.ts` | Edge function for tax return uploads |
| `src/lib/supabaseClient.ts` | Browser Supabase client |
| `src/lib/supabaseAdmin.ts` | Server-side admin client |

---

Good luck with your production deployment! 🚀

# SkillSwap — Deployment Guide

> Complete guide for deploying the SkillSwap application to production.

## 📋 Prerequisites

- Node.js 20+ 
- Supabase CLI (`npm i -g supabase`)
- Access to Supabase project dashboard
- Redis instance (for Express server)

## 🔐 Environment Variables

### Client-Side (Vite — `VITE_` prefix required)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJhbG...` |
| `VITE_LIVEKIT_URL` | LiveKit WebSocket URL | `wss://xxx.livekit.cloud` |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN (optional) | `https://xxx@sentry.io/xxx` |

### Server-Side (Express — `.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Express server port | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Yes |
| `LIVEKIT_API_KEY` | LiveKit API key | Yes |
| `LIVEKIT_API_SECRET` | LiveKit API secret | Yes |
| `LIVEKIT_URL` | LiveKit server URL | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins | Yes |
| `NODE_ENV` | `production` or `development` | Yes |

> ⚠️ **NEVER** commit `.env` or `.env.local` to version control. Use `.env.example` as a template.

## 🚀 Deployment Steps

### Step 1: Deploy Supabase Migrations

```bash
# Login to Supabase CLI
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Push all pending migrations
supabase db push

# Verify migration status
supabase migration list
```

### Step 2: Deploy Edge Functions

```bash
# Deploy all edge functions
supabase functions deploy fetch-link-preview --project-ref YOUR_PROJECT_REF

# Verify deployment
supabase functions list
```

> **Note:** Edge Functions automatically pick up environment variables from the Supabase project dashboard (Settings → Edge Functions → Secrets).

### Step 3: Build the Frontend

```bash
# Install dependencies
npm ci

# Build production bundle
npm run build

# Preview locally (optional)
npm run preview
```

The output will be in the `dist/` directory. Deploy this to your hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).

### Step 4: Deploy Express Server

```bash
# On your server/VPS:
cd server/

# Install production dependencies
npm ci --production

# Start with process manager
pm2 start index.ts --interpreter tsx --name skillswap-api

# Or with Docker (recommended):
docker build -t skillswap-api .
docker run -d --env-file .env -p 3002:3002 skillswap-api
```

### Step 5: Verify Health

```bash
# Check Express server health
curl https://your-api-domain.com/api/health
# Expected: {"status":"ok","timestamp":"..."}

# Check Supabase connectivity
# Open your app and verify sign-in works
```

## 🔄 Rollback Plan

### Database Migration Rollback

```bash
# List migrations to find the version to rollback to
supabase migration list

# Rollback the last migration (manual SQL if needed)
# Supabase doesn't support automatic rollback — you must write a
# reverse migration:
supabase migration new rollback_description
# Then write the reverse DDL statements in the new migration file
supabase db push
```

### Edge Function Rollback

```bash
# Edge Functions are versioned — to rollback:
# 1. Checkout the previous Git commit
git checkout HEAD~1 -- supabase/functions/fetch-link-preview/

# 2. Re-deploy
supabase functions deploy fetch-link-preview
```

### Frontend Rollback

```bash
# If using Vercel/Netlify:
# Use their dashboard to instantly rollback to a previous deployment

# If self-hosted:
# Keep the previous `dist/` folder as backup
cp -r dist/ dist-backup/
npm run build
# If broken, restore:
cp -r dist-backup/ dist/
```

### Express Server Rollback

```bash
# With PM2:
pm2 revert skillswap-api

# With Docker:
docker stop skillswap-api
docker run -d --name skillswap-api skillswap-api:previous-tag
```

## 🔍 Monitoring & Observability

### Error Tracking
- **Frontend**: Sentry (configured via `VITE_SENTRY_DSN`)
- **Server**: Built-in logger at `server/utils/logger.ts`
- **Edge Functions**: Supabase Dashboard → Edge Function Logs

### Performance Monitoring
- Bundle analysis: `bundle-analysis.html` (generated on build)
- Lighthouse CI (recommended for PRs)

### Database Monitoring
- Supabase Dashboard → Database → Query Performance
- Run `supabase db lint` periodically for schema issues

## 📦 Storage Buckets

Ensure the following Supabase Storage buckets exist:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `avatars` | Yes | User profile images |
| `chat_media` | No (RLS) | Encrypted chat media |

## 🛡️ Security Checklist

- [ ] All `VITE_` variables contain only public/anon keys
- [ ] `SUPABASE_SERVICE_KEY` is only on the Express server
- [ ] `LIVEKIT_API_SECRET` is only on the Express server
- [ ] RLS policies are enabled on all public tables
- [ ] Edge Functions validate JWT tokens
- [ ] Express CORS only allows known origins
- [ ] Rate limiting is active on all Express routes
- [ ] Private keys are stored with `extractable: false`

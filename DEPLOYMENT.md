# DigitalOcean Deployment Guide

## Prerequisites
- GitHub repository with this code pushed
- DigitalOcean account with App Platform access
- Neon PostgreSQL database (or any PostgreSQL compatible DB)

## Setup Steps

### 1. Connect Your Repository
- Go to DigitalOcean App Platform
- Create new app from GitHub
- Select this repository
- Choose branch (main/master)

### 2. Configure Secrets
In DigitalOcean App Platform, go to **Settings → Variables → Secrets** and add:

**SESSION_SECRET** (generate a secure random string)
```bash
# Example: openssl rand -base64 32
$(openssl rand -base64 32)
```

**DATABASE_URL** (your Neon PostgreSQL connection string)
```
postgresql://user:password@host/database
```

### 3. Build Configuration
The `app.yaml` file in the root is already configured with:
- **Build command:** `node build.mjs`
- **Run command:** `NODE_ENV=production node dist/server/index.js`
- **Port:** 8080
- **Environment variables:** automatically injected from secrets

### 4. Deploy
1. Save your variables in DigitalOcean
2. Click "Deploy"
3. Monitor the build logs
4. App will be available at your DigitalOcean domain

## Troubleshooting

**Build fails with "exit status 1":**
- Check that `SESSION_SECRET` and `DATABASE_URL` secrets are set
- Verify DATABASE_URL format is correct
- Check DigitalOcean build logs for specific error

**Server crashes at startup:**
- Ensure DATABASE_URL is accessible from DigitalOcean
- Verify SESSION_SECRET is set and not empty
- Check application logs in DigitalOcean dashboard

**Application not responding:**
- Confirm PORT=8080 is set in app.yaml
- Check that health checks are passing in DigitalOcean dashboard

# Deployment Fix Guide

## Issue: "Failed to fetch" Error in Production

### Problem
The frontend deployed on Fly.io cannot connect to the backend API, resulting in "TypeError: Failed to fetch" errors when trying to access `/api/ping` and other endpoints.

### Root Causes

1. **Puppeteer Dependencies Missing** - Alpine Linux doesn't have Chromium and required libraries
2. **CORS Configuration** - Need explicit CORS settings for production
3. **Module Import Errors** - Production build might fail to import route modules
4. **Missing Error Logging** - Hard to diagnose production issues

### Fixes Applied

#### 1. Dockerfile Updated (Puppeteer Support)

**Before:** Used `node:20-alpine` which lacks Chromium dependencies

**After:** 
- Uses `node:20` (full Debian-based image)
- Installs Chromium and all required dependencies
- Sets `PUPPETEER_EXECUTABLE_PATH` to use system Chromium
- Prevents Puppeteer from downloading its own Chromium

#### 2. CORS Configuration Enhanced

**File:** `server/index.ts`

```typescript
app.use(cors({
  origin: true, // Reflect request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
}));
```

#### 3. Production Error Handling

**Files:** `server/index.ts`, `server/node-build.ts`

- Added comprehensive error logging for route imports
- Added detailed startup logging to diagnose issues
- Added fallback for Puppeteer import failures
- Routes will fail gracefully instead of crashing server

#### 4. New Diagnostic Endpoints

**`GET /api/status`** - Simple endpoint that always works
```json
{
  "status": "ok",
  "server": "running",
  "timestamp": "2025-12-07T...",
  "version": "1.0.0"
}
```

**`GET /api/ping`** - Enhanced with CORS headers
```json
{
  "message": "pong",
  "timestamp": "2025-12-07T...",
  "env": "production"
}
```

## Deployment Steps

### For Fly.io

1. **Commit Changes**
   ```bash
   git add .
   git commit -m "Fix production deployment issues"
   ```

2. **Push to Fly.io** (if using git deployment)
   ```bash
   git push fly main
   ```

   OR **Manual Deploy**
   ```bash
   fly deploy
   ```

3. **Monitor Deployment**
   ```bash
   fly logs
   ```

   Look for:
   - ✅ "EXPRESS API server running"
   - ✅ "Server running on port 8080"
   - ❌ Any import errors or crashes

4. **Test Health Endpoints**
   ```bash
   # Test basic connectivity
   curl https://your-app.fly.dev/api/status
   
   # Test ping endpoint
   curl https://your-app.fly.dev/api/ping
   
   # Test health endpoint
   curl https://your-app.fly.dev/api/health
   ```

### Expected Output

**Successful Deployment Logs:**
```
🚀 PRODUCTION SERVER STARTING
========================================
Environment Setup:
- NODE_ENV: production
- PORT: 8080
- GROK_API_KEY: SET (xai-yuPfCY...)
- DATABASE_URL: SET (postgresql://...)
========================================
Creating Express server with API routes...
Importing demo routes...
✓ Demo routes imported
Importing audit-progress routes...
✓ Audit-progress routes imported
Importing audit-storage routes...
✓ Audit-storage routes imported
✅ Express API server running on port 3001
✅ API routes registered:
   - GET  /api/ping
   - GET  /api/health
   - POST /api/audit
========================================
🚀 Server running on port 8080
```

## Verification Checklist

After deployment:

- [ ] Visit your app URL (should load the frontend)
- [ ] Check browser console (should not show fetch errors)
- [ ] Try `/api/status` endpoint
- [ ] Try `/api/ping` endpoint  
- [ ] Create a test audit (to verify Puppeteer works)
- [ ] Check Fly.io logs for errors

## Troubleshooting

### If Still Getting "Failed to Fetch"

1. **Check Fly.io Logs**
   ```bash
   fly logs --app your-app-name
   ```

2. **Check if Server Started**
   Look for "Server running on port 8080" in logs

3. **Verify Routes Loaded**
   Look for "✓ Audit-progress routes imported" messages

4. **Test Direct API Call**
   ```bash
   curl https://your-app.fly.dev/api/status
   ```

### If Puppeteer Fails

If you see errors like "Chromium not found":

1. **Verify Chromium Installation** (in Fly.io shell)
   ```bash
   fly ssh console
   which chromium
   ```

2. **Check Environment Variable**
   ```bash
   echo $PUPPETEER_EXECUTABLE_PATH
   ```

### If Database Connection Fails

Check that `DATABASE_URL` is set in Fly.io secrets:
```bash
fly secrets list
fly secrets set DATABASE_URL="postgresql://..."
```

## Rollback Plan

If deployment fails:

1. **Revert to Previous Version**
   ```bash
   fly releases
   fly releases rollback <version-number>
   ```

2. **Use Basic Audits** (without Puppeteer)
   - Audits will still work but won't bypass Cloudflare
   - Will use fallback data for protected sites

## Performance Notes

- **Chromium adds ~200MB to image size** (acceptable tradeoff for Cloudflare bypass)
- **First Puppeteer launch may take 2-3 seconds** (browser startup)
- **Subsequent launches are faster** (browser reuse)

## Next Steps

After successful deployment:

1. Test auditing a Cloudflare-protected site (e.g., skydeo.com)
2. Monitor server logs for any Puppeteer errors
3. Verify audits are being saved to database
4. Check audit persistence across page refreshes

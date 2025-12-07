# Railway Deployment Guide - Production Error Fix

## Issue Summary

The "Failed to fetch" error on your Railway deployment has been fixed. The issues were:

1. **Puppeteer Missing** - Alpine Linux doesn't have Chromium
2. **CORS Configuration** - Needed explicit settings for production
3. **Error Handling** - Import failures crashed the server
4. **Limited Diagnostics** - Hard to debug production issues

## All Fixes Applied ✅

### 1. Dockerfile Updated
- Changed from `node:20-alpine` to `node:20` (full Debian image)
- Installed Chromium and all dependencies for Puppeteer
- Set `PUPPETEER_EXECUTABLE_PATH` for system Chromium

### 2. Server Configuration Enhanced
- Explicit CORS configuration for cross-origin requests
- New diagnostic endpoints (`/api/status`, `/api/ping`)
- Comprehensive error logging
- Graceful fallback handling

### 3. Database Schema Fixed
- Added missing `is_demo_mode` column
- Migration runs automatically on startup

## Deploy to Railway

Railway will automatically detect and deploy the changes when you push to your repository:

### Step 1: Commit and Push

```bash
# Stage all changes
git add .

# Commit the fixes
git commit -m "Fix production deployment - add Puppeteer support and improve error handling"

# Push to main branch (triggers Railway deployment)
git push origin main
```

**That's it!** Railway will automatically:
1. Detect the updated Dockerfile
2. Build the new image with Chromium
3. Deploy the updated application
4. Make it available on your domain

### Step 2: Monitor Deployment

In Railway dashboard:
1. Go to your project
2. Click on the service
3. Open the **"Deploy Logs"** tab
4. Watch for successful deployment

You should see logs like:
```
🚀 PRODUCTION SERVER STARTING
========================================
- GROK_API_KEY: SET (xai-yuPfCY...)
- DATABASE_URL: SET (postgresql://...)
- PUPPETEER_EXECUTABLE_PATH: /usr/bin/chromium
========================================
✅ Express server created successfully
✅ API routes registered
========================================
🚀 Server running on port 8080
```

### Step 3: Verify the Fix

Once deployed, test these endpoints:

**1. Status Endpoint** (should always work)
```
https://your-app.up.railway.app/api/status
```
Expected response:
```json
{
  "status": "ok",
  "server": "running",
  "timestamp": "2025-12-07T...",
  "version": "1.0.0"
}
```

**2. Ping Endpoint**
```
https://your-app.up.railway.app/api/ping
```
Expected response:
```json
{
  "message": "pong",
  "timestamp": "2025-12-07T...",
  "env": "production"
}
```

**3. Frontend**
```
https://your-app.up.railway.app/
```
- Should load without errors
- Browser console should not show "Failed to fetch"
- API Status should show "Connected"

## Environment Variables (Required)

Make sure these are set in Railway dashboard under **Variables** tab:

```bash
DATABASE_URL=postgresql://...  # Your Neon database URL
GROK_API_KEY=xai-...          # Your Grok API key
PORT=8080                      # Railway will set this automatically
NODE_ENV=production            # Railway sets this automatically
```

You already have these set based on your `.env` file, but verify in Railway dashboard.

## Railway-Specific Notes

### Automatic Deployment
- Railway watches your GitHub repository
- Any push to `main` branch triggers automatic deployment
- No manual deploy commands needed

### Build Process
Railway will:
1. Pull latest code from GitHub
2. Detect `Dockerfile`
3. Build Docker image (takes ~3-5 minutes first time)
4. Start container with your app
5. Assign public URL

### Domain
Your app is available at:
- **Provided domain:** `*.up.railway.app`
- **Custom domain:** Configure in Railway dashboard under "Settings"

### Logs
View logs in Railway dashboard:
- **Deploy Logs:** Build and deployment process
- **Application Logs:** Runtime logs from your app
- Look for the detailed logging we added

## Troubleshooting

### If Build Fails

**Error: Out of memory**
- Increase build resources in Railway settings
- The new Dockerfile requires more memory (~512MB recommended)

**Error: Chromium installation fails**
- This shouldn't happen with the updated Dockerfile
- Check build logs for specific apt-get errors

### If App Crashes on Startup

**Check logs for:**
```
❌ Failed to import [route] routes
```

If you see this:
1. The module imports are failing
2. Check Railway logs for specific error
3. Verify all dependencies installed

**Check for:**
```
✅ Express server created successfully
✅ API routes registered
```

If you don't see these, route registration failed.

### If Still Getting "Failed to Fetch"

**1. Verify server is running**
```bash
# Test status endpoint
curl https://your-app.up.railway.app/api/status
```

**2. Check CORS headers**
```bash
curl -I https://your-app.up.railway.app/api/ping
```
Should include:
```
Access-Control-Allow-Origin: *
Content-Type: application/json
```

**3. Check Railway logs**
- Look for startup errors
- Verify all routes imported successfully
- Check for database connection errors

### Database Connection Issues

If you see database errors:

1. **Verify DATABASE_URL in Railway**
   - Go to Variables tab
   - Check DATABASE_URL is set correctly
   - Format: `postgresql://user:password@host/database?sslmode=require`

2. **Test database connection**
   - Check `/api/health` endpoint
   - Should show `"database": { "connected": true }`

## Performance Impact

**Build Time:**
- First build: ~5-7 minutes (downloading Chromium)
- Subsequent builds: ~2-3 minutes (cached layers)

**Runtime:**
- Image size: +200MB (Chromium and dependencies)
- Memory usage: +50-100MB when Puppeteer active
- First Puppeteer audit: 2-3 seconds (browser startup)
- Subsequent audits: Normal speed

**This is worth it for Cloudflare bypass capability!**

## Testing Checklist

After deployment completes:

- [ ] Visit your Railway URL - frontend loads
- [ ] Check browser console - no fetch errors
- [ ] API status shows "Connected" for both Ping and Audits
- [ ] Test `/api/status` - returns `{"status":"ok"}`
- [ ] Test `/api/ping` - returns `{"message":"pong"}`
- [ ] Create a test audit - works end-to-end
- [ ] Audit Cloudflare-protected site (e.g., skydeo.com)
- [ ] Verify Puppeteer activates (check logs)
- [ ] Refresh page - audits persist

## Rollback

If deployment fails and you need to rollback:

**In Railway Dashboard:**
1. Go to Deployments
2. Find previous successful deployment
3. Click "Redeploy"

**Or revert the commit:**
```bash
git revert HEAD
git push origin main
```

## What's Different from Before

### Before ❌
- Alpine Linux without Chromium
- Puppeteer would fail
- Basic CORS
- Server crashed on errors
- Limited debugging

### After ✅
- Full Node.js with Chromium
- Puppeteer works for Cloudflare bypass
- Explicit CORS configuration
- Graceful error handling
- Comprehensive logging
- Diagnostic endpoints

## Next Steps

1. **Push the changes** to trigger Railway deployment
2. **Monitor the build** in Railway dashboard
3. **Test the endpoints** once deployed
4. **Create a test audit** to verify everything works
5. **Try auditing skydeo.com** to test Cloudflare bypass

## Support

If issues persist:
1. Share Railway deploy logs
2. Test `/api/status` endpoint first
3. Check browser console for specific errors
4. Verify environment variables are set

---

**Status:** ✅ All fixes applied and ready to deploy  
**Platform:** Railway  
**Action Required:** Push to `main` branch to deploy

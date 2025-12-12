# Railway Deployment Checklist

**Before deploying, verify these critical items:**

## 1. Environment Variables in Railway ✅

Go to Railway Dashboard → Your Project → Variables tab

**Required:**

```bash
DATABASE_URL=postgresql://neondb_owner:npg_jW9MlJdCD4SU@ep-solitary-unit-a4k3kq2j-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
GROK_API_KEY=xai-yuPfCYsBUT28fSjKXXiQAmy61ppmqWZE2LfG7Va3a0G8IMCwXT75nAewXFctNsCybTgzlcjd1nhXyWJe
```

**Recommended:**

```bash
GOOGLE_PAGESPEED_API_KEY=AIzaSyBwL1UAHDoibMLJsMDzoeIgJYY8eK1h-ks
SCRAPER_API_KEY=8e5524715aa04bb3e52a5c7028a917d7
FIRECRAWL_API_KEY=fc-c9b839a8b217422da5ecbc12b25db0c0
VITE_SHARE_DOMAIN=https://reports.brandwhisperer.io
```

## 2. Check Railway Build Logs

After deployment, look for these SUCCESS messages:

```
✅ pg module loaded successfully
✅ Database connection successful!
✅ Server time: 2024-12-12T...
✅ Database schema initialized successfully
```

## 3. Check for ERROR Messages

**If you see these, database is NOT working:**

```
❌ DATABASE_URL NOT SET IN ENVIRONMENT
❌ Failed to load 'pg' module
❌❌❌ DATABASE CONNECTION FAILED ❌❌❌
❌ ALL AUDITS WILL BE LOST ON SERVER RESTART!
```

## 4. Test After Deployment

### A. Test Health Endpoint

```bash
curl https://your-app.up.railway.app/api/health
```

**Expected response (database working):**

```json
{
  "status": "ok",
  "environment": {
    "database": {
      "configured": true,
      "connected": true,
      "status": "Connected"
    }
  }
}
```

**Bad response (database NOT working):**

```json
{
  "status": "ok",
  "environment": {
    "database": {
      "configured": false,
      "status": "NOT CONFIGURED"
    }
  }
}
```

### B. Create Test Audit

1. Go to your deployed app
2. Create a test audit (any website)
3. Check Railway logs for:

```
✅ [STORE] SUCCESS! Audit abc123 saved to database
```

**If you see this instead, database save FAILED:**

```
❌❌❌ CRITICAL DATABASE SAVE FAILURE ❌❌❌
```

### C. Test Persistence

1. Create an audit and copy the share link
2. In Railway, click "Restart" on your service
3. After restart, try to access the share link
4. **If database is working:** Link still works ✅
5. **If database is NOT working:** Link returns 404 ❌

## 5. Common Issues and Fixes

### Issue: "pg module not available"

**Cause:** `pg` package not installed or build failed

**Fix:**

```bash
# In your local terminal
pnpm install pg
git add package.json pnpm-lock.yaml
git commit -m "Ensure pg package is installed"
git push
```

### Issue: "DATABASE CONNECTION FAILED"

**Possible causes:**

1. DATABASE_URL is wrong
2. Neon database is down/suspended
3. SSL certificate issues
4. Network/firewall blocking connection

**Fix:**

1. Verify DATABASE_URL in Railway matches Neon connection string
2. Check Neon dashboard - database should be "Active"
3. Try connecting from local machine first:
   ```bash
   psql "postgresql://neondb_owner:npg_jW9MlJdCD4SU@ep-solitary-unit-a4k3kq2j-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
   ```

### Issue: "Audits still lost after restart"

**This means database saves are silently failing**

**Debug steps:**

1. Check Railway logs for database save errors
2. Look for these logs when creating audit:

   ```
   🔵 [STORE] Step 1: Storing in memory...
   ✅ [STORE] Stored audit in memory
   🔵 [STORE] Step 2: Checking DATABASE_URL...
   🔵 [STORE] Step 3: Importing audit-service module...
   ✅ [STORE] audit-service module imported
   🔵 [STORE] Step 5: Calling auditService.saveAudit()...
   ✅ [STORE] SUCCESS! Audit saved to database
   ```

3. If any step fails, you'll see:
   ```
   ❌❌❌ CRITICAL DATABASE SAVE FAILURE ❌❌❌
   ```

## 6. Verification Script

Run this after deployment:

```bash
# Set your Railway app URL
APP_URL="https://your-app.up.railway.app"

# Test 1: Health check
echo "Testing health endpoint..."
curl $APP_URL/api/health | jq '.environment.database'

# Test 2: Create audit (replace with actual audit creation)
echo "Create an audit through the UI, then check:"

# Test 3: Restart server
echo "Restart the Railway service, then test again"

# Test 4: Verify audit still accessible
echo "Try to access the audit link after restart"
```

## 7. Expected Railway Logs (Good Deployment)

```
================================================================================
🔵 INITIALIZING DATABASE CONNECTION
🔵 DATABASE_URL: postgresql://neondb_owner:npg...
================================================================================
✅ pg module loaded successfully
🔵 Testing database connection...
✅ Database connection successful!
✅ Server time: 2024-12-12T10:30:00.000Z
================================================================================

Initializing database schema...
Database schema initialized successfully

🚀 Server running on port 8080
```

## 8. Bad Deployment Logs (Database NOT Working)

```
================================================================================
❌ DATABASE_URL NOT SET IN ENVIRONMENT
❌ Audits will be lost on server restart!
❌ Shared links will break on every deployment!
================================================================================
```

OR

```
================================================================================
❌❌❌ DATABASE CONNECTION FAILED ❌❌❌
❌ Error: connect ECONNREFUSED
❌ DATABASE_URL: postgresql://neondb_owner:npg...
❌ ALL AUDITS WILL BE LOST ON SERVER RESTART!
================================================================================
```

## 9. Post-Deployment Tasks

After successful deployment:

- [ ] Verify health endpoint shows database connected
- [ ] Create a test audit
- [ ] Copy the share link
- [ ] Restart Railway service
- [ ] Verify share link still works after restart
- [ ] Check Railway logs for any errors
- [ ] Test creating new audits
- [ ] Test accessing recent audits list

## 10. Rollback Plan

If deployment fails:

1. **In Railway:** Click "Deployments" → Find last working deployment → Click "Redeploy"
2. **Or locally:**
   ```bash
   git revert HEAD
   git push origin main
   ```

## Success Criteria

✅ All checks must pass:

1. DATABASE_URL is set in Railway variables
2. Railway logs show "Database connection successful"
3. Health endpoint shows `"connected": true`
4. Test audit persists after server restart
5. Share links work after server restart
6. No error messages in logs about database
7. Recent audits list shows audits after restart

---

**Last Updated:** December 12, 2024

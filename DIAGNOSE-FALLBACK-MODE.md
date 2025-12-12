# Diagnosing Why Audits Are Using Fallback Mode

## Problem Symptoms

- ✅ All audits score exactly 72%
- ✅ Old/generic criteria being used
- ✅ Audits not persisting after server restart
- ✅ Links breaking after deployment

## Root Cause

Your audits are using **fallback/demo mode** instead of real Grok AI analysis.

## Why Fallback Mode Activates

The system falls back to demo audits when:

1. **GROK_API_KEY not set** (most common)
2. **Grok API times out** (request takes > 2 minutes)
3. **Grok API returns errors** (500, 503, invalid response)
4. **Grok API quota exceeded**

## Step 1: Check Railway Logs

**Look for these warning messages in Railway logs:**

### ❌ API Key Missing
```
GROK_API_KEY not configured, sending fallback audit via SSE
```

### ❌ API Timeout
```
[AUDIT DEBUG] Grok API timeout - request took too long
```

### ❌ API Error
```
[AUDIT DEBUG] Grok API is overloaded, using fallback
```

### ❌ Fallback Mode Confirmed
```
[FALLBACK] Generating fallback audit for: example.com
```

## Step 2: Verify GROK_API_KEY

**In Railway Dashboard:**

1. Go to your project
2. Click "Variables" tab
3. Check for `GROK_API_KEY`
4. Verify it starts with `xai-`
5. Should be: `xai-yuPfCYsBUT28fSjKXXiQAmy61ppmqWZE2LfG7Va3a0G8IMCwXT75nAewXFctNsCybTgzlcjd1nhXyWJe`

**If missing or wrong:**
1. Add/fix the variable
2. Redeploy the service

## Step 3: Test Grok API Directly

**Check if Grok API is working:**

```bash
curl -X POST https://api.x.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer xai-yuPfCYsBUT28fSjKXXiQAmy61ppmqWZE2LfG7Va3a0G8IMCwXT75nAewXFctNsCybTgzlcjd1nhXyWJe" \
  -d '{
    "model": "grok-4-1-fast-reasoning",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```

**Expected response:**
```json
{
  "choices": [{
    "message": {
      "content": "Hello! How can I help you?"
    }
  }]
}
```

**Error responses:**

**401 Unauthorized:**
```json
{
  "error": {
    "message": "Invalid API key"
  }
}
```
→ GROK_API_KEY is wrong

**429 Too Many Requests:**
```json
{
  "error": {
    "message": "Rate limit exceeded"
  }
}
```
→ Quota exceeded, wait or upgrade

**503 Service Unavailable:**
```json
{
  "error": {
    "message": "The server is currently unavailable"
  }
}
```
→ Grok API is down, try again later

## Step 4: Check Audit Creation Flow

**Watch Railway logs while creating an audit:**

### ✅ Good Flow (Real AI)
```
🔵 Starting audit for: example.com
🔵 Scraping website...
✅ Website scraped. Fallback used: false
🔵 Calling Grok API for analysis...
✅ Grok API call completed
🔵 Parsing AI response...
✅ Audit generated successfully
✅ [STORE] SUCCESS! Audit saved to database
```

### ❌ Bad Flow (Fallback Mode)
```
🔵 Starting audit for: example.com
GROK_API_KEY not configured, sending fallback audit via SSE
[FALLBACK] Generating fallback audit for: example.com
```

OR

```
🔵 Starting audit for: example.com
🔵 Scraping website...
✅ Website scraped
🔵 Calling Grok API for analysis...
❌ Grok API error: timeout
[FALLBACK] Generating fallback audit for: example.com
```

## Step 5: Fix Common Issues

### Issue 1: GROK_API_KEY Not Set

**Symptoms:**
- Logs say "GROK_API_KEY not configured"
- Every audit uses fallback mode immediately

**Fix:**
1. Railway Dashboard → Variables
2. Add: `GROK_API_KEY` = `xai-yuPfCYsBUT28fSjKXXiQAmy61ppmqWZE2LfG7Va3a0G8IMCwXT75nAewXFctNsCybTgzlcjd1nhXyWJe`
3. Restart service
4. Test new audit

### Issue 2: Grok API Timeout

**Symptoms:**
- Logs say "Grok API timeout - request took too long"
- Happens after 2-3 minutes of processing

**Causes:**
- Complex website with lots of content
- Grok API is slow
- Network latency

**Fixes:**
1. Increase timeout (already set to 3 minutes)
2. Simplify audit prompt
3. Reduce content sent to Grok

### Issue 3: Grok API Quota Exceeded

**Symptoms:**
- Logs show "Rate limit exceeded" or similar
- Works for first few audits, then fails

**Fix:**
- Check x.ai dashboard for quota usage
- Wait for quota reset
- Upgrade plan if needed

### Issue 4: Grok API Key Invalid

**Symptoms:**
- Logs show "Invalid API key" or 401 errors
- Every request fails

**Fix:**
1. Verify API key in x.ai dashboard
2. Generate new API key if needed
3. Update in Railway
4. Restart service

## Step 6: Temporary Workaround

**If Grok API is down and you need audits now:**

The fallback mode still works, but:
- Scores are generic (72%)
- No personalized analysis
- Old criteria format

**This is NOT a permanent solution - fix the Grok API connection!**

## Step 7: Verify Fix

**After fixing, test:**

1. Create a new audit
2. Check Railway logs for:
   ```
   ✅ Grok API call completed
   ✅ Audit generated successfully
   ```
3. Verify audit has:
   - Varied scores (not all 72%)
   - Specific recommendations
   - Detailed analysis
4. Check audit persists after server restart
5. Verify share links work

## Step 8: Monitor for Regression

**Set up monitoring:**

1. **Check logs daily** for fallback mode messages
2. **Test audits weekly** to ensure real AI is running
3. **Monitor Grok API quota** in x.ai dashboard
4. **Set up alerts** in Railway for errors

## Quick Diagnostic Checklist

Run through this checklist:

- [ ] GROK_API_KEY is set in Railway variables
- [ ] GROK_API_KEY starts with `xai-`
- [ ] GROK_API_KEY matches value in x.ai dashboard
- [ ] Grok API responds to test curl command
- [ ] Railway logs show "Grok API call completed"
- [ ] Railway logs do NOT show "[FALLBACK]"
- [ ] New audits have varied scores (not all 72%)
- [ ] Audits persist after server restart
- [ ] Share links work after restart

## Expected Railway Logs (Healthy System)

```
================================================================================
🔵 INITIALIZING DATABASE CONNECTION
✅ pg module loaded successfully
✅ Database connection successful!
✅ Database schema initialized successfully
================================================================================

🔵 Starting audit for: example.com
🔵 Scraping website...
✅ Website scraped. Fallback used: false

🔵 Calling Grok API for analysis...
✅ Grok API call completed

🔵 [STORE] Step 1: Storing in memory...
✅ [STORE] Stored audit in memory

🔵 [STORE] Step 2: Checking DATABASE_URL...
🔵 [STORE] Step 3: Importing audit-service module...
✅ [STORE] audit-service module imported

🔵 [STORE] Step 5: Calling auditService.saveAudit()...
✅ [STORE] SUCCESS! Audit saved to database
```

## Red Flags in Logs

**Immediate action required if you see:**

```
❌ GROK_API_KEY not configured
❌ Grok API timeout
❌ Grok API is overloaded
[FALLBACK] Generating fallback audit
❌❌❌ DATABASE NOT CONFIGURED ❌❌❌
❌❌❌ CRITICAL DATABASE SAVE FAILURE ❌❌❌
```

---

**Most Common Fix:** Add GROK_API_KEY to Railway variables and restart service.

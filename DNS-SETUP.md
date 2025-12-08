# DNS Configuration for reports.brandwhisperer.io

## Overview

To use `reports.brandwhisperer.io` for shareable audit links, you need to configure DNS and Railway to route traffic properly.

## Step 1: Add Custom Domain in Railway

1. Go to your Railway project dashboard
2. Navigate to **Settings** → **Domains**
3. Click **+ Add Domain**
4. Enter: `reports.brandwhisperer.io`
5. Railway will provide you with DNS records (CNAME or A record)

## Step 2: Configure DNS

Go to your DNS provider (where brandwhisperer.io is registered - GoDaddy, Namecheap, Cloudflare, etc.)

### Add CNAME Record

| Type  | Name    | Value (from Railway)              | TTL  |
| ----- | ------- | --------------------------------- | ---- |
| CNAME | reports | [your-railway-app].up.railway.app | 3600 |

**Example:**

```
Type: CNAME
Name: reports
Value: audit-dl0hvw-production.up.railway.app
TTL: 3600 (or Auto)
```

### Alternative: A Record (if CNAME not supported)

If your DNS provider doesn't support CNAME for subdomains, use an A record:

| Type | Name    | Value (IP from Railway) | TTL  |
| ---- | ------- | ----------------------- | ---- |
| A    | reports | [IP address]            | 3600 |

## Step 3: Verify DNS Propagation

After adding DNS records, wait for propagation (5 minutes to 48 hours, usually < 1 hour).

**Check DNS propagation:**

```bash
# Check if CNAME is live
dig reports.brandwhisperer.io

# Or use online tool
# Visit: https://dnschecker.org
# Enter: reports.brandwhisperer.io
```

## Step 4: Configure Environment Variable

The code is already configured to use `reports.brandwhisperer.io`.

**Railway Environment Variables:**

1. Go to Railway → Your Project → Variables
2. Add: `VITE_SHARE_DOMAIN` = `https://reports.brandwhisperer.io`
3. Redeploy the app

## Step 5: Test the Setup

1. Create a new audit in your app
2. Click "Copy Link"
3. **Expected URL format:**
   ```
   https://reports.brandwhisperer.io/audit/a7f3c9d2-4e6b-4a1d-8f2e-9c3b4d5e6f7a
   ```
4. Open the link in incognito/private browsing
5. Verify the audit loads correctly
6. Confirm the browser shows `reports.brandwhisperer.io` (NOT the Railway URL)

## How It Works

```
User clicks share link
       ↓
https://reports.brandwhisperer.io/audit/[token]
       ↓
DNS CNAME points to → audit-dl0hvw-production.up.railway.app
       ↓
Railway routes traffic to your app
       ↓
App serves SharedAudit.tsx (read-only view)
```

## Benefits

✅ **Hidden Product URL**: Users never see `audit-dl0hvw-production.up.railway.app`
✅ **Professional Branding**: Uses your custom domain
✅ **Isolated Access**: Share links can't be modified to access the audit tool
✅ **Secure Tokens**: Still uses cryptographic UUIDs for security

## Troubleshooting

### Issue: "This site can't be reached"

- **Cause**: DNS not propagated yet
- **Solution**: Wait 1-24 hours for DNS propagation

### Issue: "SSL Certificate Error"

- **Cause**: Railway hasn't issued SSL cert yet
- **Solution**: Wait 5-10 minutes after DNS propagation, Railway auto-provisions SSL

### Issue: Old links still show Railway URL

- **Cause**: Links were generated before environment variable was set
- **Solution**: New audits will use the custom domain. Old links will still work but show Railway URL

### Issue: 404 Not Found on reports.brandwhisperer.io

- **Cause**: Route configuration mismatch
- **Solution**: Verify the route in `client/App.tsx` matches `/audit/:id` (no `/share` prefix)

## Migration Notes

**Existing share links:**

- Old format: `https://audit-dl0hvw-production.up.railway.app/share/audit/[token]`
- Will continue to work (backward compatible)

**New share links:**

- New format: `https://reports.brandwhisperer.io/audit/[token]`
- Cleaner, branded, doesn't expose product URL

## Custom Domain Checklist

- [ ] Add custom domain in Railway
- [ ] Configure DNS CNAME record
- [ ] Wait for DNS propagation (check with `dig` or dnschecker.org)
- [ ] Set `VITE_SHARE_DOMAIN` environment variable in Railway
- [ ] Redeploy application
- [ ] Test new audit link generation
- [ ] Verify SSL certificate is active
- [ ] Test shared audit page loads correctly
- [ ] Confirm main product remains hidden

## Security Notes

- The custom domain only affects the share URL display
- Share tokens are still cryptographically secure UUIDs
- Users accessing `reports.brandwhisperer.io` directly will see a 404 or home page
- No way to navigate from share link to audit creation tool
- DNS and SSL are handled automatically by Railway

## Need Help?

- **DNS Issues**: Contact your domain registrar support
- **Railway Issues**: Check Railway documentation or support
- **App Issues**: Review the logs in Railway dashboard

---

**Summary:** Once DNS is configured and propagated, all new share links will use `https://reports.brandwhisperer.io/audit/[token]` instead of exposing your Railway URL.

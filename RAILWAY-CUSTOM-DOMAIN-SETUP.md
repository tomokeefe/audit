# Railway Custom Domain Setup - Quick Guide

## ✅ Code Changes Complete

The application is now configured to use `reports.brandwhisperer.io` for all shareable audit links.

**New share URL format:**

```
https://reports.brandwhisperer.io/audit/[unique-token]
```

## 🚀 Next Steps: Railway & DNS Configuration

### Step 1: Add Custom Domain in Railway (5 minutes)

1. **Login to Railway Dashboard**
   - Go to: https://railway.app
   - Select your project: `audit-dl0hvw-production`

2. **Add Custom Domain**
   - Click on your service/deployment
   - Go to **Settings** tab
   - Scroll to **Domains** section
   - Click **+ Custom Domain**
   - Enter: `reports.brandwhisperer.io`
   - Click **Add Domain**

3. **Copy the DNS Record**
   - Railway will show you a CNAME record
   - Example: `CNAME reports → audit-dl0hvw-production.up.railway.app`
   - Keep this window open for the next step

### Step 2: Configure DNS (10 minutes)

Go to your domain registrar/DNS provider where `brandwhisperer.io` is managed:

**Add CNAME Record:**

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| **Type**   | CNAME                                    |
| **Name**   | `reports`                                |
| **Target** | `audit-dl0hvw-production.up.railway.app` |
| **TTL**    | 3600 (or Auto)                           |

**Common DNS Providers:**

- **Cloudflare**: DNS → Records → Add record
- **GoDaddy**: DNS → Manage → Add → CNAME
- **Namecheap**: Advanced DNS → Add New Record
- **Google Domains**: DNS → Custom records → Create new record

### Step 3: Wait for DNS Propagation (5-60 minutes)

**Check if DNS is live:**

```bash
# In terminal
dig reports.brandwhisperer.io

# Or visit
https://dnschecker.org
# Enter: reports.brandwhisperer.io
```

### Step 4: Verify Railway SSL Certificate (Automatic)

Railway automatically provisions an SSL certificate once DNS is detected.

**Check SSL status:**

- Go back to Railway → Domains section
- Wait for green checkmark next to `reports.brandwhisperer.io`
- Status should show: ✓ Active with SSL

### Step 5: Test Everything

1. **Create a new audit** in your application
2. **Copy the share link** - should show `reports.brandwhisperer.io`
3. **Open in incognito browser** - verify it loads
4. **Check URL bar** - should NOT show `audit-dl0hvw-production.up.railway.app`

## ✅ What's Already Configured

- ✅ Code updated to generate links with custom domain
- ✅ Environment variable `VITE_SHARE_DOMAIN` set
- ✅ Routes updated to support new URL structure
- ✅ Backward compatibility for old links maintained

## 🔒 Security Benefits

**Before:**

```
https://audit-dl0hvw-production.up.railway.app/share/audit/abc123
                        ↑
         Users can navigate to main product by removing path
```

**After:**

```
https://reports.brandwhisperer.io/audit/abc123
                        ↑
         Clean, branded domain - product URL completely hidden
```

## 🐛 Troubleshooting

### DNS not working after 24 hours

- Verify CNAME record is correct
- Check for typos in subdomain name
- Ensure no conflicting A records exist
- Contact your DNS provider support

### SSL Certificate Error

- Wait 10-15 minutes after DNS propagation
- Railway auto-provisions SSL
- Check Railway dashboard for SSL status

### 404 Error on custom domain

- Verify DNS is propagated (`dig` command)
- Check Railway shows domain as "Active"
- Ensure app is deployed and running

### Old Railway URL still shows in links

- Clear browser cache
- Create a new audit (old ones cached old URL)
- Verify `VITE_SHARE_DOMAIN` is set in Railway

## 📋 Checklist

- [ ] Added `reports.brandwhisperer.io` in Railway
- [ ] Configured CNAME record in DNS
- [ ] Waited for DNS propagation (check with `dig` or dnschecker.org)
- [ ] Verified SSL certificate is active in Railway
- [ ] Tested new audit link shows custom domain
- [ ] Verified shared audit page loads without access to product

## 🎯 Expected Timeline

- **DNS Configuration**: 5-10 minutes
- **DNS Propagation**: 5-60 minutes (usually 15 min)
- **SSL Provisioning**: Automatic after DNS propagates
- **Total Time**: ~30 minutes to 2 hours

## Need Help?

See the detailed guide in `DNS-SETUP.md` for troubleshooting and advanced configuration.

---

**Status:** Code changes complete ✅ | DNS setup required ⏳

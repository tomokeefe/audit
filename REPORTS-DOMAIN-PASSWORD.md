# Password Protection for reports.brandwhisperer.io

## Overview

The `reports.brandwhisperer.io` domain is configured with **selective password protection**:

✅ **Shareable audit links** - Publicly accessible, no password required
❌ **Root domain access** - Password protected to prevent unauthorized product access

## How It Works

### Public Access (No Password Required)
```
https://reports.brandwhisperer.io/audit/a7f3c9d2-4e6b-4a1d-8f2e-9c3b4d5e6f7a
                                   ↑
                            Anyone can view this
```

When someone has a shareable audit link with a token, they can view it directly without any password.

### Protected Access (Password Required)
```
https://reports.brandwhisperer.io
                ↑
        Shows password-protected landing page
```

If someone navigates to the root domain without an audit token, they see a password prompt. This prevents:
- Unauthorized access to the audit creation tool
- Discovery of the main product URL
- Random visitors accessing the platform

## Password Configuration

### Setting the Password

**Option 1: Environment Variable (Recommended)**
Set in Railway dashboard:
```
VITE_REPORTS_PASSWORD=your-secure-password-here
```

**Option 2: Default Password**
If no environment variable is set, the default password is:
```
brandwhisperer2024
```

### Changing the Password

1. Go to Railway dashboard
2. Navigate to your project
3. Click **Variables** tab
4. Add or update: `VITE_REPORTS_PASSWORD`
5. Redeploy the application

## User Experience

### For Share Link Recipients (No Password)
1. Receive link: `reports.brandwhisperer.io/audit/[token]`
2. Click link
3. **Immediately see the audit report** - no password required
4. Can share, print, or download the report
5. **Cannot navigate to product** - isolated read-only view

### For Direct Visitors (Password Required)
1. Type: `reports.brandwhisperer.io` in browser
2. See password-protected landing page
3. Must enter correct password
4. After successful login → **Redirected to main product**
5. This is for authorized team members only

## Implementation Details

### Route Logic

```typescript
// In client/App.tsx
const isReportsDomain = window.location.hostname === 'reports.brandwhisperer.io';

<Routes>
  <Route 
    path="/" 
    element={isReportsDomain ? <ProtectedLanding /> : <Index />} 
  />
  <Route 
    path="/audit/:id" 
    element={isReportsDomain ? <SharedAudit /> : <AuditResults />} 
  />
</Routes>
```

### Component: ProtectedLanding.tsx

Located at: `client/pages/ProtectedLanding.tsx`

**Features:**
- Clean, professional password prompt
- Helpful messaging for lost users
- Email contact for support
- Explains shareable link format
- Prevents brute force with simple error messages

## Security Considerations

### ✅ What This Protects Against

1. **URL Discovery**: Users can't find the main product URL
2. **Direct Access**: Root domain requires authentication
3. **Unauthorized Navigation**: Share links are isolated views only

### ⚠️ Limitations

1. **Client-Side Password**: Password is checked in the browser (not server-side)
2. **Token Security**: Share tokens are the primary security mechanism
3. **Simple Auth**: This is not multi-user authentication, just a single password

### 🔒 Recommended Security Enhancements

For production use, consider:

1. **Server-Side Auth**: Move password check to backend
2. **Rate Limiting**: Limit password attempts
3. **Session Management**: Use cookies/sessions for authenticated users
4. **Token Expiration**: Make share tokens expire after a time period
5. **Access Logs**: Track who accesses shared audits

## Testing

### Test Shareable Links (Should Work Without Password)
```bash
# Visit with a token - should load directly
curl -I https://reports.brandwhisperer.io/audit/test-token-123

# Expected: 200 OK, shows SharedAudit page
```

### Test Root Domain (Should Show Password Page)
```bash
# Visit root domain - should show password page
curl -I https://reports.brandwhisperer.io

# Expected: 200 OK, shows ProtectedLanding page
```

### Test Password Authentication
1. Visit: `https://reports.brandwhisperer.io`
2. Enter incorrect password → Should show error
3. Enter correct password → Should redirect to main product

## Troubleshooting

### Issue: Password page shows for shareable links
- **Cause**: Route configuration error
- **Solution**: Verify `/audit/:id` route is above root `/` route

### Issue: Password not working
- **Cause**: Environment variable not set
- **Solution**: Check `VITE_REPORTS_PASSWORD` in Railway dashboard

### Issue: Users can still access product
- **Cause**: Password redirects to wrong URL
- **Solution**: Check redirect URL in `ProtectedLanding.tsx`

### Issue: Share links require password
- **Cause**: Domain detection not working
- **Solution**: Verify `isReportsDomain` logic in `App.tsx`

## FAQ

**Q: Can I disable password protection?**
A: Yes, modify `App.tsx` to always show `<Index />` instead of conditional rendering.

**Q: Can different users have different passwords?**
A: Not with this implementation. You'd need a proper authentication system.

**Q: What if someone shares the password?**
A: They'll be redirected to the main product. Consider implementing proper user auth if this is a concern.

**Q: Can I track who accesses shared audits?**
A: Not currently. This would require backend logging and analytics integration.

## Summary

```
┌─────────────────────────────────────────────────────────────┐
│  reports.brandwhisperer.io (Root)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  🔒 Password Protected                                 │  │
│  │  - Shows landing page with password prompt            │  │
│  │  - Correct password → Redirect to main product        │  │
│  │  - Wrong password → Access denied                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  reports.brandwhisperer.io/audit/[token]                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ✅ Publicly Accessible                                │  │
│  │  - No password required                               │  │
│  │  - Anyone with link can view                          │  │
│  │  - Read-only audit report                             │  │
│  │  - Cannot navigate to product                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Best of both worlds:** Share links work seamlessly for clients, while the root domain remains protected from unauthorized access.

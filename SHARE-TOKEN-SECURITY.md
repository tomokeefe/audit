# Secure Share Token Implementation

## Overview

The audit sharing system has been upgraded with **secure share tokens** to prevent unauthorized access to audit data. Previously, shareable links used sequential audit IDs which could be easily guessed. Now, each audit has a unique, non-guessable UUID token for sharing.

## What Changed

### Before (Security Risk)

```
Shareable Link: https://yourdomain.com/share/audit/123
```

- Used sequential IDs (1, 2, 3, 4...)
- Anyone could guess other audit URLs by trying different numbers
- Audit data could be accessed by unauthorized users

### After (Secure)

```
Shareable Link: https://yourdomain.com/share/audit/a7f3c9d2-4e6b-4a1d-8f2e-9c3b4d5e6f7a
```

- Uses cryptographically random UUIDs
- Virtually impossible to guess (2^122 possible combinations)
- Only people with the exact link can access the audit

## Technical Implementation

### 1. Database Schema

```sql
ALTER TABLE audits ADD COLUMN share_token VARCHAR(36) UNIQUE;
CREATE INDEX idx_audits_share_token ON audits(share_token);
```

### 2. Token Generation

- Share tokens are automatically generated when audits are created
- Uses Node.js `crypto.randomUUID()` for cryptographic randomness
- Tokens are 36 characters (UUID v4 format)
- Example: `550e8400-e29b-41d4-a716-446655440000`

### 3. API Endpoints

#### New Secure Endpoint

```
GET /api/audits/share/:token
```

- Fetches audits by share token
- Returns audit data only if token matches
- Returns 404 if token not found

#### Existing Endpoint (Preserved)

```
GET /api/audits/:id
```

- Still works for authenticated access
- Direct ID access (for audit owners)
- Old shareable links will fall back to this endpoint

## Security Benefits

### ✅ Non-Guessable URLs

Share tokens are UUIDs with 2^122 (5.3 × 10^36) possible values. Even if an attacker tried 1 million tokens per second, it would take billions of years to find a valid token by chance.

### ✅ Isolated Access

- Share links only provide access to the specific audit
- No access to the audit creation tool
- No access to other audits
- No ability to create, modify, or delete audits

### ✅ Revocable Links

While not yet implemented, the token system allows for future features:

- Expiring links (time-based access)
- Password-protected shares
- Link analytics (view tracking)
- Token revocation

## Usage

### For Users

**Creating a Shareable Link:**

1. Run an audit on any website
2. Navigate to the audit results page
3. Click "Copy Link" button
4. Share the link with anyone

**Example Shareable Link:**

```
https://brandwhisperer.com/share/audit/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

### For Developers

**Generating Share Tokens:**

```typescript
import { randomUUID } from "crypto";

const audit = {
  id: "audit-123",
  title: "Brand Audit",
  // ... other fields
  shareToken: randomUUID(), // Auto-generated if not provided
};
```

**Fetching by Share Token:**

```typescript
// Frontend
const auditData = await apiGet<AuditResponse>(`/api/audits/share/${token}`);

// Backend
const audit = await auditService.getAuditByShareToken(token);
```

## Migration

### Existing Audits

- Audits created before this update will have `share_token` automatically generated
- A migration script backfills tokens for all existing audits:
  ```sql
  UPDATE audits
  SET share_token = gen_random_uuid()::text
  WHERE share_token IS NULL;
  ```

### Backward Compatibility

- Old shareable links (using IDs) will still work
- The system tries share token first, then falls back to ID
- This ensures existing shared links don't break

## Privacy & Compliance

### What Data is Shared

When someone accesses a share link, they can see:

- ✅ Audit results and scores
- ✅ Recommendations and analysis
- ✅ Website URL being audited
- ✅ Audit date and metadata

### What Data is Protected

Share links do NOT provide access to:

- ❌ The audit creation tool
- ❌ Other users' audits
- ❌ Account information
- ❌ Ability to modify or delete audits
- ❌ Internal audit IDs or database structure

### GDPR Considerations

- Share tokens are anonymous (no personal data)
- Recipients don't need accounts to view audits
- Audit creators maintain full control
- Links can be regenerated if compromised (future feature)

## Performance

### Database Queries

- Indexed on `share_token` for fast lookups
- Query time: O(log n) with B-tree index
- No performance impact vs. ID lookups

### Token Storage

- 36 bytes per audit (UUID string)
- Negligible storage overhead
- Database column type: `VARCHAR(36)`

## Best Practices

### Do's

✅ Generate a new share token for each audit
✅ Use the secure `/api/audits/share/:token` endpoint
✅ Store tokens securely in the database
✅ Use HTTPS for all share links
✅ Log share link access for analytics (optional)

### Don'ts

❌ Don't expose audit IDs in shareable URLs
❌ Don't reuse share tokens across audits
❌ Don't allow token enumeration
❌ Don't transmit tokens over insecure channels
❌ Don't store tokens in URL parameters for analytics

## Future Enhancements

### Potential Features

1. **Expiring Links**: Set expiration dates for share tokens
2. **Password Protection**: Require password to view shared audits
3. **View Analytics**: Track who viewed the audit and when
4. **Custom Tokens**: Allow users to create branded short links
5. **Token Revocation**: Invalidate share links on demand
6. **Download Limits**: Control how many times an audit can be downloaded

## Testing

### Manual Testing

1. Create a new audit
2. Copy the shareable link
3. Open in incognito/private browsing
4. Verify the audit loads correctly
5. Try modifying the token (should fail)
6. Try accessing without token (should fail)

### Security Testing

```bash
# Test invalid token
curl https://yourdomain.com/api/audits/share/invalid-token-12345
# Expected: 404 Not Found

# Test valid token
curl https://yourdomain.com/api/audits/share/f47ac10b-58cc-4372-a567-0e02b2c3d479
# Expected: 200 OK with audit data

# Test token enumeration protection
# Should fail with 404 for all invalid tokens
for i in {1..100}; do
  curl -s https://yourdomain.com/api/audits/share/test-$i | grep -q "404"
done
```

## Troubleshooting

### "Shared audit not found"

- **Cause**: Invalid or expired share token
- **Solution**: Request a new share link from the audit owner

### "Share token not provided"

- **Cause**: Malformed URL or missing token parameter
- **Solution**: Verify the complete URL was copied

### Old links not working

- **Cause**: Migration incomplete or database error
- **Solution**: Run the migration script to backfill tokens

## Summary

The share token system provides a **secure, scalable, and user-friendly** way to share audit results while protecting access to the audit platform and other users' data.

**Key Benefits:**

- 🔒 Cryptographically secure random tokens
- 🚫 Prevents unauthorized access via URL guessing
- ✅ Backward compatible with existing links
- 📊 Ready for future features (expiration, analytics)
- 🎯 Isolated access - view only, no platform access

**Security Level:**

- **Before**: Low (sequential IDs)
- **After**: High (UUID tokens with 2^122 entropy)

This implementation ensures that **only people with the exact share link** can view the audit, and they **cannot access the product itself** or any other audits.

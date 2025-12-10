# Phase 4: White-Label SaaS Platform - Implementation Roadmap

## 🎯 Overview

Phase 4 transforms the audit platform into a **White-Label SaaS product** that agencies can resell to their clients under their own brand. This is the primary revenue-generation strategy with a subscription-based pricing model.

**Target Launch:** 14-21 days from kickoff  
**Complexity:** Very High (multi-tenancy, billing, white-labeling)  
**Primary Value:** Recurring revenue from agencies ($99-$999/month)  
**Prerequisites:** Phase 2 & 3 completed (Product + Mobile App audits)

---

## 💰 Pricing Model (From Screenshot)

### Tier 1: Starter - $99/month
**Audits Included:** 10 audits/month

**Features:**
- White-label dashboard
- Basic branding (logo swap)
- Website + deck audits only
- "Powered by Brand Whisperer" attribution required
- Standard support

**Who It's For:**
- Solo designers or small shops testing the waters
- Freelancers adding audit services
- Small agencies (1-5 clients/month)

**Limitations:**
- No Product or Mobile App audits
- Watermark on reports
- No API access
- No custom domain
- No priority support

---

### Tier 2: Growth - $299/month
**Audits Included:** 50 audits/month

**Features:**
- **All audit types** (website, deck, app, product)
- Custom domain support
- Email templates customization
- API access for embeds
- Remove "Powered by" attribution
- No watermarks
- Priority email support

**Who It's For:**
- Mid-size agencies doing 20-40 clients/month
- Marketing agencies offering audits as lead magnets
- Consultancies with recurring audit needs

**Value Proposition:**
- $5.98/audit (vs $99-599 retail)
- Full white-labeling
- API integration into existing tools

---

### Tier 3: Unicorn - $999/month
**Audits Included:** Unlimited

**Features:**
- **Everything in Growth +**
- Custom fields in audit templates
- White-glove onboarding (1-hour setup call)
- Quarterly strategy updates
- Priority support (< 2 hour response)
- Custom integrations
- Dedicated account manager
- Early access to new features
- Custom audit criteria (upon request)

**Who It's For:**
- High-volume agencies ($1M+ revenue)
- Enterprise consultancies
- Agencies wanting exclusivity
- Partners requiring custom workflows

**Value Proposition:**
- Zero cost per audit
- Exclusive features and support
- Partner-level relationship

---

## 🛡️ Protection & Terms

### Legal Protection:

**Terms of Service:**
- ✅ No reselling the tool itself (only white-labeled audits)
- ✅ Must credit "Powered by Brand Whisperer" in Starter tier reports
- ✅ No reverse engineering or code extraction
- ✅ Data ownership: Agency owns audit results, we own platform
- ✅ 30-day cancellation notice for annual contracts
- ✅ No refunds on monthly subscriptions (pro-rated for annual)

### Technical Protection:

**Starter Tier:**
- Watermark on PDF exports: "Generated with Brand Whisperer"
- Footer attribution in audit reports
- Limited to Website + Pitch Deck audits only
- No API access (prevents automation)
- Rate limiting: 10 audits/month hard cap

**Growth Tier:**
- Remove watermarks
- Remove "Powered by" attribution
- API access with rate limiting (50 audits/month)
- Custom domain (youraudits.com)
- Email customization templates

**Unicorn Tier:**
- Unlimited audits with fair-use policy
- Dedicated API keys
- Custom integrations
- White-glove support

**Enforcement:**
- License key validation on every audit
- Server-side audit count tracking
- Automatic tier downgrades on non-payment
- Audit trail for compliance

---

## 🏗️ Technical Architecture

### Multi-Tenancy Model

**Approach: Database-per-Schema (Shared Database, Isolated Schemas)**

```
PostgreSQL Database
├── public (platform tables)
│   ├── organizations (agencies)
│   ├── subscriptions
│   ├── users (agency users)
│   └── billing_events
│
├── org_abc123 (Agency 1 schema)
│   ├── audits
│   ├── customers
│   ├── branding_settings
│   └── api_keys
│
├── org_xyz789 (Agency 2 schema)
│   ├── audits
│   ├── customers
│   ├── branding_settings
│   └── api_keys
```

**Why Schema-based:**
- Complete data isolation (security)
- Easy backup/restore per organization
- Scales to 1000+ organizations
- Simpler than database-per-tenant
- PostgreSQL native feature

---

### New Database Schema

**1. `organizations` Table**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- for custom domains
  tier VARCHAR(20) NOT NULL, -- 'starter', 'growth', 'unicorn'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
  
  -- Subscription
  subscription_id VARCHAR(100), -- Stripe subscription ID
  stripe_customer_id VARCHAR(100),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  audit_limit INTEGER NOT NULL, -- 10, 50, or 999999
  audits_used_this_period INTEGER DEFAULT 0,
  
  -- White-labeling
  logo_url TEXT,
  primary_color VARCHAR(7), -- #hex
  custom_domain VARCHAR(255), -- audits.theiragency.com
  powered_by_visible BOOLEAN DEFAULT true,
  
  -- Features
  api_enabled BOOLEAN DEFAULT false,
  custom_fields_enabled BOOLEAN DEFAULT false,
  all_audit_types_enabled BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Billing
  billing_email VARCHAR(255),
  billing_address JSONB,
  tax_id VARCHAR(100)
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_tier ON organizations(tier);
CREATE INDEX idx_organizations_subscription ON organizations(subscription_id);
```

**2. `users` Table** (Platform-level)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member'
  
  -- Auth
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP,
  reset_token VARCHAR(100),
  reset_token_expires TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
```

**3. `subscriptions` Table** (Subscription history)
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(100) UNIQUE,
  
  tier VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'active', 'past_due', 'cancelled', 'trialing'
  
  -- Billing cycle
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP,
  
  -- Pricing
  amount_cents INTEGER NOT NULL, -- 9900, 29900, 99900
  currency VARCHAR(3) DEFAULT 'usd',
  interval VARCHAR(20) DEFAULT 'month', -- 'month', 'year'
  
  -- Trial
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
```

**4. `audit_usage` Table** (Track usage for billing)
```sql
CREATE TABLE audit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  audit_id UUID NOT NULL,
  audit_type VARCHAR(20) NOT NULL, -- 'website', 'pitch_deck', 'product', 'mobile_app'
  
  -- Billing period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES users(id)
);

CREATE INDEX idx_audit_usage_org_period ON audit_usage(organization_id, period_start, period_end);
```

**5. `api_keys` Table** (For Growth/Unicorn tiers)
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- 'Production API Key'
  key_hash VARCHAR(255) NOT NULL, -- bcrypt hash of API key
  key_preview VARCHAR(20) NOT NULL, -- 'ak_live_abc...xyz' (last 4 chars)
  
  -- Permissions
  scopes JSONB DEFAULT '["audits:read", "audits:create"]',
  
  -- Rate limiting
  rate_limit_per_hour INTEGER DEFAULT 50,
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'revoked'
  expires_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
```

**6. Per-Organization Schema** (created dynamically)
```sql
-- Created when organization signs up
CREATE SCHEMA org_abc123;

-- Organization-specific tables
CREATE TABLE org_abc123.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  title VARCHAR(500),
  overall_score INTEGER,
  sections JSONB,
  
  -- Custom fields (Unicorn tier)
  custom_fields JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  
  -- Client info (optional)
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  shared_with_client BOOLEAN DEFAULT false,
  share_token VARCHAR(100) UNIQUE
);

CREATE TABLE org_abc123.branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  company_name VARCHAR(255),
  company_website TEXT,
  email_from_name VARCHAR(255),
  email_footer_text TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE org_abc123.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  company VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 Authentication & User Management

### Auth System Implementation

**Technology Stack:**
- **JWT tokens** for session management
- **bcrypt** for password hashing
- **Email verification** (Resend or SendGrid)
- **OAuth** (optional): Google, Microsoft for SSO

**Auth Routes:**

**1. `server/routes/auth.ts`**
```typescript
import { RequestHandler } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  tier: 'starter' | 'growth' | 'unicorn';
}

export const handleSignup: RequestHandler = async (req, res) => {
  try {
    const { email, password, fullName, organizationName, tier } = req.body as SignupRequest;
    
    // Validate email uniqueness
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create organization
    const orgSlug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const orgResult = await db.query(`
      INSERT INTO organizations (name, slug, tier, audit_limit, status)
      VALUES ($1, $2, $3, $4, 'trialing')
      RETURNING id
    `, [organizationName, orgSlug, tier, getAuditLimit(tier)]);
    
    const orgId = orgResult.rows[0].id;
    
    // Create organization schema
    await db.query(`CREATE SCHEMA IF NOT EXISTS org_${orgId.replace(/-/g, '')}`);
    await createOrgTables(orgId);
    
    // Create user (owner)
    const userResult = await db.query(`
      INSERT INTO users (organization_id, email, password_hash, full_name, role, email_verified)
      VALUES ($1, $2, $3, $4, 'owner', false)
      RETURNING id
    `, [orgId, email, passwordHash, fullName]);
    
    const userId = userResult.rows[0].id;
    
    // Send verification email
    await sendVerificationEmail(email, userId);
    
    // Generate JWT
    const token = jwt.sign(
      { userId, orgId, role: 'owner' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: userId,
        email,
        fullName,
        role: 'owner',
        organizationId: orgId
      }
    });
    
  } catch (error) {
    console.error('[AUTH] Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
};

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const userResult = await db.query(`
      SELECT u.*, o.tier, o.status as org_status
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      WHERE u.email = $1
    `, [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Check organization status
    if (user.org_status !== 'active' && user.org_status !== 'trialing') {
      return res.status(403).json({ 
        error: 'Account suspended. Please contact support or update billing.' 
      });
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, orgId: user.organization_id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        organizationId: user.organization_id,
        tier: user.tier
      }
    });
    
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Middleware to protect routes
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Attach to request
    req.user = {
      userId: decoded.userId,
      orgId: decoded.orgId,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

function getAuditLimit(tier: string): number {
  switch (tier) {
    case 'starter': return 10;
    case 'growth': return 50;
    case 'unicorn': return 999999;
    default: return 10;
  }
}
```

---

## 💳 Stripe Integration (Billing)

### Subscription Management

**1. `server/routes/billing.ts`**
```typescript
import Stripe from 'stripe';
import { RequestHandler } from 'express';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
});

// Stripe Price IDs (create these in Stripe Dashboard)
const PRICE_IDS = {
  starter: 'price_starter_monthly', // $99/month
  growth: 'price_growth_monthly',   // $299/month
  unicorn: 'price_unicorn_monthly'  // $999/month
};

export const handleCreateCheckoutSession: RequestHandler = async (req, res) => {
  try {
    const { tier } = req.body;
    const { orgId, userId } = req.user!;
    
    // Get organization
    const orgResult = await db.query(
      'SELECT * FROM organizations WHERE id = $1',
      [orgId]
    );
    
    const org = orgResult.rows[0];
    
    // Create Stripe customer if doesn't exist
    let customerId = org.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: org.billing_email,
        metadata: {
          organization_id: orgId,
          organization_name: org.name
        }
      });
      
      customerId = customer.id;
      
      await db.query(
        'UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, orgId]
      );
    }
    
    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[tier as keyof typeof PRICE_IDS],
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/pricing`,
      metadata: {
        organization_id: orgId,
        tier: tier
      },
      subscription_data: {
        trial_period_days: 14, // 14-day free trial
        metadata: {
          organization_id: orgId
        }
      }
    });
    
    res.json({ sessionUrl: session.url });
    
  } catch (error) {
    console.error('[BILLING] Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

export const handleStripeWebhook: RequestHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[WEBHOOK] Signature verification failed:', err);
    return res.status(400).send('Webhook signature verification failed');
  }
  
  // Handle events
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
      
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
      break;
      
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
      
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
      
    default:
      console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
  }
  
  res.json({ received: true });
};

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.organization_id;
  
  if (!orgId) return;
  
  // Update organization with subscription
  await db.query(`
    UPDATE organizations 
    SET 
      subscription_id = $1,
      status = 'active',
      current_period_start = NOW(),
      current_period_end = NOW() + INTERVAL '1 month'
    WHERE id = $2
  `, [session.subscription, orgId]);
  
  console.log(`[BILLING] Subscription activated for org ${orgId}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata?.organization_id;
  
  if (!orgId) return;
  
  // Determine tier from price ID
  const priceId = subscription.items.data[0].price.id;
  const tier = Object.keys(PRICE_IDS).find(
    key => PRICE_IDS[key as keyof typeof PRICE_IDS] === priceId
  );
  
  // Update organization
  await db.query(`
    UPDATE organizations 
    SET 
      tier = $1,
      status = $2,
      subscription_id = $3,
      current_period_start = $4,
      current_period_end = $5,
      audit_limit = $6,
      audits_used_this_period = 0
    WHERE id = $7
  `, [
    tier,
    subscription.status === 'active' ? 'active' : 'past_due',
    subscription.id,
    new Date(subscription.current_period_start * 1000),
    new Date(subscription.current_period_end * 1000),
    getAuditLimit(tier!),
    orgId
  ]);
  
  console.log(`[BILLING] Subscription updated for org ${orgId} - Tier: ${tier}`);
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata?.organization_id;
  
  if (!orgId) return;
  
  await db.query(`
    UPDATE organizations 
    SET status = 'cancelled'
    WHERE id = $1
  `, [orgId]);
  
  console.log(`[BILLING] Subscription cancelled for org ${orgId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Reset audit count for new billing period
  const orgId = invoice.subscription_details?.metadata?.organization_id;
  
  if (!orgId) return;
  
  await db.query(`
    UPDATE organizations 
    SET 
      audits_used_this_period = 0,
      status = 'active'
    WHERE id = $1
  `, [orgId]);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const orgId = invoice.subscription_details?.metadata?.organization_id;
  
  if (!orgId) return;
  
  await db.query(`
    UPDATE organizations 
    SET status = 'past_due'
    WHERE id = $1
  `, [orgId]);
  
  // Send email notification about failed payment
  // TODO: Implement email notification
}

function getAuditLimit(tier: string): number {
  switch (tier) {
    case 'starter': return 10;
    case 'growth': return 50;
    case 'unicorn': return 999999;
    default: return 10;
  }
}
```

---

## 🎨 White-Labeling Features

### Customization Options

**1. Branding Settings UI** (`client/pages/BrandingSettings.tsx`)
```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function BrandingSettings() {
  const [branding, setBranding] = useState({
    logoUrl: '',
    primaryColor: '#3B82F6',
    companyName: '',
    customDomain: ''
  });
  
  const handleSave = async () => {
    await fetch('/api/branding', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(branding)
    });
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">White-Label Branding</h1>
      
      <div className="space-y-4">
        <div>
          <Label>Company Name</Label>
          <Input
            value={branding.companyName}
            onChange={(e) => setBranding({...branding, companyName: e.target.value})}
            placeholder="Your Agency Name"
          />
        </div>
        
        <div>
          <Label>Logo URL</Label>
          <Input
            value={branding.logoUrl}
            onChange={(e) => setBranding({...branding, logoUrl: e.target.value})}
            placeholder="https://your-site.com/logo.png"
          />
          {branding.logoUrl && (
            <img src={branding.logoUrl} alt="Logo preview" className="mt-2 h-12" />
          )}
        </div>
        
        <div>
          <Label>Primary Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={branding.primaryColor}
              onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
              className="w-20"
            />
            <Input
              value={branding.primaryColor}
              onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
              placeholder="#3B82F6"
            />
          </div>
        </div>
        
        <div>
          <Label>Custom Domain (Growth+ only)</Label>
          <Input
            value={branding.customDomain}
            onChange={(e) => setBranding({...branding, customDomain: e.target.value})}
            placeholder="audits.youragency.com"
            disabled={tier === 'starter'}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Point your CNAME to: audits.brandwhisperer.com
          </p>
        </div>
        
        <Button onClick={handleSave}>Save Branding</Button>
      </div>
    </div>
  );
}
```

**2. Dynamic Branding Loader** (`client/lib/branding.ts`)
```typescript
export async function loadBranding() {
  // Check if custom domain or subdomain
  const hostname = window.location.hostname;
  
  // If custom domain, fetch branding by domain
  if (hostname !== 'brandwhisperer.com' && hostname !== 'localhost') {
    const response = await fetch(`/api/branding/by-domain/${hostname}`);
    if (response.ok) {
      const branding = await response.json();
      applyBranding(branding);
    }
  }
  
  // Otherwise, fetch by authenticated user's org
  const token = localStorage.getItem('token');
  if (token) {
    const response = await fetch('/api/branding', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const branding = await response.json();
      applyBranding(branding);
    }
  }
}

function applyBranding(branding: any) {
  // Apply logo
  const logoElements = document.querySelectorAll('[data-logo]');
  logoElements.forEach(el => {
    if (branding.logoUrl) {
      (el as HTMLImageElement).src = branding.logoUrl;
    }
  });
  
  // Apply primary color
  if (branding.primaryColor) {
    document.documentElement.style.setProperty('--primary', branding.primaryColor);
  }
  
  // Apply company name
  const companyNameElements = document.querySelectorAll('[data-company-name]');
  companyNameElements.forEach(el => {
    el.textContent = branding.companyName || 'Brand Whisperer';
  });
}
```

---

## 🔌 API Access (Growth/Unicorn Tiers)

### API Endpoints for Agencies

**1. Create API Key** (`server/routes/api-keys.ts`)
```typescript
export const handleCreateAPIKey: RequestHandler = async (req, res) => {
  const { orgId, userId } = req.user!;
  const { name } = req.body;
  
  // Check tier (Growth or Unicorn only)
  const orgResult = await db.query(
    'SELECT tier FROM organizations WHERE id = $1',
    [orgId]
  );
  
  const tier = orgResult.rows[0]?.tier;
  
  if (tier === 'starter') {
    return res.status(403).json({ 
      error: 'API access is available on Growth and Unicorn tiers only' 
    });
  }
  
  // Generate API key
  const apiKey = `ak_live_${generateRandomString(32)}`;
  const keyHash = await bcrypt.hash(apiKey, 10);
  const keyPreview = `ak_live_...${apiKey.slice(-4)}`;
  
  // Store in database
  await db.query(`
    INSERT INTO api_keys (organization_id, name, key_hash, key_preview, created_by)
    VALUES ($1, $2, $3, $4, $5)
  `, [orgId, name, keyHash, keyPreview, userId]);
  
  // Return API key ONCE (can't retrieve again)
  res.json({ 
    apiKey,
    preview: keyPreview,
    message: 'Save this API key - you won\'t be able to see it again!' 
  });
};
```

**2. Audit API Endpoint** (for agencies to integrate)
```typescript
export const handleAPIAudit: RequestHandler = async (req, res) => {
  try {
    // Validate API key
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    // Find API key in database
    const keyResult = await db.query(`
      SELECT ak.*, o.tier, o.status, o.audit_limit, o.audits_used_this_period
      FROM api_keys ak
      JOIN organizations o ON ak.organization_id = o.id
      WHERE ak.status = 'active'
    `);
    
    let validKey = null;
    for (const row of keyResult.rows) {
      const isValid = await bcrypt.compare(apiKey, row.key_hash);
      if (isValid) {
        validKey = row;
        break;
      }
    }
    
    if (!validKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Check organization status
    if (validKey.status !== 'active') {
      return res.status(403).json({ error: 'Subscription inactive' });
    }
    
    // Check audit limit
    if (validKey.audits_used_this_period >= validKey.audit_limit) {
      return res.status(429).json({ 
        error: 'Monthly audit limit reached',
        limit: validKey.audit_limit,
        used: validKey.audits_used_this_period
      });
    }
    
    // Process audit request
    const { url, type } = req.body;
    
    const audit = await generateAudit(url, type, validKey.organization_id);
    
    // Increment usage counter
    await db.query(`
      UPDATE organizations 
      SET audits_used_this_period = audits_used_this_period + 1 
      WHERE id = $1
    `, [validKey.organization_id]);
    
    // Track API key usage
    await db.query(`
      UPDATE api_keys 
      SET last_used_at = NOW(), usage_count = usage_count + 1 
      WHERE id = $1
    `, [validKey.id]);
    
    res.json(audit);
    
  } catch (error) {
    console.error('[API] Audit error:', error);
    res.status(500).json({ error: 'Audit failed' });
  }
};
```

**API Documentation for Agencies:**
```markdown
# Brand Whisperer API Documentation

Base URL: `https://api.brandwhisperer.com/v1`

## Authentication
All requests require an API key in the header:
```
X-API-Key: ak_live_your_api_key_here
```

## Endpoints

### Create Audit
`POST /audits`

**Request:**
```json
{
  "url": "https://example.com",
  "type": "website",
  "client_name": "Optional Client Name",
  "client_email": "client@example.com"
}
```

**Response:**
```json
{
  "id": "audit_abc123",
  "url": "https://example.com",
  "type": "website",
  "overall_score": 78,
  "sections": [...],
  "share_url": "https://youraudits.com/audit/abc123",
  "created_at": "2025-12-10T12:00:00Z"
}
```

### Get Audit
`GET /audits/:id`

### List Audits
`GET /audits?limit=50&offset=0`

### Usage Stats
`GET /usage`

**Response:**
```json
{
  "tier": "growth",
  "limit": 50,
  "used": 23,
  "remaining": 27,
  "period_start": "2025-12-01",
  "period_end": "2025-12-31"
}
```
```

---

## 🚀 Onboarding Flow

### New Agency Signup Process

**Step 1: Sign Up Page** (`client/pages/Signup.tsx`)
```typescript
export default function Signup() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    organizationName: '',
    tier: 'starter'
  });
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-6">
        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold mb-4">Choose Your Plan</h2>
            <div className="space-y-3">
              {/* Pricing cards */}
              <PricingCard 
                tier="starter" 
                price="$99/mo" 
                selected={formData.tier === 'starter'}
                onClick={() => setFormData({...formData, tier: 'starter'})}
              />
              <PricingCard 
                tier="growth" 
                price="$299/mo" 
                selected={formData.tier === 'growth'}
                onClick={() => setFormData({...formData, tier: 'growth'})}
              />
              <PricingCard 
                tier="unicorn" 
                price="$999/mo" 
                selected={formData.tier === 'unicorn'}
                onClick={() => setFormData({...formData, tier: 'unicorn'})}
              />
            </div>
            <Button onClick={() => setStep(2)} className="w-full mt-4">
              Continue
            </Button>
          </>
        )}
        
        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold mb-4">Create Your Account</h2>
            {/* Account details form */}
            <Input 
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
            {/* ... other fields ... */}
            <Button onClick={handleSignup} className="w-full mt-4">
              Start 14-Day Free Trial
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
```

**Step 2: Email Verification**
- Send verification email with unique link
- Verify email before allowing full access

**Step 3: Onboarding Wizard** (`client/pages/Onboarding.tsx`)
```typescript
export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  
  const steps = [
    {
      title: 'Set Up Branding',
      component: <BrandingSetup />
    },
    {
      title: 'Invite Team Members',
      component: <TeamInvite />
    },
    {
      title: 'Run Your First Audit',
      component: <FirstAudit />
    },
    {
      title: 'Share with Client',
      component: <ShareAudit />
    }
  ];
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Progress value={(currentStep / steps.length) * 100} className="mb-8" />
      
      <h1 className="text-3xl font-bold mb-2">
        Welcome to Brand Whisperer!
      </h1>
      <p className="text-muted-foreground mb-8">
        Let's get you set up in 4 easy steps
      </p>
      
      {steps[currentStep - 1].component}
      
      <div className="flex justify-between mt-8">
        {currentStep > 1 && (
          <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
            Previous
          </Button>
        )}
        <Button onClick={() => setCurrentStep(currentStep + 1)}>
          {currentStep === steps.length ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
```

**Step 4: Billing Setup**
- Redirect to Stripe Checkout
- 14-day free trial (no credit card for Starter tier trial)
- Collect payment method during trial

---

## 📊 Admin Dashboard

### Agency Dashboard UI

**1. Dashboard Overview** (`client/pages/Dashboard.tsx`)
```typescript
export default function Dashboard() {
  const { stats, tier, usage } = useDashboardData();
  
  return (
    <div className="p-6 space-y-6">
      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Audits This Month"
          value={`${usage.used} / ${usage.limit}`}
          icon={<FileText />}
          progress={(usage.used / usage.limit) * 100}
        />
        <StatCard
          title="Team Members"
          value={stats.teamMembers}
          icon={<Users />}
        />
        <StatCard
          title="Clients Served"
          value={stats.clientsServed}
          icon={<Briefcase />}
        />
        <StatCard
          title="Avg. Audit Score"
          value={stats.avgScore}
          icon={<TrendingUp />}
        />
      </div>
      
      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex gap-3">
          <Button><Plus /> New Audit</Button>
          <Button variant="outline"><Users /> Invite Team</Button>
          <Button variant="outline"><Settings /> Branding</Button>
        </div>
      </Card>
      
      {/* Recent Audits */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Audits</h3>
        <AuditsTable audits={stats.recentAudits} />
      </Card>
      
      {/* Upgrade CTA (if Starter tier) */}
      {tier === 'starter' && (
        <Card className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <h3 className="text-xl font-bold mb-2">Unlock All Features</h3>
          <p className="mb-4">
            Upgrade to Growth to get API access, custom domains, and 50 audits/month
          </p>
          <Button variant="secondary">Upgrade Now</Button>
        </Card>
      )}
    </div>
  );
}
```

**2. Team Management** (`client/pages/TeamSettings.tsx`)
```typescript
export default function TeamSettings() {
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  
  const handleInvite = async () => {
    await fetch('/api/team/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ email: inviteEmail, role: 'member' })
    });
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Team Members</h1>
      
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Invite Team Member</h3>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="colleague@youragency.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Button onClick={handleInvite}>Send Invite</Button>
        </div>
      </Card>
      
      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(member => (
              <TableRow key={member.id}>
                <TableCell>{member.fullName}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>{member.role}</TableCell>
                <TableCell>
                  <Badge variant={member.emailVerified ? 'success' : 'warning'}>
                    {member.emailVerified ? 'Active' : 'Pending'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">Remove</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
```

---

## 📈 Implementation Timeline

### Week 1 (Days 1-5): Foundation
**Days 1-2: Database & Auth**
- [ ] Set up PostgreSQL multi-tenancy schema
- [ ] Create `organizations`, `users`, `subscriptions` tables
- [ ] Implement JWT authentication
- [ ] Build signup/login endpoints
- [ ] Test organization creation

**Days 3-4: Stripe Integration**
- [ ] Set up Stripe account and products
- [ ] Create Stripe price IDs for tiers
- [ ] Implement checkout session creation
- [ ] Build webhook handler
- [ ] Test subscription flow

**Day 5: Basic Dashboard**
- [ ] Create dashboard layout
- [ ] Build usage stats display
- [ ] Implement audit list view
- [ ] Add tier-based feature gating

### Week 2 (Days 6-10): White-Labeling
**Days 6-7: Branding System**
- [ ] Build branding settings UI
- [ ] Implement logo upload/storage
- [ ] Create color customization
- [ ] Build dynamic branding loader
- [ ] Test branding application

**Days 8-9: Custom Domains**
- [ ] Set up CNAME routing infrastructure
- [ ] Implement domain verification
- [ ] Build domain management UI
- [ ] Test custom domain branding

**Day 10: API Access**
- [ ] Create API key management
- [ ] Build API endpoints for audits
- [ ] Implement rate limiting
- [ ] Write API documentation

### Week 3 (Days 11-15): Onboarding & Polish
**Days 11-12: Onboarding Flow**
- [ ] Build multi-step signup wizard
- [ ] Create email verification system
- [ ] Implement onboarding checklist
- [ ] Build team invitation system

**Days 13-14: Protection & Enforcement**
- [ ] Add watermark to Starter tier PDFs
- [ ] Implement "Powered by" attribution
- [ ] Build audit limit enforcement
- [ ] Add tier-based feature checks

**Day 15: Testing & Bug Fixes**
- [ ] End-to-end testing of signup flow
- [ ] Test all three tiers
- [ ] Verify Stripe webhooks
- [ ] Test custom branding
- [ ] Security audit

### Week 4 (Days 16-21): Launch Prep
**Days 16-17: Documentation**
- [ ] Write user documentation
- [ ] Create API documentation
- [ ] Build help center articles
- [ ] Record onboarding videos

**Days 18-19: Marketing**
- [ ] Create pricing page
- [ ] Build landing page for agencies
- [ ] Design email templates
- [ ] Prepare launch announcement

**Days 20-21: Soft Launch**
- [ ] Deploy to production
- [ ] Invite beta agencies
- [ ] Monitor for issues
- [ ] Gather feedback

---

## 💰 Revenue Projections

### Year 1 Targets

**Conservative Scenario:**
- Month 1-3: 5 Starter ($495/mo) + 2 Growth ($598/mo) = **$1,093/mo**
- Month 4-6: 15 Starter + 5 Growth + 1 Unicorn = **$3,484/mo**
- Month 7-9: 30 Starter + 10 Growth + 2 Unicorn = **$7,968/mo**
- Month 10-12: 50 Starter + 20 Growth + 5 Unicorn = **$15,930/mo**

**Year 1 Total (Conservative): ~$60,000 MRR by Month 12**

**Optimistic Scenario:**
- Month 12: 100 Starter + 40 Growth + 10 Unicorn = **$31,860/mo**

**Year 1 Total (Optimistic): ~$120,000 MRR by Month 12**

### Customer Acquisition Strategy

**Channel 1: Content Marketing**
- Agency-focused blog posts
- Case studies from beta users
- YouTube tutorials
- SEO for "white-label audit tools"

**Channel 2: Partner Program**
- Affiliate commissions (20% recurring)
- Agency partnerships
- WordPress plugin integrations

**Channel 3: Direct Outreach**
- LinkedIn agency targeting
- Email campaigns to digital agencies
- Cold outreach to marketing consultancies

**Channel 4: Product Hunt & Communities**
- Product Hunt launch
- Reddit (r/agency, r/marketing)
- Indie Hackers showcase

---

## 🔒 Security Considerations

### Data Isolation
- ✅ Schema-based multi-tenancy
- ✅ Row-level security policies
- ✅ API key scoping per organization
- ✅ Audit trails for all actions

### Authentication Security
- ✅ Password hashing (bcrypt, rounds=10)
- ✅ JWT with short expiration (7 days)
- ✅ Email verification required
- ✅ Rate limiting on auth endpoints

### Payment Security
- ✅ PCI compliance via Stripe
- ✅ No credit card storage
- ✅ Webhook signature verification
- ✅ Secure API key generation

### Code Protection
- ✅ Obfuscated frontend code
- ✅ API-only access to core logic
- ✅ Terms of Service enforcement
- ✅ License key validation

---

## 🎓 Success Metrics

### Technical KPIs:
- Multi-tenant database performance: <100ms query time
- Signup conversion rate: >40%
- Onboarding completion rate: >70%
- API uptime: >99.9%
- Custom domain setup success: >90%

### Business KPIs:
- Monthly Recurring Revenue (MRR): $10k+ by Month 6
- Customer Acquisition Cost (CAC): <$200
- Lifetime Value (LTV): >$2,000
- Churn rate: <5% monthly
- Net Promoter Score (NPS): >50

### Product KPIs:
- Average audits per agency: 15/month
- Starter to Growth upgrade rate: >15%
- Growth to Unicorn upgrade rate: >5%
- Team member invites: 2+ per agency
- API adoption (Growth+): >60%

---

## 🚧 Risks & Mitigation

### Risk 1: Agencies Canceling After Trial
**Mitigation:**
- Require payment method upfront (even for trial)
- Send engagement emails during trial
- Offer onboarding call for Growth+ tiers
- Provide quick wins in first week

### Risk 2: Audit Quality Issues at Scale
**Mitigation:**
- Implement audit quality monitoring
- Add manual review for flagged audits
- Build feedback loop into product
- Continuously improve AI prompts

### Risk 3: Competition from Established Tools
**Mitigation:**
- Focus on niche (brand audits specifically)
- Emphasize white-label capability
- Build strong agency relationships
- Innovate faster with AI improvements

### Risk 4: Stripe/Payment Issues
**Mitigation:**
- Handle all webhook events properly
- Implement grace periods for failed payments
- Clear communication on billing issues
- Easy subscription management

---

## 📚 Additional Features (Future)

### Phase 4.1 (Post-Launch):
- **Audit Templates:** Allow agencies to create custom audit templates
- **Client Portal:** Give agencies' clients login access to view audits
- **Scheduled Audits:** Recurring audits for monitoring
- **Competitor Analysis:** Automated competitor audit comparisons
- **Email Campaigns:** Drip campaigns for audit follow-ups

### Phase 4.2 (Growth):
- **Reseller Program:** Agencies can resell at their own pricing
- **WordPress Plugin:** Embed audits in WordPress sites
- **Zapier Integration:** Connect to 5000+ apps
- **Mobile Apps:** iOS/Android apps for agencies
- **Advanced Analytics:** Track audit performance over time

---

## ✅ Definition of Done

Phase 4 is complete when:

- [x] Multi-tenant database architecture functional
- [x] Stripe subscription billing working end-to-end
- [x] All 3 pricing tiers properly enforced
- [x] White-label branding (logo, colors) functional
- [x] Custom domains working (Growth+ tiers)
- [x] API access implemented (Growth+ tiers)
- [x] Onboarding flow tested with 10+ beta agencies
- [x] "Powered by" watermark on Starter tier
- [x] Audit limits enforced per tier
- [x] Team member invitation system working
- [x] Dashboard showing usage stats
- [x] Email verification implemented
- [x] Terms of Service enforcement
- [x] API documentation published
- [x] Successfully processed 100+ paid audits
- [x] 10+ paying agencies onboarded

---

## 🎯 Go-to-Market Strategy

### Launch Timeline:

**T-30 days:** Build beta waitlist
- Create landing page
- Share on Twitter/LinkedIn
- Reach out to agency contacts

**T-14 days:** Private beta (10 agencies)
- Hand-pick agencies
- Offer free access for feedback
- Iterate based on feedback

**T-7 days:** Public beta (limited spots)
- Open to 50 agencies
- Offer 50% discount for early adopters
- Gather testimonials

**Day 0: Public Launch**
- Product Hunt launch
- Email waitlist
- Social media campaign
- PR outreach to marketing publications

**T+30 days:** Iterate & Scale
- Address feedback
- Improve onboarding
- Expand marketing
- Build partnerships

---

**Status:** 📋 Ready for Implementation  
**Priority:** Critical (Revenue Generation)  
**Estimated Effort:** 14-21 days  
**Dependencies:** Phase 2 & 3 recommended (for full value proposition)  
**Revenue Potential:** $10k-30k MRR by Month 6

---

**Next Steps:**
1. Set up Stripe account and create products
2. Design database schema and run migrations
3. Build authentication system
4. Implement Stripe webhook handlers
5. Create onboarding flow
6. Launch private beta with 5 agencies
7. Iterate based on feedback
8. Public launch 🚀

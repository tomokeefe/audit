# Complete Tech Stack - Brand Audit Application

## Architecture Overview

**Type:** Full-stack web application (SPA + API)  
**Pattern:** Client-Server with separate frontend and backend  
**Deployment:** Docker container on Railway  

## Frontend Stack

### Core Framework
- **React 18.3.1** - UI library
- **TypeScript 5.9.2** - Type safety
- **Vite 7.1.2** - Build tool and dev server
- **React Router DOM 6.30.1** - Client-side routing

### UI Components & Styling
- **Radix UI** - Headless component primitives
  - 20+ components (accordion, dialog, dropdown, etc.)
  - Accessible, unstyled base components
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
  - `tailwindcss-animate` - Animation utilities
  - `@tailwindcss/typography` - Beautiful typography defaults
- **Framer Motion 12.23.12** - Animation library
- **Lucide React 0.539.0** - Icon library
- **shadcn/ui** - Component system built on Radix + Tailwind
  - Custom components in `client/components/ui/`

### State Management & Data Fetching
- **TanStack Query (React Query) 5.84.2** - Server state management
- **React Hook Form 7.62.0** - Form state management
- **Zod 3.25.76** - Schema validation

### Visualization
- **Recharts 2.12.7** - Chart library for audit analytics
- **Three.js 0.176.0** - 3D graphics (optional features)
- **@react-three/fiber 8.18.0** - React renderer for Three.js
- **@react-three/drei 9.122.0** - Three.js helpers

### Utilities
- **date-fns 4.1.0** - Date manipulation
- **clsx 2.1.1** - Conditional className utility
- **tailwind-merge 2.6.0** - Merge Tailwind classes
- **class-variance-authority 0.7.1** - Component variants

### UI Libraries
- **Sonner 1.7.4** - Toast notifications
- **cmdk 1.1.1** - Command menu
- **embla-carousel-react 8.6.0** - Carousel/slider
- **vaul 1.1.2** - Drawer component
- **input-otp 1.4.2** - OTP input component
- **next-themes 0.4.6** - Theme management

## Backend Stack

### Runtime & Server
- **Node.js 20** - JavaScript runtime
- **Express 5.1.0** - Web application framework
- **TypeScript 5.9.2** - Type safety on backend

### Web Scraping & Analysis
- **Puppeteer 24.32.0** - Headless Chrome browser
  - Used for Cloudflare bypass
  - JavaScript rendering
  - Complex website scraping
- **Axios 1.11.0** - HTTP client for standard scraping
- **Cheerio 1.1.2** - HTML parsing (jQuery-like API)

### AI/LLM Integration
- **Grok API (xAI)** - AI analysis engine
  - Analyzes website content
  - Generates brand audit insights
  - Scores across 10 categories
  - Provides recommendations
- **Google Generative AI 0.24.1** - Alternative AI provider (Gemini)

### Database
- **PostgreSQL** - Relational database
- **pg 8.11.3** - PostgreSQL client for Node.js
- **Neon** - Serverless PostgreSQL provider
  - Connection pooling
  - SSL/TLS connections
  - Automatic backups

### API & Middleware
- **CORS 2.8.5** - Cross-Origin Resource Sharing
- **dotenv 17.2.1** - Environment variable management
- **Zod 3.25.76** - Runtime type validation

## Build Tools & Development

### Build System
- **Vite 7.1.2** - Fast build tool
  - Client: SPA build
  - Server: SSR/API build
- **SWC** - Super-fast compiler
  - `@swc/core 1.13.3`
  - `@vitejs/plugin-react-swc 4.0.0`

### Package Manager
- **pnpm 10.14.0** - Fast, disk-efficient package manager

### Code Quality
- **TypeScript 5.9.2** - Static type checking
- **Prettier 3.6.2** - Code formatter
- **Vitest 3.2.4** - Unit testing framework
- **tsx 4.20.3** - TypeScript execution

### CSS Processing
- **PostCSS 8.5.6** - CSS transformations
- **Autoprefixer 10.4.21** - Vendor prefix automation

## Infrastructure & Deployment

### Containerization
- **Docker** - Container platform
  - `Dockerfile` with Node.js 20
  - Chromium installation for Puppeteer
  - Multi-stage build (build + runtime)

### Hosting
- **Railway** - Platform-as-a-Service
  - Automatic deployments from Git
  - Environment variable management
  - Integrated PostgreSQL (via Neon)
  - SSL/TLS certificates
  - Custom domains

### Database Hosting
- **Neon** - Serverless PostgreSQL
  - Connection pooling
  - Automatic scaling
  - Branch databases for development

## API Architecture

### Audit Flow

```
1. Frontend → POST /api/audit → Backend
2. Backend → scrapeWebsite() → Axios/Puppeteer
3. Backend → generateAudit() → Grok API
4. Backend → storeAuditResult() → PostgreSQL
5. Backend → Response → Frontend
```

### Key Endpoints

**Health & Diagnostics:**
- `GET /api/ping` - Server health check
- `GET /api/status` - Simple status check
- `GET /api/health` - Detailed health with DB status

**Audit Operations:**
- `POST /api/audit` - Create new audit (standard)
- `GET /api/audit/progress` - Create audit with SSE progress
- `GET /api/audits` - List all audits
- `GET /api/audits/:id` - Get specific audit
- `POST /api/audits` - Save audit
- `DELETE /api/audits/:id` - Delete audit

**Demo/Testing:**
- `POST /api/demo` - Generate demo audit
- `POST /api/test-save` - Test audit saving

### Data Flow

```
User Input (URL)
    ↓
Frontend (React + React Query)
    ↓
API Request (/api/audit)
    ↓
Backend (Express)
    ↓
├─ Web Scraper (Axios → Puppeteer fallback)
│   ├─ Detect Cloudflare
│   ├─ Extract content, navigation, etc.
│   └─ Return structured data
    ↓
├─ AI Analysis (Grok API)
│   ├─ Send scraped content
│   ├─ Request analysis across 10 categories
│   └─ Parse response + extract scores
    ↓
├─ Database Storage (PostgreSQL)
│   ├─ Save audit results
│   └─ Store for sharing/history
    ↓
Frontend (Display Results)
    ├─ Overall score
    ├─ Category breakdowns
    ├─ Recommendations
    └─ Evidence/screenshots
```

## Audit Analysis Categories

The AI analyzes websites across 10 categories:

1. **Brand Consistency & Identity** (10%)
2. **Messaging & Positioning** (15%)
3. **Content Strategy** (10%)
4. **Design & Visual Brand** (15%)
5. **User Experience (UX)** (10%)
6. **Digital Presence & SEO** (10%)
7. **Customer Experience** (10%)
8. **Competitive Positioning** (10%)
9. **Visual Design & Aesthetics** (5%)
10. **Consistency & Compliance** (5%)

## Cloudflare Bypass Strategy

**Three-tier scraping approach:**

1. **Axios (Standard)** - Fast HTTP requests
   - First attempt for all sites
   - Works for 90% of websites

2. **Puppeteer (Headless Browser)** - JavaScript rendering
   - Activated when Cloudflare detected
   - Renders JavaScript, bypasses bot protection
   - Slower but more reliable

3. **Fallback Data** - Demo/placeholder
   - Used if both scraping methods fail
   - Prevents complete failure

## Environment Variables

```bash
# AI API Keys
GROK_API_KEY=xai-...              # xAI Grok API key
GEMINI_API_KEY=AIza...            # Google Gemini API key

# Database
DATABASE_URL=postgresql://...     # Neon PostgreSQL connection string

# Server Configuration
PORT=8080                         # Server port (auto-set by Railway)
NODE_ENV=production               # Environment mode

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium  # Chromium path in Docker
```

## File Structure

```
.
├── client/                  # Frontend application
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── Header.tsx     # Site header
│   │   └── ...
│   ├── pages/             # Route pages
│   │   ├── Index.tsx      # Home/audit form
│   │   ├── AuditResults.tsx
│   │   └── ...
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities
│   └── utils/             # Helper functions
│
├── server/                 # Backend application
│   ├── routes/            # API route handlers
│   │   ├── audit.ts       # Main audit logic
│   │   ├── audit-progress.ts  # SSE progress
│   │   └── audit-storage.ts   # DB operations
│   ├── db/                # Database layer
│   │   ├── init.ts        # DB initialization
│   │   └── audit-service.ts   # Audit CRUD
│   ├── constants/         # Scoring weights
│   ├── utils/             # Backend utilities
│   ├── index.ts           # Express app setup
│   └── node-build.ts      # Production server
│
├── shared/                # Shared types/interfaces
│   └── api.ts            # API types
│
├── Dockerfile            # Container definition
├── package.json          # Dependencies
└── vite.config.*.ts     # Build configuration
```

## Performance Characteristics

### Build Performance
- **Dev server startup:** ~500ms
- **First build:** 5-7 minutes (Chromium download)
- **Incremental builds:** 2-3 minutes
- **Hot reload:** <100ms

### Runtime Performance
- **Standard audit:** 15-20 seconds
- **Puppeteer audit:** 20-30 seconds (browser startup)
- **Database query:** <100ms
- **API response:** 50-200ms (cached)

### Resource Usage
- **Image size:** ~450MB (with Chromium)
- **Memory (idle):** ~150MB
- **Memory (audit active):** ~300-400MB
- **CPU (audit):** Moderate (AI processing)

## Security Features

- **HTTPS/SSL:** Enforced by Railway
- **CORS:** Configured for production
- **Environment variables:** Secure secret storage
- **SQL injection:** Prevented by parameterized queries
- **XSS:** React's built-in protection
- **Rate limiting:** Could be added (not yet implemented)

## Scalability

**Current architecture supports:**
- Multiple concurrent audits
- Database connection pooling
- Stateless server (horizontal scaling ready)
- CDN-ready static assets

**Future improvements:**
- Redis for caching
- Queue system for audit processing
- CDN integration
- Load balancing

## Development Workflow

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
# → Frontend: http://localhost:8080
# → API: http://localhost:3001

# Build for production
pnpm build
# → Builds client and server

# Start production server
pnpm start
# → Runs built application

# Type checking
pnpm typecheck

# Format code
pnpm format.fix

# Run tests
pnpm test
```

---

**Last Updated:** December 7, 2025  
**Version:** 1.0.0  
**Platform:** Railway  
**Database:** Neon PostgreSQL

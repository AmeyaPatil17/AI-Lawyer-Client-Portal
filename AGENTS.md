# AGENTS.md — Valiant Law Client Portal

## Project Overview

AI-augmented legal intake portal for Ontario wills and business incorporation. Clients complete a guided wizard; lawyers review submissions with risk flags, AI-generated insights, and priority scores; then contact clients to finalize.

**Stack**: Vue 3 + Vite (frontend) · Express + TypeScript (backend) · MongoDB · Dual AI (Gemini + OpenAI) · Socket.IO · Tailwind CSS

**Monorepo**: npm workspaces — `client/` and `server/` packages.

---

## Architecture

```
will_guide/
├── client/               # Vue 3 + Vite frontend
│   ├── src/
│   │   ├── components/   # Reusable UI (AIGuide, PeoplePicker, QuestionHelper, CaseNotes)
│   │   ├── composables/  # 15 Vue 3 composition functions (validation, AI hooks, proactive guide, steps)
│   │   ├── router/       # Vue Router with RBAC navigation guards
│   │   ├── stores/       # 6 Pinia stores (auth, intake, aiChat, triage, incorpIntake, incorpTypes)
│   │   ├── services/     # Client-side service layer
│   │   ├── types/        # TypeScript interfaces
│   │   ├── utils/        # Auth storage, helpers
│   │   ├── views/        # 14 page views + wizard/ (10 steps) + incorporation/ (9 steps)
│   │   └── api.ts        # Axios HTTP client with interceptors
│   └── package.json
│
├── server/               # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/  # 9 request handlers (auth, intake, lawyer, admin, AI, incorporation, etc.)
│   │   ├── middleware/    # auth (JWT), CSRF, rate limiting, request logging, Zod validation
│   │   ├── models/       # 7 Mongoose schemas (User, Intake, RefreshToken, PasswordResetToken, AiUsageLog, AuditLog, SystemSetting)
│   │   ├── routes/       # 6 Express route groups
│   │   ├── schemas/      # Zod validation schemas (intake, incorporation)
│   │   ├── services/     # 26 services (10 AI modules, 2 rules engines, 2 DOCX generators, email, etc.)
│   │   ├── types/        # TypeScript interfaces & DTOs
│   │   ├── errors/       # Structured AppError hierarchy
│   │   ├── config/       # JWT configuration
│   │   ├── utils/        # Index sync, helpers
│   │   └── index.ts      # Entry point (Express + Socket.IO server)
│   └── package.json
│
├── e2e/                  # 16 Playwright E2E test specs
├── .env / .env.example   # Environment configuration
├── Dockerfile            # Multi-stage production build
└── playwright.config.ts  # E2E test configuration
```

---

## Key Concepts

### Workflow
1. **Intake**: Client fills wizard — Wills (10 steps: Profile → Family → Guardians → Executors → Beneficiaries → Assets → POA → Funeral → Prior Wills → Review) or Incorporation (9 steps: Jurisdiction → Structure → Articles → Post-Incorp → Shares → Records → Registrations → Banking → Review).
2. **Review**: Lawyer dashboard shows submissions with risk flags, AI summaries, priority scores, case notes, and clause suggestions. Real-time Socket.IO push updates.
3. **Finalization**: Lawyer contacts client; generates DOCX documents (Client Summary Memo + Draft Will).

### Dual Validation
- **API layer**: `validateBody()` middleware runs Zod schemas on incoming requests.
- **Database layer**: Mongoose `pre('save')` hooks run Zod schemas (`IntakeDataSchema` / `IncorporationDataSchema`) before persisting.

### AI Service Architecture
The AI layer is split into 10 modules behind a barrel export (`aiService.ts`), with **dual-provider support** (Gemini + OpenAI) and admin-configurable runtime settings:

- `aiClient.ts` — Dual Gemini/OpenAI abstraction via `ModelWrapper` interface, token-bucket rate limiter, retry with exponential backoff
- `aiChatService.ts` — Multi-turn chat + WebSocket streaming, two system prompts (wills + incorporation), 10-message history window
- `aiAnalysisService.ts` — Logic validation, stress testing (max 3 questions), risk explanation, clause suggestions
- `aiParserService.ts` — Asset extraction (text + vision/multimodal) with JSON mode
- `aiScoringService.ts` — Deterministic priority scoring (0–100) + auto-note generation for data changes
- `aiContextSummariser.ts` — Context scoping — `scopeToStep()` and `scopeToFlag()` reduce token usage by 60–80%
- `aiSanitiser.ts` — Prompt injection defense (20+ regex patterns, XML delimiter escaping, allowlisted step/flag enums, control char removal, forensic audit logging)
- `aiCacheService.ts` — In-memory TTL cache with SHA-256 hash keys
- `aiSettingsService.ts` — Runtime-configurable provider, model, rate limit, retries, cache TTL — persisted to `SystemSetting` collection
- `aiUsageTracker.ts` — Async usage telemetry (token counts, latency, model, step) to `AiUsageLog` collection

Every AI call has a **deterministic fallback** if the API key is missing or the API fails.

### AI Chat Transport Chain
Client-side (`aiChat.ts` store) implements a 3-tier fallback:
```
WebSocket (Socket.IO) → SSE Stream → REST POST
```
After 2 consecutive WebSocket failures it switches to SSE, after 3 it falls to plain REST. On success, the counter resets.

### Deterministic Rules Engines
`rulesEngine.ts` (wills) and `incorporationRulesEngine.ts` generate flags independently of AI:

**Wills Rules Engine:**
- **Hard flags** (mandatory review): `RESIDENCY_FAIL`, `MISSING_GUARDIAN`
- **Soft flags** (attention): `SPOUSAL_OMISSION`, `FOREIGN_ASSETS`, `BUSINESS_ASSETS`
- **Logic warnings**: `POSSIBLE_DISINHERITANCE`, `EXECUTOR_CAPABILITY`

**Incorporation Rules Engine:**
- **Hard flags**: `CBCA_DIRECTOR_RESIDENCY`, `DIRECTOR_RESIDENCY_FAIL`, `NUANS_MISSING`, `NUANS_EXPIRED`, `OBCA_OFFICE_NOT_ONTARIO`, `LEGAL_ENDING_MISSING`
- **Soft flags**: `USA_NOT_CONSIDERED`, `S85_NOT_ASSESSED`, `ISC_REGISTER_MISSING`, `EXTRA_PROVINCIAL_REMINDER`, `FISCAL_YEAR_NOT_SET`
- **Logic warnings**: `SHARE_CLASS_MISMATCH`, `DIRECTOR_COUNT_MISMATCH`, `DIRECTOR_COUNT_OUT_OF_RANGE`, `SUBSCRIPTION_SHAREHOLDER_MISMATCH`

### Authentication & RBAC
- JWT tokens delivered via HTTP-only cookies (primary) + Bearer header (fallback)
- Three roles: `client`, `lawyer`, `admin`
- Middleware chain: `authenticate` → `requireRole()` → `requireOwnership()`
- Account lockout: failed login tracking with `lockedUntil` timestamp
- CSRF: double-submit cookie pattern
- Client-side guards are UX-only; true authorization is server-side

### Real-Time (Socket.IO)
- `lawyer_updates` room — lawyers/admins receive `intake_updated` events
- `client_{userId}` room — individual clients receive `intake_status_changed` events
- `ai:chat` → `ai:chunk` → `ai:done` — streaming AI responses

---

## Development Commands

```bash
# Install all dependencies (from root)
npm install

# Start backend dev server (port 3000)
cd server && npm run dev

# Start frontend dev server (port 5173)
cd client && npm run dev

# Run server tests (Jest + Supertest)
cd server && npm test

# Run client tests (Vitest + Vue Test Utils)
cd client && npm test

# Run E2E tests (Playwright)
npm run e2e

# Run E2E with browser visible
npm run e2e:headed

# Build for production
cd client && npm run build
cd server && npm run build

# Sync database indexes
cd server && npm run db:sync-indexes
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/willguide` | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Secret for JWT signing |
| `GEMINI_API_KEY` | No* | — | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-3.1-flash-lite-preview` | Gemini model name |
| `OPENAI_API_KEY` | No* | — | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4.1-mini` | OpenAI model name |
| `AI_PROVIDER` | No | `gemini` | Active AI provider (`gemini` or `openai`) |
| `AI_RATE_LIMIT` | No | `30` | Max AI requests per minute |
| `AI_MAX_RETRIES` | No | `3` | Max retry attempts per AI call |
| `AI_CACHE_TTL` | No | `3600` | Cache TTL in seconds |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Frontend URL |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `LOG_LEVEL` | No | `info` | Pino log level |

> \* At least one AI API key is recommended. AI features degrade gracefully without keys.

---

## Code Conventions

- **Language**: TypeScript throughout (client + server)
- **Commits**: Conventional commits enforced via Commitlint + Husky
- **Styling**: Tailwind CSS utility classes
- **State**: Pinia stores with Composition API
- **Validation**: Zod schemas for all data boundaries (dual-layer: API + pre-save)
- **AI prompts**: Always wrapped in XML tags (`<user_message>`, `<context>`, `<current_step>`) to prevent injection
- **Error handling**: Structured `AppError` hierarchy; controllers throw typed errors; AI services always have fallbacks
- **Logging**: Pino (structured JSON) with `requestLogger` middleware
- **Testing**: Jest (server), Vitest (client), Playwright (E2E)

---

## Important Patterns

1. **People Directory** — Entities (people) are defined once with an ID and reused across executor, beneficiary, and guardian sections via `PeoplePicker.vue`.
2. **Strategy Pattern Validation** — `useIntakeValidation.ts` selects validation logic per wizard step via `createValidationComposable()`.
3. **Dynamic Wizard Routing** — `useIntakeSteps.ts` conditionally includes/excludes steps (e.g., Guardians only if minor children exist).
4. **Optimistic Concurrency Control** — `updateIntake` checks `expectedVersion` to prevent multi-tab silent overwrites.
5. **AI Context Scoping** — `scopeToStep()` sends only the relevant section data to AI, not the full intake (60–80% token savings).
6. **Real-time Updates** — Socket.IO pushes intake updates to `lawyer_updates` room and `client_{userId}` rooms.
7. **Tiered AI Transport** — WebSocket → SSE → REST fallback chain with automatic counter reset on success.
8. **Defence-in-Depth Sanitisation** — Allowlist validation + regex stripping + XML escape + control char removal + forensic audit trail.
9. **Dual AI Providers** — Admin can hot-swap between Gemini and OpenAI without restart via `SystemSetting` persistence.
10. **Deterministic Fallbacks** — Every AI function works without API keys via step-specific canned responses.
11. **Proactive Guide** — `useProactiveGuide.ts` evaluates 25 declarative rules (17 wills + 8 incorporation) per wizard step, injecting contextual tips/warnings into the AI chat panel with staggered reveal delays.
12. **Graceful Shutdown** — SIGTERM handler drains HTTP connections, closes WebSocket, disconnects MongoDB with 10s force-exit timeout for Cloud Run scale-down.

---

## Deployment

- **Platform**: GCP Cloud Run (serverless containers)
- **CI/CD**: GitHub Actions → Cloud Build → Artifact Registry → Cloud Run
- **Docker**: Multi-stage build — client builds to static files, copied into server's `public/` directory
- **Production**: Express serves the Vue SPA with SPA fallback routing

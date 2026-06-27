# Phase 1: Foundation Build Plan

## Overview

Transform Sigma Lead Intelligence from a functional MVP into a production-grade, scalable platform by implementing 10 foundation capabilities across 7 parallel execution tracks. Estimated timeline: **10-12 working days** with parallel agent execution.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Audit logging | Middleware-based (1 file + 1 registration) | Avoids touching 35+ handlers; captures all mutations automatically |
| Rate limiting | Redis sliding-window per-user + per-IP | Already have Redis; token-bucket is overkill for MVP |
| Email provider | Abstract base + SendGrid primary, SMTP fallback | Provider-swappable; SendGrid has built-in tracking |
| DB pooling | pool_size=20, max_overflow=10, pool_pre_ping=True | Supports 10+ concurrent scraper workers |
| Test DB | pytest-asyncio + asyncpg against real PostgreSQL (Docker) | SQLite doesn't support async; need realistic tests |
| Structured logging | JSON to stdout via Python structlog | Container-native; parseable by any log aggregator |
| LinkedIn | Playwright browser automation (single account) | Official API requires partner approval; Playwright already installed |
| Proxy rotation | New service module, opt-in via env var | Backward-compatible; no changes if PROXY_LIST empty |
| Celery Beat | Schedule dict added to celery_app.py | Minimal change; single file to manage |
| Frontend state | URL params + React hooks (no Redux) | Existing pattern; minimal new dependencies |

---

## Execution Tracks

### Track 1: Infrastructure & Observability
**Files:** `backend/app/middleware/` (new dir), `backend/app/main.py`, `backend/app/config.py`, `backend/app/database.py`

**Task 1.1: Database connection pooling**
- `backend/app/database.py` — Add `pool_size=20, max_overflow=10, pool_pre_ping=True, pool_recycle=3600` to engine
- `backend/app/config.py` — Add `DB_POOL_SIZE`, `DB_MAX_OVERFLOW` env vars

**Task 1.2: Structured logging**
- Create `backend/app/middleware/__init__.py`
- Create `backend/app/middleware/logging.py` — JSON structured logger with request_id, user_id, org_id via contextvars
- `backend/app/main.py` — Register logging middleware after CORS
- `backend/requirements.txt` — Add `structlog>=24.0`

**Task 1.3: Prometheus metrics**
- Create `backend/app/middleware/metrics.py` — FastAPI middleware recording request_count, request_duration_seconds, error_count (histograms by endpoint+method)
- `backend/app/main.py` — Register metrics middleware, add `GET /metrics` endpoint
- `monitoring/prometheus.yml` — Add backend scrape target
- Note: `prometheus-client==0.20.0` already in requirements.txt

**Task 1.4: Rate limiting**
- Create `backend/app/middleware/rate_limit.py` — Redis sliding-window: 100 req/min per user, 10 req/min on `/auth/login` per IP, 5 req/hour on `/scraper/run` per org
- `backend/app/config.py` — Add `RATE_LIMIT_ENABLED` (default True), `RATE_LIMIT_DEFAULT` (100)
- `backend/app/main.py` — Register rate limit middleware
- Returns 429 with `Retry-After` header; bypasses `/health` and `/metrics`

**Task 1.5: Audit log middleware**
- Create `backend/app/middleware/audit.py` — Captures POST/PATCH/PUT/DELETE requests; extracts user_id, org_id, IP, resource path, request body summary; writes AuditLog record via background task (non-blocking)
- `backend/app/main.py` — Register audit middleware (must be AFTER auth extraction)
- AuditLog model already exists in `backend/app/models/audit.py`

---

### Track 2: Scraper Resilience
**Files:** `backend/app/services/proxy_pool.py` (new), `backend/app/services/http_client.py` (new), `backend/app/services/scraper.py`

**Task 2.1: Proxy & user-agent pool service**
- Create `backend/app/services/proxy_pool.py`:
  - `ProxyPool` class: loads from `PROXY_LIST` env var (comma-separated), tracks dead proxies in Redis (1h TTL), round-robin rotation
  - `UserAgentPool` class: 30+ realistic user-agents (Chrome/Firefox/Safari/mobile), random selection
  - `get_random_proxy()`, `get_random_user_agent()`, `mark_proxy_dead(proxy)`
- `backend/app/config.py` — Add `PROXY_LIST` (default ""), `PROXY_ROTATION_ENABLED` (default False)

**Task 2.2: Resilient HTTP client wrapper**
- Create `backend/app/services/http_client.py`:
  - `ResilientClient` wrapping `httpx.AsyncClient`
  - Auto-rotates proxy + user-agent per request
  - Retry with exponential backoff (3 retries, 1s/2s/4s) on 403/429/5xx
  - Connection pooling (`limits=httpx.Limits(max_connections=20)`)
  - 30s timeout default

**Task 2.3: Integrate into scraper**
- `backend/app/services/scraper.py`:
  - Replace hardcoded headers (line ~273) with `ResilientClient`
  - Add `--proxy-server` arg to Playwright chromium launch when proxy available
  - Add jitter to sleep intervals (random 3-8s instead of fixed 6s)
  - Wrap Google Maps browser calls with try/catch + proxy rotation on failure
  - Keep backward-compatible: if `PROXY_ROTATION_ENABLED=false`, use current behavior

---

### Track 3: Email Service & Communication
**Files:** `backend/app/services/email_service.py` (new), `backend/app/services/communicator.py`, `backend/app/api/v1/webhooks.py`

**Task 3.1: Email service with SendGrid + tracking**
- Create `backend/app/services/email_service.py`:
  - `EmailProvider` ABC with `send(to, subject, html_body) -> message_id`
  - `SendGridProvider`: uses sendgrid Python SDK, injects tracking pixel (`<img src="https://{BASE_URL}/api/v1/webhooks/email/track/{tracking_id}">`), returns external message_id
  - `SMTPProvider`: existing SMTP logic extracted from communicator.py as fallback
  - `get_email_provider()` factory: SendGrid if `SENDGRID_API_KEY` set, else SMTP
- `backend/app/config.py` — Add `SENDGRID_API_KEY`, `EMAIL_TRACKING_BASE_URL`
- `backend/requirements.txt` — Add `sendgrid>=6.11`

**Task 3.2: Update communicator to use email service**
- `backend/app/services/communicator.py` — Replace inline SMTP code in `send_email()` with `get_email_provider().send()`; store returned `tracking_id` on Message record

**Task 3.3: Email tracking webhook**
- `backend/app/api/v1/webhooks.py` — Add:
  - `GET /webhooks/email/track/{tracking_id}` — Returns 1x1 transparent GIF, marks message as OPENED
  - `POST /webhooks/sendgrid` — Handles SendGrid event webhooks (delivered, opened, clicked, bounced)

**Task 3.4: LinkedIn messenger service**
- Create `backend/app/services/linkedin_service.py`:
  - `LinkedInMessenger` class using Playwright (already installed)
  - Methods: `login(email, password)`, `send_message(profile_url, text) -> bool`
  - Human-like delays (2-5s between actions), realistic scroll patterns
  - Error handling: login failure, profile not found, rate limited
- `backend/app/config.py` — Add `LINKEDIN_EMAIL`, `LINKEDIN_PASSWORD`
- Create `backend/app/workers/linkedin_tasks.py` — Celery task `send_linkedin_message_task(lead_id)`

**Task 3.5: Update communicator with LinkedIn channel**
- `backend/app/services/communicator.py` — Add `send_linkedin()` method dispatching to LinkedInMessenger
- `backend/app/workers/outreach_tasks.py` — Add LinkedIn to channel routing

---

### Track 4: Celery Beat Scheduled Jobs
**Files:** `backend/app/workers/celery_app.py`, `backend/app/workers/collection_tasks.py`, `backend/app/workers/reporting_tasks.py` (new)

**Task 4.1: Define Beat schedule**
- `backend/app/workers/celery_app.py` — Add `beat_schedule` config:
  ```
  daily-auto-analyze: batch_analyze_leads_task, crontab(hour=2, minute=0), args=(100,)
  weekly-digest: generate_weekly_report_task, crontab(day_of_week=1, hour=8)
  daily-retention-check: enforce_retention_task, crontab(hour=3, minute=0)
  ```
- Add `task_time_limit=300`, `task_soft_time_limit=280` for safety

**Task 4.2: Weekly report task**
- Create `backend/app/workers/reporting_tasks.py`:
  - `generate_weekly_report_task(org_id)` — Queries leads created/analyzed/converted this week, pipeline value, sends email summary to org admin
  - Uses email service from Track 3

---

### Track 5: Frontend Completion
**Files:** `frontend/src/app/messages/page.tsx`, `frontend/src/app/settings/page.tsx`, `frontend/src/app/organizations/page.tsx` (new), `frontend/src/lib/api.ts`, `frontend/src/components/ClientLayout.tsx`

**Task 5.1: Messages page**
- `frontend/src/app/messages/page.tsx` — Full implementation:
  - Paginated table: lead name, channel, content preview, status, sent_at, reply
  - Filters: channel (ALL/EMAIL/WHATSAPP/LINKEDIN), status, date range
  - Click to expand: full message content + reply thread
  - Uses existing `api.messages.list(params)` endpoint

**Task 5.2: Settings page**
- `frontend/src/app/settings/page.tsx` — Full implementation:
  - Profile section: name, email (read-only)
  - Integration keys: SMTP config, SendGrid API key, Twilio, WhatsApp, LinkedIn, OpenAI
  - Outreach preferences: daily send limits, auto-approve thresholds
  - Data retention settings: retention days, GDPR mode toggle
- Backend: Add `GET/PATCH /api/v1/organizations/{org_id}/settings` endpoints in `backend/app/api/v1/organizations.py`

**Task 5.3: Organizations page**
- Create `frontend/src/app/organizations/page.tsx`:
  - List user's organizations with member count, lead count
  - Create organization form
  - Members management: invite (email + role), remove, change role
  - Team management within org
  - Switch active organization
- Uses existing org API endpoints (most already built)

**Task 5.4: Update navigation & API client**
- `frontend/src/components/ClientLayout.tsx` — Add Organizations nav item, org switcher dropdown
- `frontend/src/lib/api.ts` — Add: `organizations.getSettings()`, `organizations.updateSettings()`, `messages.filter(params)`

---

### Track 6: Test Suite
**Files:** `backend/tests/` (new directory tree), `backend/requirements.txt`, `backend/pytest.ini` (new)

**Task 6.1: Test infrastructure setup**
- Create `backend/pytest.ini` — asyncio_mode=auto, test paths
- Create `backend/tests/__init__.py`
- Create `backend/tests/conftest.py`:
  - Fixtures: `test_db` (PostgreSQL via testcontainers or environment variable), `async_client` (httpx.AsyncClient with TestClient), `test_user`, `test_organization`, `auth_headers`
  - Mock fixtures: `mock_openai`, `mock_sendgrid`, `mock_redis`
- `backend/requirements.txt` — Add `pytest>=8.0`, `pytest-asyncio>=0.23`, `pytest-cov>=5.0`, `httpx` (already present), `factory-boy>=3.3`

**Task 6.2: Unit tests**
- Create `backend/tests/unit/test_scorer.py` — Test digital maturity & opportunity scoring
- Create `backend/tests/unit/test_prioritizer.py` — Test HOT/WARM/COLD categorization
- Create `backend/tests/unit/test_proxy_pool.py` — Test rotation, dead proxy tracking
- Create `backend/tests/unit/test_email_service.py` — Test provider selection, tracking pixel injection

**Task 6.3: Integration tests**
- Create `backend/tests/integration/test_auth_api.py` — Register, login, token validation
- Create `backend/tests/integration/test_leads_api.py` — CRUD with org scoping, filters, pagination
- Create `backend/tests/integration/test_messages_api.py` — List, filter, dashboard metrics
- Create `backend/tests/integration/test_rate_limit.py` — Verify 429 after limit exceeded
- Create `backend/tests/integration/test_audit.py` — Verify AuditLog records on mutations

**Task 6.4: E2E workflow test**
- Create `backend/tests/e2e/test_lead_lifecycle.py`:
  - Create org + user → Import lead → Analyze (mock OpenAI) → Approve outreach → Send message → Verify status updates + audit trail

---

### Track 7: GDPR & Data Retention
**Files:** `backend/alembic/versions/002_gdpr_retention.py` (new), `backend/app/services/retention_service.py` (new), `backend/app/api/v1/gdpr.py` (new), `backend/app/workers/retention_tasks.py` (new)

**Task 7.1: GDPR schema migration**
- Create `backend/alembic/versions/002_gdpr_retention.py`:
  - Add to `leads` table: `gdpr_consent` (Boolean, default False), `gdpr_consent_date` (DateTime), `soft_deleted` (Boolean, default False), `soft_deleted_at` (DateTime)
  - Add to `organizations` table: `data_retention_days` (Integer, default 730)
  - Create table `consent_records`: id, user_id, org_id, consent_type, given_at, revoked_at
- Update `backend/app/models/lead.py` — Add new fields

**Task 7.2: Retention service**
- Create `backend/app/services/retention_service.py`:
  - `archive_expired_leads(org_id, days)` — Soft-delete leads older than retention period
  - `anonymize_lead(lead_id)` — Nullify PII fields (GDPR right to be forgotten)
  - `export_user_data(user_id)` — Generate JSON export of all user's data

**Task 7.3: GDPR API endpoints**
- Create `backend/app/api/v1/gdpr.py`:
  - `POST /gdpr/consent` — Record consent
  - `GET /gdpr/status` — Check consent status
  - `POST /gdpr/export` — Trigger data export (background task, returns job ID)
  - `DELETE /gdpr/data/{lead_id}` — Right to be forgotten (anonymize)
- `backend/app/main.py` — Register GDPR router

**Task 7.4: Retention Celery task**
- Create `backend/app/workers/retention_tasks.py`:
  - `enforce_retention_task()` — For each org, archive leads older than `data_retention_days`
  - Runs daily via Beat schedule (defined in Track 4)

---

## Dependency Graph

```
Track 1 (Infrastructure) ─────────────────────────────────────────────────
  Task 1.1 (DB pooling)     ← no deps (START FIRST)
  Task 1.2 (Logging)        ← no deps (parallel with 1.1)
  Task 1.3 (Metrics)        ← depends on 1.2
  Task 1.4 (Rate limiting)  ← depends on 1.1 (Redis)
  Task 1.5 (Audit)          ← depends on 1.2

Track 2 (Scraper) ────────────────────────────────────────────────────────
  Task 2.1 (Proxy pool)     ← depends on 1.1 (Redis for dead proxy tracking)
  Task 2.2 (HTTP client)    ← depends on 2.1
  Task 2.3 (Integrate)      ← depends on 2.2

Track 3 (Communication) ──────────────────────────────────────────────────
  Task 3.1 (
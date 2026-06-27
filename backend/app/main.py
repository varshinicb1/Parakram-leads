from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.api.v1 import leads, auth, messages, alerts, webhooks, scraper, organizations
from app.middleware.logging import StructuredLoggingMiddleware, configure_structlog
from app.middleware.metrics import PrometheusMetricsMiddleware, metrics_endpoint


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_structlog(log_level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging middleware (AFTER CORS)
app.add_middleware(StructuredLoggingMiddleware)

# Prometheus metrics middleware
if settings.PROMETHEUS_ENABLED:
    app.add_middleware(PrometheusMetricsMiddleware)

# Rate limit middleware will be registered here
# Audit middleware will be registered here

app.include_router(auth.router, prefix="/api/v1")
app.include_router(organizations.router, prefix="/api/v1")
app.include_router(leads.router, prefix="/api/v1")
app.include_router(messages.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(scraper.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.VERSION}


@app.get("/metrics")
async def metrics(request: Request):
    return metrics_endpoint(request)

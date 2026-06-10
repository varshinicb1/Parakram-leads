from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.api.v1 import leads, auth, messages, alerts, webhooks, scraper


@asynccontextmanager
async def lifespan(app: FastAPI):
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

app.include_router(auth.router, prefix="/api/v1")
app.include_router(leads.router, prefix="/api/v1")
app.include_router(messages.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(scraper.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.VERSION}

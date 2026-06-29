"""
Audit logging middleware that records all mutation operations.
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.database import async_session_factory
from app.models.audit import AuditLog
from app.utils.security import get_token_from_request, decode_token
import json


MUTATION_METHODS = {"POST", "PATCH", "PUT", "DELETE"}

# Paths to exclude from audit logging
EXCLUDED_PATHS = {"/health", "/metrics", "/api/v1/auth/login", "/api/v1/auth/register"}

# Human-readable action labels for common paths
ACTION_LABELS = {
    "leads": "lead",
    "messages": "message",
    "organizations": "organization",
    "auth": "authentication",
    "scraper": "scraper",
    "webhooks": "webhook",
    "intelligence": "intelligence",
}


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        if request.method not in MUTATION_METHODS:
            return response

        path = request.url.path
        if any(path.startswith(ex) for ex in EXCLUDED_PATHS):
            return response

        if not path.startswith("/api/v1"):
            return response

        org_id = request.headers.get("X-Organization-ID")
        token = get_token_from_request(request)
        user_id = None
        if token:
            try:
                payload = decode_token(token)
                user_id = payload.get("sub")
            except Exception:
                pass

        resource = None
        action = request.method
        resource_id = None

        parts = path.strip("/").split("/")
        if len(parts) >= 3:
            resource = parts[2]
            if len(parts) >= 4 and parts[3] and parts[3] != "switch":
                resource_id = parts[3]

        if resource in ACTION_LABELS:
            action_label = f"{request.method.lower()}_{resource}"
        else:
            action_label = request.method.lower()

        details = None
        if response.status_code < 400:
            try:
                body = await request.json()
                details = json.dumps({k: v for k, v in body.items() if k != "password"}, default=str)[:500]
            except Exception:
                pass

        try:
            async with async_session_factory() as db:
                log = AuditLog(
                    organization_id=org_id,
                    user_id=user_id,
                    action=action_label,
                    resource=resource,
                    resource_id=resource_id,
                    details=details,
                    ip_address=request.client.host if request.client else None,
                )
                db.add(log)
                await db.commit()
        except Exception:
            pass

        return response

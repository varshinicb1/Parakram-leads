"""
Rate limiting middleware using Redis sliding window.
Returns 429 Too Many Requests when limit is exceeded.
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.services.rate_limiter import rate_limiter
import time


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/v1"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        auth_header = request.headers.get("authorization", "")
        client_id = auth_header.split()[-1] if auth_header.startswith("Bearer ") else client_ip
        is_authenticated = auth_header.startswith("Bearer ")

        route_group = rate_limiter.route_group(request.url.path)
        result = await rate_limiter.check(client_id, route_group, is_authenticated)

        if not result["allowed"]:
            retry_after = max(1, int(result["reset_at"] - time.time()))
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please slow down.",
                    "retry_after": retry_after,
                    "limit": result["limit"],
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(result["limit"]),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(result["reset_at"]),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(result["limit"])
        response.headers["X-RateLimit-Remaining"] = str(result["remaining"])
        response.headers["X-RateLimit-Reset"] = str(result["reset_at"])
        return response

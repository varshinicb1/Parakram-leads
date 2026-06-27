import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST


# Prometheus metrics
http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
)


class PrometheusMetricsMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware that records Prometheus metrics for every HTTP request."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        method = request.method
        # Use the route path template if available, otherwise the raw path
        endpoint = request.url.path

        start = time.perf_counter()
        try:
            response: Response = await call_next(request)
        except Exception:
            duration = time.perf_counter() - start
            http_requests_total.labels(method=method, endpoint=endpoint, status="500").inc()
            http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(duration)
            raise

        duration = time.perf_counter() - start
        status = str(response.status_code)

        http_requests_total.labels(method=method, endpoint=endpoint, status=status).inc()
        http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(duration)

        return response


def metrics_endpoint(request: Request) -> Response:
    """Return Prometheus metrics in the exposition format."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )

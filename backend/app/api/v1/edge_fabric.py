"""
PARAKRAM EDGE FABRIC — UNIFIED DEVICE REGISTRY
================================================
One fleet, three node types. Windows VPS, Linux VPS, and Android "pocket edge"
servers all register and heartbeat through a single protocol so a user's phones
and laptops appear together in one live dashboard and are addressable by the MCP
control plane.

  - POST /edge/register     A node announces itself + its capabilities
  - POST /edge/heartbeat    Generalized heartbeat (node-type-agnostic metrics)
  - GET  /edge/devices      Unified fleet view across every node type

This generalizes the VPS-only telemetry in `vps_telemetry.py` and shares the
same backing store, so existing `/vps/heartbeat` clients and new `/edge` clients
populate one fleet. Device auth reuses the VPS license key as a Bearer token.
"""

import logging
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from app.api.v1.vps_telemetry import (
    HeartbeatStore,
    _build_update_manifest,
    _extract_license_key,
    _utc_now_iso,
    get_store,
)
from app.config import settings
from app.models.user import User
from app.utils.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/edge", tags=["edge"])

NodeType = Literal["windows-vps", "linux-vps", "android-edge"]
KNOWN_NODE_TYPES = {"windows-vps", "linux-vps", "android-edge"}


# ═══════════════════════════════════════════════════════════════════════════
#  SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=128)
    node_type: NodeType
    name: str = Field("", max_length=128)
    platform: str = Field("", max_length=64)
    app_version: str = Field("", max_length=32)
    capabilities: list[str] = Field(default_factory=list, max_length=64)
    pairing_id: str = Field("", max_length=128)


class RegisterResponse(BaseModel):
    status: str
    device_id: str
    node_type: str
    registered_at: str
    heartbeat_interval_seconds: int


class EdgeHeartbeatRequest(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=128)
    node_type: NodeType
    name: str = Field("", max_length=128)
    app_version: str = Field("", max_length=32)
    metrics: dict = Field(default_factory=dict)
    capabilities: list[str] = Field(default_factory=list, max_length=64)
    online_services: dict[str, bool] = Field(default_factory=dict)


class EdgeHeartbeatResponse(BaseModel):
    status: str
    device_id: str
    received_at: str
    next_interval_seconds: int
    update_available: bool = False


class EdgeDeviceSummary(BaseModel):
    device_id: str
    node_type: str
    name: str
    platform: str
    version: str
    last_seen: str
    online: bool
    capabilities: list[str] = Field(default_factory=list)
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    battery_level: Optional[int] = None
    battery_charging: Optional[bool] = None
    online_services: dict[str, bool] = Field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════
#  PLATFORM MAPPING
# ═══════════════════════════════════════════════════════════════════════════

def _update_platform(node_type: str) -> str:
    """Map a node type to the update-manifest platform bucket."""
    return "linux" if node_type == "android-edge" else node_type.replace("-vps", "")


def _summarize(record: dict) -> EdgeDeviceSummary:
    """Normalize a stored record (VPS or Android shape) into a fleet summary."""
    metrics = record.get("metrics", {}) or {}
    node_type = record.get("node_type") or _infer_node_type(record)

    cpu = metrics.get("cpu_percent")
    if cpu is None:
        cpu = metrics.get("cpu_load_percent", 0.0)

    mem = metrics.get("memory_percent")
    if mem is None:
        total = metrics.get("total_ram_mb", 0)
        free = metrics.get("free_ram_mb", 0)
        mem = round((total - free) / total * 100, 1) if total else 0.0

    services = record.get("online_services") or {}
    if not services:
        for key in ("tunnel_active", "leads_backend_active", "docker_running"):
            if key in record:
                services[key] = bool(record[key])

    return EdgeDeviceSummary(
        device_id=record.get("device_id") or record.get("vps_id", ""),
        node_type=node_type,
        name=record.get("name", "") or metrics.get("device_model", "") or metrics.get("hostname", ""),
        platform=record.get("platform", "") or metrics.get("os_version", "") or metrics.get("platform_version", ""),
        version=record.get("app_version", "") or record.get("version", ""),
        last_seen=record.get("received_at", ""),
        online=True,
        capabilities=record.get("capabilities", []) or [],
        cpu_percent=float(cpu or 0.0),
        memory_percent=float(mem or 0.0),
        battery_level=metrics.get("battery_level_percent"),
        battery_charging=metrics.get("battery_is_charging"),
        online_services=services,
    )


def _infer_node_type(record: dict) -> str:
    """Best-effort node type for legacy VPS records that predate the field."""
    if "vps_id" in record and "device_id" not in record:
        metrics = record.get("metrics", {}) or {}
        pv = (metrics.get("platform_version") or "").lower()
        return "linux-vps" if "linux" in pv else "windows-vps"
    return "windows-vps"


# ═══════════════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/register", response_model=RegisterResponse)
async def register_node(
    payload: RegisterRequest,
    request: Request,
    authorization: Optional[str] = Header(None),
    store: HeartbeatStore = Depends(get_store),
):
    """Register an edge node (phone or VPS) into the unified fleet."""
    license_key = _extract_license_key(authorization)
    registered_at = _utc_now_iso()
    record = {
        "device_id": payload.device_id,
        "node_type": payload.node_type,
        "name": payload.name,
        "platform": payload.platform,
        "app_version": payload.app_version,
        "version": payload.app_version,
        "capabilities": payload.capabilities,
        "pairing_id": payload.pairing_id,
        "license_prefix": license_key[:8],
        "received_at": registered_at,
        "metrics": {},
        "source_ip": request.client.host if request.client else "",
    }
    await store.record(payload.device_id, record)
    logger.info(
        "Edge node registered",
        extra={"device_id": payload.device_id, "node_type": payload.node_type,
               "capabilities": len(payload.capabilities)},
    )
    return RegisterResponse(
        status="ok",
        device_id=payload.device_id,
        node_type=payload.node_type,
        registered_at=registered_at,
        heartbeat_interval_seconds=settings.VPS_HEARTBEAT_INTERVAL_SECONDS,
    )


@router.post("/heartbeat", response_model=EdgeHeartbeatResponse)
async def edge_heartbeat(
    payload: EdgeHeartbeatRequest,
    request: Request,
    authorization: Optional[str] = Header(None),
    store: HeartbeatStore = Depends(get_store),
):
    """Generalized heartbeat for any node type."""
    license_key = _extract_license_key(authorization)
    received_at = _utc_now_iso()
    record = {
        **payload.model_dump(),
        "version": payload.app_version,
        "license_prefix": license_key[:8],
        "received_at": received_at,
        "source_ip": request.client.host if request.client else "",
    }
    await store.record(payload.device_id, record)

    update_available = False
    if payload.app_version:
        try:
            manifest = await _build_update_manifest(
                payload.app_version, _update_platform(payload.node_type)
            )
            update_available = manifest.update_available
        except Exception:
            update_available = False

    return EdgeHeartbeatResponse(
        status="ok",
        device_id=payload.device_id,
        received_at=received_at,
        next_interval_seconds=settings.VPS_HEARTBEAT_INTERVAL_SECONDS,
        update_available=update_available,
    )


@router.get("/devices", response_model=list[EdgeDeviceSummary])
async def list_devices(
    node_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    store: HeartbeatStore = Depends(get_store),
):
    """Unified fleet view across phones and VPS instances."""
    if node_type is not None and node_type not in KNOWN_NODE_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"detail": f"Unknown node_type '{node_type}'", "code": "BAD_NODE_TYPE"},
        )
    records = await store.list_all()
    summaries = [_summarize(r) for r in records]
    if node_type is not None:
        summaries = [s for s in summaries if s.node_type == node_type]
    summaries.sort(key=lambda s: s.last_seen, reverse=True)
    return summaries

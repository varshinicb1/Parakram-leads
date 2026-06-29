"""Tests for the Parakram Edge Fabric API."""

import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.api.v1.edge_fabric import (
    HeartbeatStore,
    _infer_node_type,
    _summarize,
    _update_platform,
    get_current_user,
    get_store,
    router,
)

VALID_KEY = "ABCDE-FGHIJ-KLMNO-PQRST"


def build_app(store: HeartbeatStore | None = None, user=None) -> FastAPI:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    if store is not None:
        app.dependency_overrides[get_store] = lambda: store
    if user is not None:
        app.dependency_overrides[get_current_user] = lambda: user
    return app


def client_for(app: FastAPI) -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


class TestEdgeHeartbeatStore:
    @pytest.fixture
    def store(self):
        s = HeartbeatStore()
        s._redis_failed = True
        return s

    async def test_record_and_get(self, store):
        await store.record("edge-1", {"device_id": "edge-1", "node_type": "android-edge"})
        got = await store.get("edge-1")
        assert got["node_type"] == "android-edge"
        assert "_stored_at" not in got

    async def test_list_all(self, store):
        await store.record("a", {"device_id": "a"})
        await store.record("b", {"device_id": "b"})
        ids = {r["device_id"] for r in await store.list_all()}
        assert ids == {"a", "b"}


class TestEdgeRegisterEndpoint:
    @pytest.fixture
    def store(self):
        s = HeartbeatStore()
        s._redis_failed = True
        return s

    async def test_requires_auth(self, store):
        app = build_app(store=store)
        payload = {"device_id": "edge-1", "node_type": "android-edge"}
        async with client_for(app) as c:
            resp = await c.post("/api/v1/edge/register", json=payload)
        assert resp.status_code == 401

    async def test_rejects_bad_license(self, store):
        app = build_app(store=store)
        payload = {"device_id": "edge-1", "node_type": "android-edge"}
        async with client_for(app) as c:
            resp = await c.post(
                "/api/v1/edge/register",
                json=payload,
                headers={"Authorization": "Bearer not-a-key"},
            )
        assert resp.status_code == 401

    async def test_accepts_valid_registration(self, store):
        app = build_app(store=store)
        payload = {
            "device_id": "edge-1",
            "node_type": "android-edge",
            "name": "Pixel Edge",
            "platform": "android",
            "app_version": "1.2.3",
            "capabilities": ["camera", "gps"],
            "pairing_id": "pair-123",
        }
        async with client_for(app) as c:
            resp = await c.post(
                "/api/v1/edge/register",
                json=payload,
                headers={"Authorization": f"Bearer {VALID_KEY}"},
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["device_id"] == "edge-1"
        assert body["node_type"] == "android-edge"
        stored = await store.get("edge-1")
        assert stored["node_type"] == "android-edge"
        assert stored["platform"] == "android"
        assert stored["app_version"] == "1.2.3"

    async def test_rejects_invalid_node_type(self, store):
        app = build_app(store=store)
        payload = {"device_id": "edge-1", "node_type": "tablet-edge"}
        async with client_for(app) as c:
            resp = await c.post(
                "/api/v1/edge/register",
                json=payload,
                headers={"Authorization": f"Bearer {VALID_KEY}"},
            )
        assert resp.status_code == 422


class TestEdgeHeartbeatEndpoint:
    @pytest.fixture
    def store(self):
        s = HeartbeatStore()
        s._redis_failed = True
        return s

    async def test_accepts_android_metrics_and_stores(self, store):
        app = build_app(store=store)
        payload = {
            "device_id": "edge-android-1",
            "node_type": "android-edge",
            "name": "Pocket Edge",
            "app_version": "3.4.5",
            "capabilities": ["camera"],
            "metrics": {
                "cpu_load_percent": 37.5,
                "total_ram_mb": 4000,
                "free_ram_mb": 1000,
                "battery_level_percent": 82,
                "battery_is_charging": True,
            },
        }
        with patch(
            "app.api.v1.edge_fabric._build_update_manifest",
            new=AsyncMock(return_value=MagicMock(update_available=True)),
        ):
            async with client_for(app) as c:
                resp = await c.post(
                    "/api/v1/edge/heartbeat",
                    json=payload,
                    headers={"Authorization": f"Bearer {VALID_KEY}"},
                )
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["device_id"] == "edge-android-1"
        assert body["update_available"] is True
        stored = await store.get("edge-android-1")
        assert stored["node_type"] == "android-edge"
        assert stored["metrics"]["battery_level_percent"] == 82
        assert stored["metrics"]["cpu_load_percent"] == 37.5


class TestEdgeDevicesEndpoint:
    @pytest.fixture
    def store(self):
        s = HeartbeatStore()
        s._redis_failed = True
        return s

    async def test_lists_mixed_devices_and_normalizes_android(self, store):
        await store.record(
            "edge-android-1",
            {
                "device_id": "edge-android-1",
                "node_type": "android-edge",
                "name": "Pocket Edge",
                "platform": "android",
                "app_version": "3.4.5",
                "received_at": "2026-01-02T00:00:00Z",
                "metrics": {
                    "cpu_load_percent": 37.5,
                    "total_ram_mb": 4000,
                    "free_ram_mb": 1000,
                    "battery_level_percent": 82,
                    "battery_is_charging": True,
                },
            },
        )
        await store.record(
            "vps-legacy-1",
            {
                "vps_id": "vps-legacy-1",
                "version": "2.0.0",
                "received_at": "2026-01-02T00:01:00Z",
                "metrics": {
                    "hostname": "winbox",
                    "cpu_percent": 5.0,
                    "memory_percent": 10.0,
                },
                "tunnel_active": True,
            },
        )
        app = build_app(store=store, user=MagicMock())
        async with client_for(app) as c:
            resp = await c.get("/api/v1/edge/devices", headers={"Authorization": f"Bearer {VALID_KEY}"})
        assert resp.status_code == 200
        rows = resp.json()
        assert {row["device_id"] for row in rows} == {"edge-android-1", "vps-legacy-1"}

        android = next(row for row in rows if row["device_id"] == "edge-android-1")
        assert android["battery_level"] == 82
        assert android["battery_charging"] is True
        assert android["memory_percent"] == 75.0
        assert android["cpu_percent"] == 37.5

        vps = next(row for row in rows if row["device_id"] == "vps-legacy-1")
        assert vps["node_type"] == "windows-vps"
        assert vps["cpu_percent"] == 5.0
        assert vps["memory_percent"] == 10.0

    async def test_filters_by_node_type(self, store):
        await store.record(
            "edge-android-1",
            {
                "device_id": "edge-android-1",
                "node_type": "android-edge",
                "received_at": "2026-01-02T00:00:00Z",
                "metrics": {},
            },
        )
        await store.record(
            "vps-legacy-1",
            {
                "vps_id": "vps-legacy-1",
                "version": "2.0.0",
                "received_at": "2026-01-02T00:01:00Z",
                "metrics": {},
            },
        )
        app = build_app(store=store, user=MagicMock())
        async with client_for(app) as c:
            resp = await c.get(
                "/api/v1/edge/devices",
                params={"node_type": "android-edge"},
                headers={"Authorization": f"Bearer {VALID_KEY}"},
            )
        assert resp.status_code == 200
        rows = resp.json()
        assert len(rows) == 1
        assert rows[0]["device_id"] == "edge-android-1"

    async def test_rejects_unknown_node_type_filter(self, store):
        app = build_app(store=store, user=MagicMock())
        async with client_for(app) as c:
            resp = await c.get(
                "/api/v1/edge/devices",
                params={"node_type": "tablet-edge"},
                headers={"Authorization": f"Bearer {VALID_KEY}"},
            )
        assert resp.status_code == 400


class TestEdgeHelpers:
    def test_update_platform(self):
        assert _update_platform("android-edge") == "linux"
        assert _update_platform("windows-vps") == "windows"
        assert _update_platform("linux-vps") == "linux"

    def test_infer_node_type(self):
        assert _infer_node_type(
            {
                "vps_id": "vps-1",
                "metrics": {"platform_version": "Linux Ubuntu 22.04"},
            }
        ) == "linux-vps"
        assert _infer_node_type(
            {
                "vps_id": "vps-2",
                "metrics": {"platform_version": "Windows Server 2022"},
            }
        ) == "windows-vps"

    def test_summarize_normalizes_android_fields(self):
        summary = _summarize(
            {
                "device_id": "edge-android-1",
                "node_type": "android-edge",
                "name": "Pocket Edge",
                "platform": "android",
                "version": "3.4.5",
                "received_at": "2026-01-02T00:00:00Z",
                "capabilities": ["camera"],
                "metrics": {
                    "cpu_load_percent": 37.5,
                    "total_ram_mb": 4000,
                    "free_ram_mb": 1000,
                    "battery_level_percent": 82,
                    "battery_is_charging": True,
                },
            }
        )
        assert summary.node_type == "android-edge"
        assert summary.cpu_percent == 37.5
        assert summary.memory_percent == 75.0
        assert summary.battery_level == 82
        assert summary.battery_charging is True

"""Tests for the Project model and API endpoints."""

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse


def _mock_single_result(project):
    """Mock for db.execute returning a single project."""
    m = MagicMock()
    m.scalar_one_or_none.return_value = project
    return m


def _mock_list_result(projects):
    """Mock for db.execute returning a list of projects."""
    m = MagicMock()
    m.scalars.return_value.all.return_value = projects
    return m


def _make_project(org_id=None, **overrides):
    from app.models.project import Project
    now = datetime.now(timezone.utc)
    p = Project(
        id=overrides.get("id", uuid.uuid4()),
        organization_id=org_id or uuid.uuid4(),
        name=overrides.get("name", "Test Project"),
        slug=overrides.get("slug", "test-project"),
        description=overrides.get("description", None),
        status=overrides.get("status", "active"),
        settings=overrides.get("settings", None),
        created_at=overrides.get("created_at", now),
        updated_at=overrides.get("updated_at", now),
    )
    return p


# --- Schema validation ---

class TestProjectCreateSchema:
    def test_valid_create(self):
        data = ProjectCreate(name="My Project", slug="my-project")
        assert data.name == "My Project"
        assert data.slug == "my-project"

    def test_create_with_optional_fields(self):
        data = ProjectCreate(name="My Project", slug="my-project", description="A test project")
        assert data.description == "A test project"

    def test_create_requires_name(self):
        with pytest.raises(ValueError):
            ProjectCreate(slug="my-project")

    def test_create_requires_slug(self):
        with pytest.raises(ValueError):
            ProjectCreate(name="My Project")


class TestProjectUpdateSchema:
    def test_valid_partial_update(self):
        data = ProjectUpdate(name="Updated Name")
        assert data.name == "Updated Name"

    def test_empty_update(self):
        data = ProjectUpdate()
        assert data.model_dump(exclude_unset=True) == {}

    def test_update_status(self):
        data = ProjectUpdate(status="archived")
        assert data.status == "archived"


class TestProjectResponseSchema:
    def test_from_attributes(self):
        pid = uuid.uuid4()
        oid = uuid.uuid4()
        now = datetime.now(timezone.utc)
        raw = {
            "id": str(pid),
            "organization_id": str(oid),
            "name": "Test",
            "slug": "test",
            "description": "desc",
            "status": "active",
            "settings": {"key": "val"},
            "created_at": now,
            "updated_at": now,
        }
        resp = ProjectResponse.model_validate(raw)
        assert resp.id == pid
        assert resp.name == "Test"
        assert resp.settings == {"key": "val"}


# --- API route tests ---

class TestListProjects:
    @pytest.mark.asyncio
    async def test_returns_list(self):
        from app.api.v1.projects import list_projects
        p1 = _make_project(name="Project A", slug="project-a")
        p2 = _make_project(name="Project B", slug="project-b")

        mock_db = AsyncMock()
        mock_db.execute.return_value = _mock_list_result([p1, p2])

        result = await list_projects(
            db=mock_db,
            current_user=MagicMock(),
            org=MagicMock(id=p1.organization_id),
            _=None,
        )
        assert len(result) == 2
        assert result[0].name == "Project A"
        assert result[1].name == "Project B"

    @pytest.mark.asyncio
    async def test_returns_empty_list(self):
        from app.api.v1.projects import list_projects
        mock_db = AsyncMock()
        mock_db.execute.return_value = _mock_list_result([])

        result = await list_projects(
            db=mock_db,
            current_user=MagicMock(),
            org=MagicMock(),
            _=None,
        )
        assert result == []


class TestGetProject:
    @pytest.mark.asyncio
    async def test_found(self):
        from app.api.v1.projects import get_project
        p = _make_project()
        mock_db = AsyncMock()
        mock_db.execute.return_value = _mock_single_result(p)

        result = await get_project(
            project_id=p.id,
            db=mock_db,
            current_user=MagicMock(),
            org=MagicMock(id=p.organization_id),
            _=None,
        )
        assert result.id == p.id
        assert result.name == p.name

    @pytest.mark.asyncio
    async def test_not_found(self):
        from fastapi import HTTPException
        from app.api.v1.projects import get_project
        mock_db = AsyncMock()
        mock_db.execute.return_value = _mock_single_result(None)

        with pytest.raises(HTTPException) as exc:
            await get_project(
                project_id=uuid.uuid4(),
                db=mock_db,
                current_user=MagicMock(),
                org=MagicMock(),
                _=None,
            )
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_not_found_wrong_org(self):
        from fastapi import HTTPException
        from app.api.v1.projects import get_project
        from app.models.project import Project
        p = _make_project()

        mock_org = MagicMock(id=uuid.uuid4())
        mock_user = MagicMock()

        mock_db = AsyncMock()

        def mock_execute(query):
            m = MagicMock()
            m.scalar_one_or_none.return_value = None
            return m

        mock_db.execute.side_effect = mock_execute

        with pytest.raises(HTTPException) as exc:
            await get_project(
                project_id=p.id,
                db=mock_db,
                current_user=mock_user,
                org=mock_org,
                _=None,
            )
        assert exc.value.status_code == 404


class TestCreateProject:
    @pytest.mark.asyncio
    async def test_creates_project(self):
        from app.api.v1.projects import create_project
        org_id = uuid.uuid4()
        data = ProjectCreate(name="New Project", slug="new-project")

        captured = {}
        test_project_id = uuid.uuid4()
        now = datetime.now(timezone.utc)

        async def fake_flush():
            captured["project"] = mock_db.add.call_args[0][0]
            p = captured["project"]
            p.id = test_project_id
            p.status = "active"
            p.created_at = now
            p.updated_at = now

        async def fake_refresh(obj):
            pass

        mock_db = AsyncMock()
        mock_db.execute.return_value = _mock_single_result(None)
        mock_db.flush.side_effect = fake_flush
        mock_db.refresh.side_effect = fake_refresh

        result = await create_project(
            data=data,
            db=mock_db,
            current_user=MagicMock(),
            org=MagicMock(id=org_id),
            _=None,
        )
        assert result.name == "New Project"
        assert result.slug == "new-project"
        mock_db.add.assert_called_once()
        assert result.id == test_project_id

    @pytest.mark.asyncio
    async def test_duplicate_slug_raises_409(self):
        from fastapi import HTTPException
        from app.api.v1.projects import create_project
        org_id = uuid.uuid4()
        existing = _make_project(org_id=org_id, slug="duplicate")
        data = ProjectCreate(name="Duplicate", slug="duplicate")

        mock_db = AsyncMock()
        mock_db.execute.return_value = _mock_single_result(existing)

        with pytest.raises(HTTPException) as exc:
            await create_project(
                data=data,
                db=mock_db,
                current_user=MagicMock(),
                org=MagicMock(id=org_id),
                _=None,
            )
        assert exc.value.status_code == 409
        assert "duplicate" in str(exc.value.detail).lower()


class TestUpdateProject:
    @pytest.mark.asyncio
    async def test_updates_name(self):
        from app.api.v1.projects import update_project
        p = _make_project()
        data = ProjectUpdate(name="Updated Name")

        mock_db = AsyncMock()
        mock_db.execute.return_value = _mock_single_result(p)

        result = await update_project(
            project_id=p.id,
            data=data,
            db=mock_db,
            current_user=MagicMock(),
            org=MagicMock(id=p.organization_id),
            _=None,
        )
        assert p.name == "Updated Name"

    @pytest.mark.asyncio
    async def test_updates_slug_checks_duplicate(self):
        from app.api.v1.projects import update_project
        p = _make_project(slug="original")
        other = _make_project(organization_id=p.organization_id, slug="taken")
        data = ProjectUpdate(slug="taken")

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [
            _mock_single_result(p),
            _mock_single_result(other),
        ]

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            await update_project(
                project_id=p.id,
                data=data,
                db=mock_db,
                current_user=MagicMock(),
                org=MagicMock(id=p.organization_id),
                _=None,
            )
        assert exc.value.status_code == 409

    @pytest.mark.asyncio
    async def test_not_found(self):
        from fastapi import HTTPException
        from app.api.v1.projects import update_project
        mock_db = AsyncMock()
        mock_db.execute.return_value = _mock_single_result(None)

        with pytest.raises(HTTPException) as exc:
            await update_project(
                project_id=uuid.uuid4(),
                data=ProjectUpdate(name="Nope"),
                db=mock_db,
                current_user=MagicMock(),
                org=MagicMock(),
                _=None,
            )
        assert exc.value.status_code == 404


class TestDeleteProject:
    @pytest.mark.asyncio
    async def test_deletes(self):
        from app.api.v1.projects import delete_project
        p = _make_project()
        mock_db = AsyncMock()
        mock_db.execute.return_value = _mock_single_result(p)

        result = await delete_project(
            project_id=p.id,
            db=mock_db,
            current_user=MagicMock(),
            org=MagicMock(id=p.organization_id),
            _=None,
        )
        assert result is None
        mock_db.delete.assert_called_once_with(p)

    @pytest.mark.asyncio
    async def test_not_found(self):
        from fastapi import HTTPException
        from app.api.v1.projects import delete_project
        mock_db = AsyncMock()
        mock_db.execute.return_value = _mock_single_result(None)

        with pytest.raises(HTTPException) as exc:
            await delete_project(
                project_id=uuid.uuid4(),
                db=mock_db,
                current_user=MagicMock(),
                org=MagicMock(),
                _=None,
            )
        assert exc.value.status_code == 404


# --- Project model tests ---

class TestProjectModel:
    def test_model_fields(self):
        from app.models.project import Project
        now = datetime.now(timezone.utc)
        p = Project(
            id=uuid.uuid4(),
            organization_id=uuid.uuid4(),
            name="Model Test",
            slug="model-test",
            status="active",
            created_at=now,
            updated_at=now,
        )
        assert p.name == "Model Test"
        assert p.slug == "model-test"
        assert p.status == "active"

    def test_default_status(self):
        from app.models.project import Project
        now = datetime.now(timezone.utc)
        p = Project(
            id=uuid.uuid4(),
            organization_id=uuid.uuid4(),
            name="Default Status",
            slug="default-status",
            created_at=now,
            updated_at=now,
        )
        assert p.status == "active"

    def test_default_settings(self):
        from app.models.project import Project
        now = datetime.now(timezone.utc)
        p = Project(
            id=uuid.uuid4(),
            organization_id=uuid.uuid4(),
            name="Default Settings",
            slug="default-settings",
            status="active",
            created_at=now,
            updated_at=now,
        )
        assert p.settings is None or p.settings == {}


# --- UserProject model tests ---

class TestUserProjectModel:
    def test_model_fields(self):
        from app.models.organization import UserProject
        now = datetime.now(timezone.utc)
        up = UserProject(
            user_id=uuid.uuid4(),
            project_id=uuid.uuid4(),
            role="admin",
            is_active=True,
            joined_at=now,
        )
        assert up.user_id is not None
        assert up.project_id is not None
        assert up.role == "admin"
        assert up.is_active is True
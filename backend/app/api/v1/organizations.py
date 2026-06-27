from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.organization import (
    Organization, Team, UserOrganization, UserTeam,
    OrgRole, SubscriptionTier,
)
from app.schemas.organization import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse,
    TeamCreate, TeamUpdate, TeamResponse,
    MemberInvite, MemberResponse, SwitchOrganizationResponse,
)
from app.utils.security import get_current_user
from uuid import UUID

router = APIRouter(prefix="/organizations", tags=["organizations"])


# ─── Organization CRUD ───────────────────────────────────────────────

@router.post("", response_model=OrganizationResponse, status_code=201)
async def create_organization(
    data: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new organization and make the creator an admin."""
    # Check slug uniqueness
    existing = await db.execute(select(Organization).where(Organization.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Organization slug already taken")

    org = Organization(
        name=data.name,
        slug=data.slug,
        subscription_tier=SubscriptionTier.FREE,
    )
    db.add(org)
    await db.flush()

    # Make the creator an admin
    membership = UserOrganization(
        user_id=current_user.id,
        organization_id=org.id,
        role=OrgRole.ADMIN,
    )
    db.add(membership)
    await db.flush()
    await db.refresh(org)
    return OrganizationResponse.model_validate(org)


@router.get("", response_model=list[OrganizationResponse])
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all organizations the current user belongs to."""
    result = await db.execute(
        select(Organization).join(UserOrganization).where(
            UserOrganization.user_id == current_user.id,
            UserOrganization.is_active == True,
        )
    )
    orgs = result.scalars().all()
    return [OrganizationResponse.model_validate(o) for o in orgs]


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get organization details (must be a member)."""
    await _verify_membership(current_user.id, org_id, db)
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrganizationResponse.model_validate(org)


@router.patch("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: UUID,
    data: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update organization (admin only)."""
    await _require_role(current_user.id, org_id, OrgRole.ADMIN, db)
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if data.name is not None:
        org.name = data.name
    if data.settings is not None:
        org.settings = data.settings

    await db.flush()
    await db.refresh(org)
    return OrganizationResponse.model_validate(org)


# ─── Members ─────────────────────────────────────────────────────────

@router.get("/{org_id}/members", response_model=list[MemberResponse])
async def list_members(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all members of an organization."""
    await _verify_membership(current_user.id, org_id, db)
    result = await db.execute(
        select(UserOrganization, User.email, User.full_name)
        .join(User, UserOrganization.user_id == User.id)
        .where(
            UserOrganization.organization_id == org_id,
            UserOrganization.is_active == True,
        )
    )
    rows = result.all()
    members = []
    for row in rows:
        uo, email, full_name = row
        members.append(MemberResponse(
            user_id=uo.user_id,
            email=email,
            full_name=full_name,
            role=uo.role,
            is_active=uo.is_active,
            joined_at=uo.joined_at,
        ))
    return members


@router.post("/{org_id}/members", response_model=MemberResponse, status_code=201)
async def invite_member(
    org_id: UUID,
    data: MemberInvite,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Invite a user to the organization (admin only)."""
    await _require_role(current_user.id, org_id, OrgRole.ADMIN, db)

    # Find the user by email
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found. They must register first.")

    # Check if already a member
    existing = await db.execute(
        select(UserOrganization).where(
            UserOrganization.user_id == user.id,
            UserOrganization.organization_id == org_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a member of this organization")

    membership = UserOrganization(
        user_id=user.id,
        organization_id=org_id,
        role=data.role,
    )
    db.add(membership)
    await db.flush()

    return MemberResponse(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=data.role,
        is_active=True,
        joined_at=membership.joined_at,
    )


@router.patch("/{org_id}/members/{user_id}/role", response_model=MemberResponse)
async def update_member_role(
    org_id: UUID,
    user_id: UUID,
    role: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a member's role (admin only)."""
    await _require_role(current_user.id, org_id, OrgRole.ADMIN, db)

    if role not in [r.value for r in OrgRole]:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {[r.value for r in OrgRole]}")

    result = await db.execute(
        select(UserOrganization).where(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == org_id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    membership.role = role
    await db.flush()

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    return MemberResponse(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=role,
        is_active=membership.is_active,
        joined_at=membership.joined_at,
    )


@router.delete("/{org_id}/members/{user_id}", status_code=204)
async def remove_member(
    org_id: UUID,
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a member from the organization (admin only)."""
    await _require_role(current_user.id, org_id, OrgRole.ADMIN, db)

    result = await db.execute(
        select(UserOrganization).where(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == org_id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    await db.delete(membership)


# ─── Teams ────────────────────────────────────────────────────────────

@router.post("/{org_id}/teams", response_model=TeamResponse, status_code=201)
async def create_team(
    org_id: UUID,
    data: TeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a team within an organization (admin/member)."""
    await _require_role(current_user.id, org_id, [OrgRole.ADMIN, OrgRole.MEMBER], db)

    team = Team(
        organization_id=org_id,
        name=data.name,
        description=data.description,
    )
    db.add(team)
    await db.flush()
    await db.refresh(team)
    return TeamResponse.model_validate(team)


@router.get("/{org_id}/teams", response_model=list[TeamResponse])
async def list_teams(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all teams in an organization."""
    await _verify_membership(current_user.id, org_id, db)
    result = await db.execute(
        select(Team).where(Team.organization_id == org_id).order_by(Team.name)
    )
    teams = result.scalars().all()
    return [TeamResponse.model_validate(t) for t in teams]


# ─── Switch / Session ─────────────────────────────────────────────────

@router.post("/switch/{org_id}", response_model=SwitchOrganizationResponse)
async def switch_organization(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Switch the user's active organization and return a session token claim."""
    membership = await _verify_membership(current_user.id, org_id, db)
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return SwitchOrganizationResponse(
        organization_id=org.id,
        organization_name=org.name,
        role=membership.role,
    )


# ─── Helpers ──────────────────────────────────────────────────────────

async def _verify_membership(user_id: UUID, org_id: UUID, db: AsyncSession) -> UserOrganization:
    """Verify user is an active member of the organization."""
    result = await db.execute(
        select(UserOrganization).where(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == org_id,
            UserOrganization.is_active == True,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization",
        )
    return membership


async def _require_role(
    user_id: UUID, org_id: UUID, required_roles: str | list[str], db: AsyncSession
) -> UserOrganization:
    """Verify user has the required role(s) in the organization."""
    membership = await _verify_membership(user_id, org_id, db)
    if isinstance(required_roles, str):
        required_roles = [required_roles]
    if membership.role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires one of these roles: {required_roles}",
        )
    return membership

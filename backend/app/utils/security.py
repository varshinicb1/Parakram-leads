from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.organization import Organization, UserOrganization, OrgRole

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


async def get_current_organization(
    org_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Organization:
    """
    Get the current organization from the X-Organization-ID header.
    Validates that the user is an active member of the organization.
    """
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Organization-ID header is required",
        )

    try:
        org_uuid = UUID(org_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Organization-ID format",
        )

    # Verify user is a member of this org
    membership_result = await db.execute(
        select(UserOrganization).where(
            UserOrganization.user_id == current_user.id,
            UserOrganization.organization_id == org_uuid,
            UserOrganization.is_active == True,
        )
    )
    membership = membership_result.scalar_one_or_none()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization",
        )

    org_result = await db.execute(
        select(Organization).where(Organization.id == org_uuid, Organization.is_active == True)
    )
    org = org_result.scalar_one_or_none()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found or inactive",
        )

    return org


def require_role(*required_roles: str):
    """
    Dependency factory: requires the user to have one of the specified roles
    in the current organization.

    Usage:
        @router.get("/leads")
        async def list_leads(
            org: Organization = Depends(get_current_organization),
            role_check: None = Depends(require_role("admin", "member")),
            ...
        ):
    """
    async def _require_role(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
        org: Organization = Depends(get_current_organization),
    ) -> None:
        result = await db.execute(
            select(UserOrganization).where(
                UserOrganization.user_id == current_user.id,
                UserOrganization.organization_id == org.id,
                UserOrganization.is_active == True,
            )
        )
        membership = result.scalar_one_or_none()
        if not membership or membership.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of these roles: {required_roles}",
            )

    return _require_role

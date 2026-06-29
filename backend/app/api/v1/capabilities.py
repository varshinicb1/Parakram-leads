"""Capability Registry API — discover and manage product capabilities."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.capability import Capability
from app.models.store import Product
from app.services.capability_registry import CapabilityRegistry
from app.utils.security import get_current_user, get_current_organization, require_role
from app.models.organization import Organization
import uuid

router = APIRouter(prefix="/api/v1/capabilities", tags=["capabilities"])


@router.get("")
async def list_capabilities(
    execution_target: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
):
    """List all capabilities across all products."""
    caps = await CapabilityRegistry.list_all(
        db, org_id=org.id, execution_target=execution_target
    )
    return {"capabilities": caps, "count": len(caps)}


@router.get("/{capability_id}")
async def get_capability(
    capability_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
):
    """Find what product provides a specific capability."""
    product = await CapabilityRegistry.find_provider(
        db, capability_id, org_id=org.id
    )
    if not product:
        raise HTTPException(
            status_code=404,
            detail=f"No provider found for capability: {capability_id}",
        )
    caps = await CapabilityRegistry.get_product_capabilities(db, product.id)
    matching = [c for c in caps if c.capability_id == capability_id]
    cap = matching[0] if matching else None

    return {
        "capability_id": capability_id,
        "product": {
            "id": str(product.id),
            "name": product.name,
            "slug": product.slug,
            "status": product.status.value if product.status else None,
        },
        "capability": {
            "name": cap.name if cap else None,
            "description": cap.description if cap else None,
            "execution_target": cap.execution_target.value if cap else None,
            "execution_timeout": cap.execution_timeout if cap else None,
            "execution_resources": cap.execution_resources or [] if cap else [],
            "input_schema": cap.input_schema if cap else {},
            "output_schema": cap.output_schema if cap else {},
        } if cap else None,
    }


@router.get("/by-product/{product_id}")
async def get_product_capabilities(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
):
    """List capabilities for a specific product."""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    caps = await CapabilityRegistry.get_product_capabilities(db, product_id)
    return {
        "product_id": str(product_id),
        "product_name": product.name,
        "capabilities": [
            {
                "id": str(c.id),
                "capability_id": c.capability_id,
                "name": c.name,
                "description": c.description,
                "execution_target": c.execution_target.value,
                "execution_timeout": c.execution_timeout,
                "execution_resources": c.execution_resources or [],
                "input_schema": c.input_schema,
                "output_schema": c.output_schema,
            }
            for c in caps
        ],
        "count": len(caps),
    }

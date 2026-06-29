"""Capability Registry — allows every product to declare what it can do.

Provides a queryable index of capabilities across all products, enabling
the platform to discover and route work dynamically instead of hardcoding
service-to-service calls.

Usage:
    from app.services.capability_registry import CapabilityRegistry

    # Register a capability (admin)
    cap = await CapabilityRegistry.register(
        db=db,
        product_id=product.id,
        org_id=org.id,
        capability_id="lead:analyze",
        name="Lead Analysis",
        ...
    )

    # Find what product provides a capability
    product = await CapabilityRegistry.find_provider(db, "lead:analyze")

    # List everything available
    capabilities = await CapabilityRegistry.list_all(db, org_id=org.id)
"""

import uuid
import logging
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.capability import Capability, ExecutionTarget
from app.models.store import Product

logger = logging.getLogger(__name__)


class CapabilityRegistry:

    @staticmethod
    async def register(
        db: AsyncSession,
        product_id: uuid.UUID,
        org_id: uuid.UUID,
        capability_id: str,
        name: str,
        description: str = None,
        input_schema: dict = None,
        output_schema: dict = None,
        execution_target: str = "cloud",
        execution_timeout: int = 300,
        execution_resources: list = None,
    ) -> Capability:
        """Register a capability for a product. Upserts if capability_id exists."""

        existing = await db.execute(
            select(Capability).where(
                and_(
                    Capability.product_id == product_id,
                    Capability.capability_id == capability_id,
                )
            )
        )
        existing_cap = existing.scalar_one_or_none()

        if existing_cap:
            existing_cap.name = name
            existing_cap.description = description
            existing_cap.input_schema = input_schema or {}
            existing_cap.output_schema = output_schema or {}
            existing_cap.execution_target = ExecutionTarget(execution_target)
            existing_cap.execution_timeout = execution_timeout
            existing_cap.execution_resources = execution_resources or []
            existing_cap.is_active = True
            cap = existing_cap
        else:
            cap = Capability(
                product_id=product_id,
                organization_id=org_id,
                capability_id=capability_id,
                name=name,
                description=description,
                input_schema=input_schema or {},
                output_schema=output_schema or {},
                execution_target=ExecutionTarget(execution_target),
                execution_timeout=execution_timeout,
                execution_resources=execution_resources or [],
                is_active=True,
            )
            db.add(cap)

        await db.flush()
        await db.refresh(cap)
        logger.info(
            "Capability registered: %s for product %s", capability_id, product_id
        )
        return cap

    @staticmethod
    async def find_provider(
        db: AsyncSession,
        capability_id: str,
        org_id: uuid.UUID = None,
    ) -> Product | None:
        """Find the product that provides a given capability."""
        query = (
            select(Capability)
            .where(
                Capability.capability_id == capability_id,
                Capability.is_active == True,
            )
        )
        if org_id:
            query = query.where(Capability.organization_id == org_id)

        result = await db.execute(query)
        cap = result.scalar_one_or_none()
        if not cap:
            return None

        product_result = await db.execute(
            select(Product).where(Product.id == cap.product_id)
        )
        return product_result.scalar_one_or_none()

    @staticmethod
    async def find_products_by_capabilities(
        db: AsyncSession,
        capability_ids: list[str],
        org_id: uuid.UUID = None,
        match_all: bool = True,
    ) -> list[Product]:
        """Find products that provide the given capabilities.

        Args:
            match_all: If True, product must provide ALL capabilities.
                       If False, product must provide ANY of them.
        """
        if not capability_ids:
            return []

        query = (
            select(Capability.product_id)
            .where(
                Capability.capability_id.in_(capability_ids),
                Capability.is_active == True,
            )
        )
        if org_id:
            query = query.where(Capability.organization_id == org_id)

        result = await db.execute(query)
        product_ids = [row[0] for row in result.all()]

        if not product_ids:
            return []

        from collections import Counter
        id_counts = Counter(product_ids)

        if match_all:
            matching_ids = [
                pid for pid, count in id_counts.items()
                if count == len(capability_ids)
            ]
        else:
            matching_ids = list(id_counts.keys())

        if not matching_ids:
            return []

        products_result = await db.execute(
            select(Product).where(
                Product.id.in_(matching_ids),
                Product.soft_deleted == False,
            )
        )
        return list(products_result.scalars().all())

    @staticmethod
    async def get_product_capabilities(
        db: AsyncSession,
        product_id: uuid.UUID,
    ) -> list[Capability]:
        """List all capabilities for a specific product."""
        result = await db.execute(
            select(Capability)
            .where(
                Capability.product_id == product_id,
                Capability.is_active == True,
            )
            .order_by(Capability.capability_id.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def list_all(
        db: AsyncSession,
        org_id: uuid.UUID = None,
        execution_target: str = None,
    ) -> list[dict]:
        """List all capabilities across all products, with product info."""
        query = (
            select(Capability, Product.name.label("product_name"), Product.slug)
            .join(Product, Capability.product_id == Product.id)
            .where(
                Capability.is_active == True,
                Product.soft_deleted == False,
            )
        )
        if org_id:
            query = query.where(Capability.organization_id == org_id)
        if execution_target:
            query = query.where(
                Capability.execution_target == ExecutionTarget(execution_target)
            )
        query = query.order_by(Capability.capability_id.asc())

        result = await db.execute(query)
        rows = result.all()

        return [
            {
                "id": str(row.Capability.id),
                "product_id": str(row.Capability.product_id),
                "product_name": row.product_name,
                "product_slug": row.slug,
                "capability_id": row.Capability.capability_id,
                "name": row.Capability.name,
                "description": row.Capability.description,
                "input_schema": row.Capability.input_schema,
                "output_schema": row.Capability.output_schema,
                "execution_target": row.Capability.execution_target.value,
                "execution_timeout": row.Capability.execution_timeout,
                "execution_resources": row.Capability.execution_resources or [],
                "is_active": row.Capability.is_active,
            }
            for row in rows
        ]

    @staticmethod
    async def remove(
        db: AsyncSession,
        capability_id: str,
        product_id: uuid.UUID = None,
    ) -> bool:
        """Remove (deactivate) a capability."""
        query = select(Capability).where(
            Capability.capability_id == capability_id,
        )
        if product_id:
            query = query.where(Capability.product_id == product_id)

        result = await db.execute(query)
        cap = result.scalar_one_or_none()
        if not cap:
            return False

        cap.is_active = False
        await db.flush()
        logger.info("Capability deactivated: %s", capability_id)
        return True

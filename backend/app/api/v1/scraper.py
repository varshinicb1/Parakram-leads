from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, async_session_factory
from app.models.organization import Organization
from app.services.scraper import run_crawl, scrape_single_category, scrape_duckduckgo, JUSTDIAL_CATEGORIES, BANGALORE_LOCATIONS
from app.utils.security import get_current_user, get_current_organization, require_role
from pydantic import BaseModel
import csv
import io
import asyncio
from app.models.lead import Lead, LeadStatus, LeadCategory
from app.models.user import User
from sqlalchemy import select
import re

router = APIRouter(prefix="/scraper", tags=["scraper"])


class ScraperResponse(BaseModel):
    status: str
    message: str
    stats: dict | None = None


class ImportResponse(BaseModel):
    status: str
    imported: int
    skipped: int
    errors: list[str] = []


def normalize_phone(raw: str) -> str:
    cleaned = re.sub(r'[\s\-\(\)\+\#\*\.]', '', raw)
    if cleaned.startswith('91') and len(cleaned) >= 12:
        return cleaned
    if cleaned.startswith('0') and len(cleaned) >= 11:
        return '91' + cleaned[1:]
    if len(cleaned) == 10 and cleaned[0] in '6789':
        return '91' + cleaned
    return cleaned


def is_valid_phone(phone: str) -> bool:
    cleaned = re.sub(r'\D', '', phone)
    if cleaned.startswith('91'):
        cleaned = cleaned[2:]
    return len(cleaned) == 10 and cleaned[0] in '6789'


scrape_status: dict = {"running": False, "progress": "", "done": False}

@router.post("/run")
async def start_crawl(
    background_tasks: BackgroundTasks,
    categories: list[str] | None = None,
    locations: list[str] | None = None,
    pages: int = Query(default=2, le=5),
    use_maps: bool = True,
    use_justdial: bool = False,
    use_ddg: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member")),
):
    if scrape_status["running"]:
        return ScraperResponse(status="busy", message="Scrape already in progress", stats={})

    if categories is None or len(categories) == 0:
        categories = JUSTDIAL_CATEGORIES[:5]

    scrape_status["running"] = True
    scrape_status["done"] = False
    scrape_status["progress"] = f"Starting: {len(categories)} categories, {len(locations or BANGALORE_LOCATIONS[:3])} locations"

    import asyncio

    async def run_in_background():
        def progress(msg: str):
            scrape_status["progress"] = msg
        try:
            async with async_session_factory() as bg_db:
                stats = await asyncio.wait_for(
                    run_crawl(
                        categories=categories,
                        locations=locations,
                        max_pages=pages,
                        use_maps=use_maps,
                        use_justdial=use_justdial,
                        use_ddg=use_ddg,
                        db=bg_db,
                        progress_callback=progress,
                        organization_id=org.id,
                    ),
                    timeout=1800,
                )
                await bg_db.commit()
                scrape_status["stats"] = stats
                scrape_status["progress"] = f"Done: {stats['categories_done']} cat, {stats['total_leads']} leads, {stats['saved']} saved"
        except asyncio.TimeoutError:
            scrape_status["progress"] = "Error: Timed out after 30 min"
        except Exception as e:
            scrape_status["progress"] = f"Error: {e}"
        finally:
            scrape_status["running"] = False
            scrape_status["done"] = True

    background_tasks.add_task(run_in_background)
    return ScraperResponse(status="started", message=f"Crawl started: {len(categories)} categories", stats={})

@router.get("/status")
async def get_scrape_status():
    return {"status": "running" if scrape_status["running"] else ("done" if scrape_status["done"] else "idle"),
            "progress": scrape_status.get("progress", ""),
            "stats": scrape_status.get("stats", {})}


@router.post("/single/{category}")
async def scrape_category(
    category: str,
    location: str = Query(default="Bangalore"),
    pages: int = Query(default=2, le=5),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member")),
):
    leads = await scrape_single_category(category, location, pages, db=db, organization_id=org.id)
    return ScraperResponse(
        status="ok",
        message=f"Scraped {len(leads)} leads without websites for {category} in {location}",
        stats={"category": category, "leads_found": len(leads)},
    )


@router.get("/categories")
async def list_categories():
    return {"categories": JUSTDIAL_CATEGORIES}


@router.get("/locations")
async def list_locations():
    return {"locations": BANGALORE_LOCATIONS}


@router.post("/import-csv", response_model=ImportResponse)
async def import_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member")),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files accepted")

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    skipped = 0
    errors = []

    for row_num, row in enumerate(reader, 1):
        business_name = row.get("business_name", "").strip()
        phone_raw = row.get("phone", "").strip()
        industry = row.get("industry", row.get("category", "General")).strip()
        location = row.get("location", "").strip()
        description = row.get("description", "").strip()
        website = row.get("website", "").strip()

        if not business_name or len(business_name) < 2:
            errors.append(f"Row {row_num}: No business name")
            skipped += 1
            continue

        phone = normalize_phone(phone_raw)
        if not phone or not is_valid_phone(phone):
            errors.append(f"Row {row_num}: Invalid phone '{phone_raw}' for '{business_name}'")
            skipped += 1
            continue

        existing = await db.execute(
            select(Lead).where(Lead.phone == phone, Lead.organization_id == org.id)
        )
        if existing.scalar_one_or_none():
            errors.append(f"Row {row_num}: Phone '{phone}' already exists")
            skipped += 1
            continue

        try:
            lead = Lead(
                organization_id=org.id,
                business_name=business_name[:255],
                phone=phone,
                industry=industry[:128],
                category=LeadCategory.COLD,
                status=LeadStatus.DISCOVERED,
                location=location[:255],
                business_description=description[:1000],
                website_url=website[:512] if website else "",
                website_exists=bool(website),
                source="csv_import",
                social_profiles={},
            )
            db.add(lead)
            imported += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            skipped += 1

    if imported > 0:
        await db.flush()

    return ImportResponse(
        status="ok",
        imported=imported,
        skipped=skipped,
        errors=errors[-50:],
    )


@router.get("/export-csv")
async def export_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member", "viewer")),
):
    result = await db.execute(
        select(Lead).where(Lead.source == "csv_import", Lead.organization_id == org.id)
        .order_by(Lead.created_at.desc()).limit(10000)
    )
    leads = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["business_name", "phone", "industry", "location", "description", "website", "source", "created_at"])
    for lead in leads:
        writer.writerow([
            lead.business_name,
            lead.phone,
            lead.industry,
            lead.location,
            lead.business_description or "",
            lead.website_url or "",
            lead.source,
            lead.created_at.isoformat() if lead.created_at else "",
        ])

    from fastapi.responses import StreamingResponse
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_export.csv"},
    )

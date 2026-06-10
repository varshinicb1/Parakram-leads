import asyncio
import csv
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import async_session_factory, init_db
from app.models.lead import Lead, LeadStatus, LeadCategory
from sqlalchemy import select
import re


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


async def import_csv(filepath: str, db) -> tuple[int, int]:
    imported = 0
    skipped = 0

    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, 1):
            business_name = row.get("business_name", "").strip()
            phone_raw = row.get("phone", "").strip()
            industry = row.get("industry", row.get("category", "General")).strip()
            location = row.get("location", "").strip()
            description = row.get("description", "").strip()
            website = row.get("website", "").strip()

            if not business_name or len(business_name) < 2:
                print(f"  Row {row_num}: Skipped - no business name")
                skipped += 1
                continue

            phone = normalize_phone(phone_raw)
            if not phone or not is_valid_phone(phone):
                print(f"  Row {row_num}: Skipped '{business_name}' - invalid phone: {phone_raw}")
                skipped += 1
                continue

            existing = await db.execute(select(Lead).where(Lead.phone == phone))
            if existing.scalar_one_or_none():
                print(f"  Row {row_num}: Skipped '{business_name}' - phone already exists")
                skipped += 1
                continue

            try:
                lead = Lead(
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
                print(f"  Row {row_num}: Imported '{business_name}' | {phone}")
            except Exception as e:
                print(f"  Row {row_num}: Error importing '{business_name}': {e}")
                skipped += 1

    return imported, skipped


async def export_template(output_path: str = "lead_template.csv"):
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["business_name", "phone", "industry", "location", "description", "website"])
        writer.writerow(["Example Restaurant", "919123456789", "Restaurants", "Koramangala Bangalore",
                        "A popular local restaurant", ""])
        writer.writerow(["Example Salon", "919876543210", "Salons", "Indiranagar Bangalore",
                        "Unisex salon and beauty parlor", ""])
    print(f"Template exported to {output_path}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Import leads from CSV to database")
    parser.add_argument("file", nargs="?", default="lead_template.csv",
                        help="CSV file to import")
    parser.add_argument("--template", action="store_true",
                        help="Export a template CSV file")
    parser.add_argument("--output", "-o", default="lead_import_template.csv",
                        help="Output path for template (default: lead_import_template.csv)")

    args = parser.parse_args()

    async def main():
        if args.template:
            await export_template(args.output)
            return

        if not os.path.exists(args.file):
            print(f"Error: File '{args.file}' not found!")
            print("Use --template to generate a template first.")
            print("Or: python import_leads.py your_data.csv")
            return

        await init_db()
        async with async_session_factory() as db:
            imported, skipped = await import_csv(args.file, db)
            await db.commit()

        print(f"\nImport complete: {imported} imported, {skipped} skipped")

    asyncio.run(main())

import asyncio, random, json
from app.database import async_session_factory
from app.models.lead import Lead, LeadStatus, LeadCategory
from app.services.scorer import compute_scores
from app.services.ai_analyzer import analyze_lead
from app.services.prioritizer import categorize_lead
from app.services.outreach_generator import generate_outreach
from app.services.scraper import JUSTDIAL_CATEGORIES, BANGALORE_LOCATIONS
from sqlalchemy import select, func

# Business name prefixes per category
PREFIXES = {
    "Restaurants": ["Sri", "New", "Royal", "Golden", "Spice", "Deluxe", "Shree", "Annapurna", "Sagar", "Udupi"],
    "Gyms": ["Iron", "Power", "Fit", "Muscle", "Titan", "Prime", "Elite", "Pro", "Max", "Strong"],
    "Salons": ["Style", "Glow", "Royal", "Modern", "Elite", "Prime", "Sharp", "Classic", "New", "Star"],
    "default": ["Sri", "Royal", "New", "Shree", "Om", "Shri", "Premier", "Prime", "City", "National"],
}

SUFFIXES = {
    "Restaurants": ["Restaurant", "Hotel", "Food Court", "Dining Hall", "Bhojanalaya", "Food Point", "Eatery", "Kitchen"],
    "Gyms": ["Gym", "Fitness Center", "Fitness Studio", "Gym And Fitness", "Health Club", "Workout Zone", "Fitness Hub"],
    "Salons": ["Salon", "Unisex Salon", "Gents Salon", "Ladies Salon", "Styles", "Hair Studio", "Beauty Salon"],
    "Plumbers": ["Plumbing Works", "Plumbing Services", "Plumbers", "Plumbing Solutions", "Pipe Works", "Drain Care"],
    "Electricians": ["Electricals", "Electric Works", "Electrical Services", "Electro Solutions", "Wiring Works", "Electricians"],
    "Packers Movers": ["Packers And Movers", "Movers And Packers", "Relocation Services", "Cargo Movers", "Logistics", "Transport And Movers"],
    "Dentists": ["Dental Clinic", "Dental Care", "Dental Studio", "Dental Centre", "Dental Hospital", "Smile Care", "Dental World"],
    "Photographers": ["Photography", "Studios", "Photography Studio", "Photography Works", "Imaging Studio", "Photo Studio", "Photographers"],
    "Tutors": ["Academy", "Classes", "Coaching Centre", "Tuition Centre", "Learning Centre", "Education Hub", "Tutorials", "Study Point"],
    "default": ["Services", "Enterprises", "Agencies", "Solutions", "Traders", "Suppliers", "Works", "Stores", "Point"],
}

LOCALITY_TERMS = {
    "Koramangala": "Koramangala",
    "Indiranagar": "Indiranagar",
    "Whitefield": "Whitefield",
    "Marathahalli": "Marathahalli",
    "Jayanagar": "Jayanagar",
    "JP Nagar": "JP Nagar",
    "BTM Layout": "BTM Layout",
    "HSR Layout": "HSR Layout",
    "Banashankari": "Banashankari",
    "Basavanagudi": "Basavanagudi",
    "Malleshwaram": "Malleshwaram",
    "Rajajinagar": "Rajajinagar",
    "Vijayanagar": "Vijayanagar",
    "RR Nagar": "RR Nagar",
    "Yelahanka": "Yelahanka",
    "Hebbal": "Hebbal",
    "Electronic City": "Electronic City",
    "MG Road": "MG Road",
    "Brigade Road": "Brigade Road",
    "Sadashivanagar": "Sadashivanagar",
    "Ulsoor": "Ulsoor",
    "Domlur": "Domlur",
    "HAL": "HAL",
    "Vasanth Nagar": "Vasanth Nagar",
    "Yeshwanthpur": "Yeshwanthpur",
    "Peenya": "Peenya",
    "Kengeri": "Kengeri",
    "Nagarabhavi": "Nagarabhavi",
    "Padmanabhanagar": "Padmanabhanagar",
    "Bannerghatta Road": "Bannerghatta Road",
    "Kanakapura Road": "Kanakapura Road",
    "Mysore Road": "Mysore Road",
    "Sarjapur Road": "Sarjapur Road",
    "Kanakapura": "Kanakapura",
    "Anekal": "Anekal",
}


def generate_business_name(category: str, location: str) -> str:
    prefixes = PREFIXES.get(category, PREFIXES["default"])
    suffixes = SUFFIXES.get(category, SUFFIXES["default"])
    prefix = random.choice(prefixes)
    suffix = random.choice(suffixes)
    patterns = [
        f"{prefix} {suffix}",
        f"{prefix} {location} {suffix}",
        f"{prefix} {category} {suffix}",
        f"{location} {suffix}",
    ]
    return random.choice(patterns)


def generate_phone(used_phones: set) -> str:
    while True:
        phone = f"9198{random.randint(10000000, 99999999)}"
        if phone not in used_phones:
            used_phones.add(phone)
            return phone


def generate_description(category: str, name: str, location: str) -> str:
    descs = {
        "Restaurants": [
            f"Popular {category.lower()} serving authentic dishes, family-friendly ambiance in {location}",
            f"Best {category.lower()} in {location} known for delicious food and great service",
            f"Authentic {category.lower()} with a wide menu, catering services available",
        ],
        "Gyms": [
            f"Premium {category.lower()} with modern equipment, personal trainers, and group classes in {location}",
            f"Well-equipped {category.lower()} offering cardio, weights, yoga, and Zumba sessions",
        ],
        "Salons": [
            f"Professional {category.lower()} offering haircuts, styling, grooming, and beauty treatments",
            f"Trendy {category.lower()} with experienced stylists and premium products",
        ],
        "Dentists": [
            f"Experienced {category.lower()} offering root canal, implants, whitening, and braces in {location}",
            f"Multi-speciality {category.lower()} with advanced dental care and painless treatments",
        ],
        "default": [
            f"Trusted {category.lower()} providing quality services to customers in {location} for over 10 years",
            f"Professional {category.lower()} with experienced team and customer-focused approach in {location}",
            f"Reliable {category.lower()} serving {location} with quality workmanship and affordable rates",
        ],
    }
    return random.choice(descs.get(category, descs["default"]))


async def main():
    used_phones: set = set()
    leads_per_combination = 3

    async with async_session_factory() as db:
        # Generate leads for every category x location
        total_generated = 0
        for cat_idx, category in enumerate(JUSTDIAL_CATEGORIES):
            batch = []
            for loc_idx, location in enumerate(BANGALORE_LOCATIONS):
                for i in range(leads_per_combination):
                    name = generate_business_name(category, location)
                    phone = generate_phone(used_phones)
                    desc = generate_description(category, name, location)
                    rating = round(random.uniform(3.5, 4.8), 1)
                    reviews = random.randint(20, 1500)
                    batch.append({
                        "business_name": name,
                        "industry": category,
                        "location": location,
                        "description": desc,
                        "phone": phone,
                        "rating": rating,
                        "reviews": reviews,
                    })

            # Insert batch for this category
            inserted = 0
            for b in batch:
                lead = Lead(
                    business_name=b["business_name"],
                    industry=b["industry"],
                    location=b["location"],
                    business_description=b["description"],
                    phone=b["phone"],
                    source="synthetic_scrape",
                    rating=b["rating"],
                    review_count=b["reviews"],
                    category_flag=LeadCategory.COLD,
                    status=LeadStatus.DISCOVERED,
                    social_profiles={},
                )
                db.add(lead)
                inserted += 1
                total_generated += 1

            await db.commit()
            print(f"[{cat_idx+1}/{len(JUSTDIAL_CATEGORIES)}] {category}: {inserted} leads ({total_generated} total)")

        # Verify
        total = await db.execute(select(func.count(Lead.id)))
        print(f"\n{'='*60}")
        print(f"TOTAL LEADS GENERATED: {total.scalar()}")
        print(f"{'='*60}")

        # Now analyze all leads
        print(f"\nStarting analysis pipeline...")
        result = await db.execute(
            select(Lead).where(Lead.status == LeadStatus.DISCOVERED)
            .order_by(Lead.created_at.asc())
        )
        leads = result.scalars().all()
        print(f"Analyzing {len(leads)} leads...")

        for idx, lead in enumerate(leads):
            dm_score, opp_score = await compute_scores(lead)
            lead.digital_maturity_score = dm_score
            lead.opportunity_score = opp_score

            analysis = await analyze_lead(lead)
            lead.ai_analysis = analysis.get("analysis", "")
            lead.suggested_solution = analysis.get("suggested_solution", "")
            lead.estimated_project_value = analysis.get("estimated_project_value", 0)
            lead.estimated_needs = analysis.get("estimated_needs", [])
            lead.recommended_outreach = analysis.get("recommended_outreach", "")

            category = await categorize_lead(lead)
            lead.category_flag = category
            lead.status = LeadStatus.ANALYZED

            outreach = await generate_outreach(lead)
            lead.outreach_message_whatsapp = outreach.get("whatsapp", "")
            lead.outreach_message_email = outreach.get("email", "")
            lead.outreach_message_linkedin = outreach.get("linkedin", "")

            if (idx + 1) % 50 == 0 or idx == len(leads) - 1:
                await db.commit()
                print(f"  Analyzed {idx+1}/{len(leads)} leads")

        await db.commit()
        print(f"\n{'='*60}")
        print(f"DONE! All {len(leads)} leads analyzed and categorized.")
        print(f"{'='*60}")

        # Summary stats
        stats = await db.execute(
            select(Lead.category_flag, func.count(Lead.id))
            .group_by(Lead.category_flag)
        )
        print("\nCategory breakdown:")
        for row in stats:
            print(f"  {row.category_flag}: {row.count}")


asyncio.run(main())

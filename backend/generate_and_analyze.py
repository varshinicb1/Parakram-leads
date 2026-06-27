import asyncio
from app.database import async_session_factory
from app.models.lead import Lead, LeadStatus, LeadCategory
from app.services.scorer import compute_scores
from app.services.ai_analyzer import analyze_lead
from app.services.prioritizer import categorize_lead
from app.services.outreach_generator import generate_outreach
from sqlalchemy import select, func


async def main():
    async with async_session_factory() as db:
        # --- STEP 1: Generate leads ---
        businesses = [
            ('Sri Krishna Bhavan', 'Restaurants', 'Koramangala', 'Popular South Indian vegetarian restaurant serving breakfast, meals, and tiffin items', '919845678901', 4.3, 1200),
            ('Mughlai Palace', 'Restaurants', 'Indiranagar', 'Authentic Mughlai and North Indian cuisine restaurant with family dining', '919812345602', 4.1, 850),
            ('Coastal Catch', 'Restaurants', 'Whitefield', 'Seafood speciality restaurant offering fresh coastal Kerala and Mangalore dishes', '919887654321', 4.5, 670),
            ('Dragon Wok', 'Restaurants', 'HSR Layout', 'Chinese and Indo-Chinese restaurant known for noodles and starters', '919834567890', 4.0, 430),
            ('Punjab Dhaba', 'Restaurants', 'Jayanagar', 'Traditional Punjabi dhaba style restaurant with butter chicken and naan', '919856789012', 4.2, 950),
            ('Style Studio Unisex Salon', 'Salons', 'BTM Layout', 'Modern unisex hair salon offering haircuts, coloring, styling, and grooming', '919877123456', 4.3, 320),
            ('Gents Professional Salon', 'Salons', 'Marathahalli', 'Premium gents salon providing haircuts, beard grooming, facial, and spa services', '919888234567', 4.0, 180),
            ('Glamour Beauty Parlour', 'Beauty Parlours', 'JP Nagar', 'Full-service beauty parlour for women offering bridal makeup, facials, waxing, and nail art', '919899345678', 4.4, 560),
            ('Iron Forge Gym', 'Gyms', 'Electronic City', 'Fully equipped gym with cardio, free weights, machines, and personal training', '919811156789', 4.2, 450),
            ('Fit Nation Fitness Center', 'Gyms', 'Yelahanka', 'Modern fitness center with group classes, yoga, Zumba, and CrossFit', '919822267890', 4.5, 280),
            ('Powerhouse Gym And Fitness', 'Gyms', 'Vijayanagar', 'Affordable gym with experienced trainers, cardio zone, and weight training section', '919833378901', 4.1, 390),
            ('Smile Care Dental Clinic', 'Dentists', 'Malleshwaram', 'Multi-speciality dental clinic offering root canal, implants, teeth whitening, and braces', '919844489012', 4.6, 720),
            ('Dental Health Centre', 'Dentists', 'Rajajinagar', 'Family dental clinic with advanced equipment for all dental treatments', '919855590123', 4.3, 340),
            ('Advanced Dental Studio', 'Dentists', 'Basavanagudi', 'High-end dental clinic specializing in cosmetic dentistry and laser treatments', '919866601234', 4.4, 510),
            ('QuickFix Plumbing Services', 'Plumbers', 'Banashankari', 'Emergency plumbing services for residential and commercial properties, pipe repairs, installation', '919877712345', 4.0, 150),
            ('Royal Plumbing And Sanitary', 'Plumbers', 'Peenya', 'Complete plumbing solutions including water heater installation, drainage, and bathroom fitting', '919888823456', 4.1, 95),
            ('VoltSafe Electricals', 'Electricians', 'Kengeri', 'Residential and commercial electrical services, wiring, panel installation, and troubleshooting', '919899934567', 4.2, 120),
            ('Bright Spark Electricians', 'Electricians', 'Yeshwanthpur', 'Certified electricians for house wiring, fan and light installation, and electrical repairs', '919811145678', 4.0, 85),
            ('SafeMove Packers And Movers', 'Packers Movers', 'Whitefield', 'Reliable packing and moving services for local and interstate household and office relocation', '919822256789', 4.3, 230),
            ('Swift Cargo Movers', 'Packers Movers', 'Hebbal', 'Professional moving services with insurance coverage, secure packing, and timely delivery', '919833367890', 4.1, 175),
            ('Ghar Ka Khana Tiffin Service', 'Tiffin Services', 'HSR Layout', 'Home-style cooked meal tiffin delivery service for lunch and dinner, weekly subscription plans', '919844478901', 4.5, 320),
            ('Annapurna Tiffin Services', 'Tiffin Services', 'Domlur', 'Vegetarian and non-vegetarian tiffin service with daily rotating menu and free delivery', '919855589012', 4.2, 210),
            ('Peace Yoga Studio', 'Yoga Centers', 'JP Nagar', 'Hatha, Vinyasa, and Ashtanga yoga classes for all levels with experienced instructors', '919866690123', 4.7, 160),
            ('Soul Space Yoga Center', 'Yoga Centers', 'Koramangala', 'Holistic yoga and meditation center offering group classes, retreats, and teacher training', '919877701234', 4.6, 200),
            ('Candid Moments Photography', 'Photographers', 'Indiranagar', 'Wedding, engagement, pre-wedding, and event photography with professional editing', '919888812345', 4.4, 140),
            ('Pixel Perfect Studios', 'Photographers', 'MG Road', 'Portrait, product, corporate event, and fashion photography studio with post-production', '919899923456', 4.3, 95),
            ('Grand Events And Weddings', 'Event Planners', 'Jayanagar', 'Full-service event planning for weddings, corporate events, birthdays, and anniversaries', '919811134567', 4.5, 280),
            ('Math Master Coaching Centre', 'Tutors', 'BTM Layout', 'Mathematics tuition for classes 8-12, competitive exam preparation, and personalized attention', '919822245678', 4.3, 110),
            ('English Pro Academy', 'Tutors', 'Marathahalli', 'Spoken English, grammar, IELTS, and communication skills training for students and professionals', '919833356789', 4.2, 90),
            ('Cool Zone AC Services', 'AC Repair', 'Sarjapur Road', 'AC installation, repair, servicing, and gas refill for all brands - split, window, and central AC', '919844467890', 4.3, 180),
            ('Chill Care Air Conditioning', 'AC Repair', 'Bannerghatta Road', 'Expert AC repair and maintenance with same-day service, AMC plans, and spare parts', '919855578901', 4.1, 130),
            ('Aaradhya Skin And Laser Clinic', 'Skin Clinics', 'Jayanagar', 'Advanced skin care clinic offering laser hair removal, acne treatment, anti-aging, and chemical peels', '919866689012', 4.5, 410),
            ('Shubham Interior Designers', 'Interior Designers', 'Indiranagar', 'Residential and commercial interior design, space planning, modular kitchen, and wardrobes', '919877790123', 4.4, 190),
            ('Sri Vinayaka Caterers', 'Caterers', 'Malleshwaram', 'South Indian and North Indian catering for weddings, events, and corporate functions', '919888801234', 4.2, 340),
            ('Navjeevan Medical Store', 'Medical Stores', 'Koramangala', 'Well-stocked pharmacy with prescription medicines, OTC drugs, surgical items, and health supplements', '919899912345', 4.3, 270),
            ('Patel Travels And Cab Service', 'Cab Services', 'Majestic', 'Local and outstation taxi service, airport transfers, corporate travel, and tour packages', '919811023456', 4.1, 520),
            ('Guru Kripa Hardware Store', 'Hardware Stores', 'Yeshwanthpur', 'Building materials, hardware tools, paints, plumbing supplies, and electrical fittings', '919822134567', 4.0, 180),
            ('National Computer Services', 'Laptop Repair', 'SP Road', 'Laptop and desktop repair, motherboard chip-level service, data recovery, and upgrades', '919833245678', 4.3, 240),
            ('Sai Kirana And General Stores', 'Kirana Stores', 'BTM Layout', 'Daily grocery, provisions, snacks, beverages, and household essentials with free home delivery', '919844356789', 4.2, 160),
            ('Priya Beauty Clinic', 'Beauty Clinics', 'Jayanagar', 'Laser hair reduction, advanced facials, microdermabrasion, acne scar treatment, and skin whitening', '919855467890', 4.6, 380),
            ('Om Sai Pest Control', 'Pest Control', 'Whitefield', 'Termite control, mosquito treatment, cockroach and rodent elimination for homes and offices', '919866578901', 4.1, 130),
        ]

        imported = 0
        for name, industry, location, desc, phone, rating, reviews in businesses:
            exists = await db.execute(select(Lead).where(Lead.phone == phone))
            if exists.scalar_one_or_none():
                print(f'  Skipping {name} (already exists)')
                continue

            lead = Lead(
                business_name=name,
                industry=industry,
                location=location,
                business_description=desc,
                phone=phone,
                source='manual_import',
                rating=rating,
                review_count=reviews,
                category_flag=LeadCategory.COLD,
                status=LeadStatus.DISCOVERED,
                social_profiles={},
            )
            db.add(lead)
            imported += 1

        if imported:
            await db.commit()

        total = await db.execute(select(func.count(Lead.id)))
        print(f'\nTotal leads in DB: {total.scalar()}')
        print(f'Imported: {imported}')

        # --- STEP 2: Analyze leads ---
        result = await db.execute(
            select(Lead).where(Lead.status == LeadStatus.DISCOVERED)
            .order_by(Lead.created_at.asc())
            .limit(50)
        )
        leads = result.scalars().all()
        print(f'\nAnalyzing {len(leads)} leads...')

        for lead in leads:
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

            print(f'  {lead.business_name}: DM={dm_score:.0f}, OP={opp_score:.0f}, Cat={category}')
        await db.commit()
        print(f'\nDone! {len(leads)} leads analyzed.')


asyncio.run(main())

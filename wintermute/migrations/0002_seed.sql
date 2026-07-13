-- Seed data for Wintermute test environment
-- Test organizations
INSERT OR IGNORE INTO organizations (id, name, slug, subscription_tier, max_users, max_leads, is_active)
VALUES
  ('org_demo_001', 'Demo Enterprises', 'demo-enterprises', 'growth', 25, 2500, 1),
  ('org_demo_002', 'Test Agency', 'test-agency', 'starter', 10, 500, 1),
  ('org_demo_003', 'Startup Labs', 'startup-labs', 'free', 5, 50, 1);

-- Test users (password: "test123" for all)
-- pbkdf2:sha256 hash of "test123" with salt
INSERT OR IGNORE INTO users (id, email, password_hash, display_name, is_active)
VALUES
  ('user_admin_01', 'admin@wintermute.ai',
   'Hd0v3rwo9ZfAxyaE95ibUeY8IHQwZFBD3l64_mUt363F_PIRcPH_JlHP4GZMa5t2',
   'Admin User', 1),
  ('user_mgr_01', 'manager@wintermute.ai',
   'kacD2vWIGUhy844zJ-SaT-xwToOXtLYNDJ7sSI4FjTxyYg7IfZ3SuhIGHC2iP-6R',
   'Test Manager', 1),
  ('user_agent_01', 'agent@wintermute.ai',
   'Suzq-RexR2ZduU3zJncuwDS53MHwFTNVBI8KVutyW30GB2uvAeAOriytIRRwDFWj',
   'Sales Agent', 1);

-- Organization memberships
INSERT OR IGNORE INTO organization_members (user_id, organization_id, role)
VALUES
  ('user_admin_01', 'org_demo_001', 'admin'),
  ('user_mgr_01', 'org_demo_001', 'member'),
  ('user_agent_01', 'org_demo_002', 'admin'),
  ('user_admin_01', 'org_demo_003', 'admin');

-- Sample leads (org_demo_001)
INSERT OR IGNORE INTO leads (id, organization_id, business_name, owner_name, phone, email, website, city, industry, rating, review_count, source, digital_maturity_score, opportunity_score, category, has_website, status)
VALUES
  ('lead_spl_01', 'org_demo_001', 'Spice Garden Restaurant', 'Rajesh Kumar', '+919876543201', 'info@spicegarden.in', 'https://spicegarden.in', 'Bangalore', 'restaurant', 4.3, 127, 'google_maps', 25, 72, 'hot', 1, 'discovered'),
  ('lead_spl_02', 'org_demo_001', 'City Dental Clinic', 'Dr. Priya Sharma', '+919876543202', 'priya@citydental.in', NULL, 'Mumbai', 'doctor', 4.7, 89, 'google_maps', 10, 85, 'hot', 0, 'discovered'),
  ('lead_spl_03', 'org_demo_001', 'TechVista Solutions', 'Amit Patel', '+919876543203', 'amit@techvista.in', 'https://techvista.in', 'Pune', 'technology', 4.1, 45, 'duckduckgo', 65, 35, 'warm', 1, 'analyzed'),
  ('lead_spl_04', 'org_demo_001', 'GreenLeaf Architects', 'Sneha Reddy', '+919876543204', 'sneha@greenleaf.in', 'https://greenleafarch.in', 'Hyderabad', 'architect', 4.5, 34, 'google_maps', 45, 52, 'warm', 1, 'analyzed'),
  ('lead_spl_05', 'org_demo_001', 'Sunrise Fitness Gym', 'Vikram Singh', '+919876543205', 'vikram@sunrisefitness.in', NULL, 'Delhi', 'fitness', 4.0, 212, 'google_maps', 15, 78, 'hot', 0, 'discovered'),
  ('lead_spl_06', 'org_demo_001', 'Pristine Salon & Spa', 'Neha Gupta', '+919876543206', NULL, NULL, 'Chennai', 'salon', 3.8, 56, 'justdial', 20, 65, 'hot', 0, 'discovered'),
  ('lead_spl_07', 'org_demo_001', 'Elite Law Chambers', 'Adv. Rohan Mehta', '+919876543207', 'rohan@elitelaw.in', 'https://elitelaw.in', 'Bangalore', 'lawyer', 4.2, 18, 'manual', 55, 40, 'warm', 1, 'approved'),
  ('lead_spl_08', 'org_demo_001', 'Coastal Realty', 'Arun Nair', '+919876543208', 'arun@coastalrealty.in', 'https://coastalrealty.in', 'Kochi', 'real_estate', 3.5, 67, 'google_maps', 70, 28, 'cold', 1, 'contacted'),
  ('lead_spl_09', 'org_demo_001', 'Bright Future Academy', 'Mrs. Anjali Desai', '+919876543209', 'anjali@brightfuture.in', NULL, 'Pune', 'education', 4.4, 103, 'csv_import', 30, 68, 'hot', 0, 'responded'),
  ('lead_spl_10', 'org_demo_001', 'Urban Grocers', 'Karthik Iyer', '+919876543210', 'karthik@urbangrocers.in', 'https://urbangrocers.in', 'Mumbai', 'ecommerce', 3.9, 145, 'manual', 50, 48, 'warm', 1, 'discovered');

-- Sample messages
INSERT OR IGNORE INTO messages (id, lead_id, organization_id, channel, direction, body, status, sent_at)
VALUES
  ('msg_spl_01', 'lead_spl_07', 'org_demo_001', 'whatsapp', 'outbound',
   'Hi Adv. Rohan, I noticed Elite Law Chambers has a great reputation. We help law firms get more clients with a modern website and online consultation booking. Interested in a quick chat?',
   'sent', datetime('now', '-2 days')),
  ('msg_spl_02', 'lead_spl_08', 'org_demo_001', 'email', 'outbound',
   'Hello Arun, we help real estate agents like Coastal Realty generate more leads with property listing websites and automated follow-ups. Would love to show you how.',
   'delivered', datetime('now', '-1 day')),
  ('msg_spl_03', 'lead_spl_09', 'org_demo_001', 'whatsapp', 'inbound',
   'This sounds interesting! Can you share more details about your pricing?',
   'replied', datetime('now', '-12 hours'));

-- Test alert
INSERT OR IGNORE INTO alerts (id, organization_id, user_id, lead_id, type, priority, title, message)
VALUES
  ('alert_spl_01', 'org_demo_001', 'user_admin_01', 'lead_spl_09', 'lead_reply', 'high',
   'Bright Future Academy replied', 'Mrs. Anjali Desai is interested in pricing. Follow up ASAP!');

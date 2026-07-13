-- Wintermute Core Schema
-- Organizations (multi-tenant)
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK(subscription_tier IN ('free','starter','growth','enterprise')),
    max_users INTEGER NOT NULL DEFAULT 5,
    max_leads INTEGER NOT NULL DEFAULT 50,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    google_id TEXT,
    avatar_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Organization membership
CREATE TABLE IF NOT EXISTS organization_members (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member','viewer')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, organization_id)
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Team membership
CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('lead','member')),
    UNIQUE(team_id, user_id)
);

-- Leads (core entity)
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    business_name TEXT NOT NULL,
    owner_name TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    industry TEXT,
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    source TEXT DEFAULT 'manual' CHECK(source IN ('manual','google_maps','justdial','duckduckgo','csv_import','api')),
    status TEXT NOT NULL DEFAULT 'discovered' CHECK(status IN ('discovered','analyzed','approved','contacted','responded','meeting_scheduled','converted','disqualified')),
    category TEXT CHECK(category IN ('hot','warm','cold')),
    digital_maturity_score REAL DEFAULT 0,
    opportunity_score REAL DEFAULT 0,
    predictive_score REAL DEFAULT 0,
    website_quality_score REAL DEFAULT 0,
    has_website INTEGER DEFAULT 0,
    has_ssl INTEGER DEFAULT 0,
    is_mobile_friendly INTEGER DEFAULT 0,
    has_contact_form INTEGER DEFAULT 0,
    has_booking_system INTEGER DEFAULT 0,
    has_analytics INTEGER DEFAULT 0,
    has_chat INTEGER DEFAULT 0,
    has_crm INTEGER DEFAULT 0,
    has_social_media INTEGER DEFAULT 0,
    has_whatsapp INTEGER DEFAULT 0,
    has_reviews INTEGER DEFAULT 0,
    has_ecommerce INTEGER DEFAULT 0,
    has_blog INTEGER DEFAULT 0,
    ai_analysis_json TEXT,
    ai_insights TEXT,
    suggested_solutions TEXT,
    estimated_project_value REAL,
    flags_json TEXT DEFAULT '[]',
    notes TEXT,
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    last_contacted_at TEXT,
    converted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Messages (outreach history)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK(channel IN ('whatsapp','email','linkedin')),
    direction TEXT NOT NULL CHECK(direction IN ('outbound','inbound')),
    subject TEXT,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','sent','delivered','read','failed','replied')),
    message_id TEXT,
    sent_at TEXT,
    delivered_at TEXT,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('lead_reply','meeting_request','pricing_inquiry','objection','positive_interest','system')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details_json TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Webhook events (inbound)
CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    source TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    processed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning','active','completed','cancelled')),
    settings_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User-Project assignments
CREATE TABLE IF NOT EXISTS user_projects (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    UNIQUE(user_id, project_id)
);

-- Indexes
CREATE INDEX idx_leads_organization ON leads(organization_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_category ON leads(category);
CREATE INDEX idx_leads_industry ON leads(industry);
CREATE INDEX idx_leads_city ON leads(city);
CREATE INDEX idx_messages_lead ON messages(lead_id);
CREATE INDEX idx_messages_org ON messages(organization_id);
CREATE INDEX idx_messages_channel ON messages(channel);
CREATE INDEX idx_alerts_org ON alerts(organization_id);
CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_unread ON alerts(is_read) WHERE is_read = 0;
CREATE INDEX idx_audit_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);

export type LeadStatus =
  | 'discovered' | 'analyzed' | 'approved' | 'contacted'
  | 'responded' | 'meeting_scheduled' | 'converted' | 'disqualified';

export type LeadCategory = 'hot' | 'warm' | 'cold';
export type MessageChannel = 'email' | 'whatsapp' | 'linkedin';
export type MessageStatus = 'draft' | 'pending' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed';
export type OrgTier = 'free' | 'starter' | 'growth' | 'enterprise';
export type MemberRole = 'admin' | 'member' | 'viewer';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  org_id: string;
  role: MemberRole;
  iat?: number;
  exp?: number;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  created_at: string;
  org_id?: string;
  role?: MemberRole;
}

export interface Lead {
  id: string;
  organization_id: string;
  team_id: string | null;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  category: LeadCategory | null;
  status: string;
  source: string | null;
  digital_maturity_score: number | null;
  opportunity_score: number | null;
  ai_analysis_json: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  organization_id: string;
  lead_id: string;
  channel: MessageChannel;
  direction: 'outbound' | 'inbound';
  subject: string | null;
  body: string;
  status: MessageStatus;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_tier: OrgTier;
  max_users: number;
  max_leads: number;
  is_active: number;
  created_at: string;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

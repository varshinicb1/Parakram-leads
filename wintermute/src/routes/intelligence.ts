import { Hono } from 'hono';
import { getDb, reqJson, now } from '../db';
import { authMiddleware } from '../middleware';
import { JwtPayload } from '../types';

interface Env { wintermute_db: any; }

const intelligence = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();
intelligence.use('*', authMiddleware);

interface AnalysisResult {
  hasSSL: boolean;
  isMobileFriendly: boolean;
  hasContactForm: boolean;
  hasContactPage: boolean;
  hasAboutPage: boolean;
  hasServicesPage: boolean;
  hasBlog: boolean;
  hasSocialLinks: boolean;
  hasAnalytics: boolean;
  hasCRM: boolean;
  hasBooking: boolean;
  hasLiveChat: boolean;
  hasReviews: boolean;
}

async function analyzeWebsite(url: string): Promise<AnalysisResult> {
  const result: AnalysisResult = {
    hasSSL: false, isMobileFriendly: false, hasContactForm: false,
    hasContactPage: false, hasAboutPage: false, hasServicesPage: false,
    hasBlog: false, hasSocialLinks: false, hasAnalytics: false,
    hasCRM: false, hasBooking: false, hasLiveChat: false, hasReviews: false,
  };
  if (!url) return result;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WintermuteBot/1.0)' },
      redirect: 'follow',
    });
    if (!res.ok) return result;

    const html = await res.text();
    if (html.length < 50) return result;
    const h = html.toLowerCase();
    result.hasSSL = url.startsWith('https://');
    result.isMobileFriendly = /<meta[^>]*name=(["'])viewport\1/i.test(html);
    result.hasContactForm = /<form[^>]*>[\s\S]{0,2000}?<\/form>/i.test(html)
      && /(contact|enquir|inquir|feedback|get in touch|send us|message)/i.test(h);
    result.hasContactPage = /\bhref\s*=\s*["'][^"']*(contact|get-in-touch|reach-us)["']/i.test(html);
    result.hasAboutPage = /\bhref\s*=\s*["'][^"']*(about|who-we-are|our-story)["']/i.test(html);
    result.hasServicesPage = /\bhref\s*=\s*["'][^"']*(service|solution|what-we-do|our-work)["']/i.test(html);
    result.hasBlog = /\bhref\s*=\s*["'][^"']*(blog|news|article|media|press)["']/i.test(html);
    result.hasSocialLinks = /(facebook\.com|twitter\.com|x\.com|instagram\.com|linkedin\.com|youtube\.com|wa\.me|whatsapp)/i.test(h);
    result.hasAnalytics = /(google-analytics|gtag|ga\.js|analytics\.js|clarity|hotjar|googletagmanager|fue\.io|plausible)/i.test(h);
    result.hasCRM = /(hubspot|salesforce|zoho\.*crm|freshsales|pipedrive|convertkit|mailchimp|activecampaign)/i.test(h);
    result.hasBooking = /(book\s*(now|online|appointment)|schedule|reservation|calendly|acuity|setmore|appointy)/i.test(h);
    result.hasLiveChat = /(tawk|livechat|intercom|intercom\.io|crisp|zendesk\s*chat|freshchat|tidio|chatway|chatwoot)/i.test(h);
    result.hasReviews = /(testimonial|client\s*feedback|what\s*our.*say|review|rating)/i.test(h);
    return result;
  } catch {
    return result;
  }
}

async function scoreLead(lead: any) {
  const a = await analyzeWebsite(lead.website);
  const indicators = [
    { name: 'SSL/HTTPS', present: a.hasSSL, weight: 10 },
    { name: 'Mobile Friendly', present: a.isMobileFriendly, weight: 15 },
    { name: 'Lead Capture Form', present: a.hasContactForm, weight: 15 },
    { name: 'Contact Page', present: a.hasContactPage, weight: 10 },
    { name: 'About Page', present: a.hasAboutPage, weight: 5 },
    { name: 'Services Page', present: a.hasServicesPage, weight: 10 },
    { name: 'Blog/Content', present: a.hasBlog, weight: 8 },
    { name: 'Social Media Links', present: a.hasSocialLinks, weight: 8 },
    { name: 'Google Analytics', present: a.hasAnalytics, weight: 7 },
    { name: 'CRM Integration', present: a.hasCRM, weight: 5 },
    { name: 'Booking System', present: a.hasBooking, weight: 5 },
    { name: 'Live Chat', present: a.hasLiveChat, weight: 5 },
    { name: 'Reviews/Testimonials', present: a.hasReviews, weight: 2 },
  ];

  const totalScore = indicators.reduce((sum: number, i: any) => sum + (i.present ? i.weight : 0), 0);
  const maxScore = indicators.reduce((sum: number, i: any) => sum + i.weight, 0);
  const digitalMaturity = Math.round((totalScore / maxScore) * 100);
  const gapScore = indicators.filter((i: any) => !i.present).reduce((sum: number, i: any) => sum + i.weight, 0);
  const opportunityScore = Math.min(100, Math.round(100 - digitalMaturity + (gapScore / maxScore) * 50));

  let category = 'warm';
  if (digitalMaturity >= 70) category = 'cold';
  else if (opportunityScore >= 60) category = 'hot';

  const analysis = {
    indicators,
    strengths: indicators.filter((i: any) => i.present).map((i: any) => i.name),
    gaps: indicators.filter((i: any) => !i.present).map((i: any) => i.name),
    estimated_project_value: digitalMaturity < 50
      ? Math.round(25000 + Math.random() * 55000)
      : Math.round(8000 + Math.random() * 12000),
  };

  return { digitalMaturity, opportunityScore, category, analysis };
}

intelligence.post('/score', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const body = await reqJson(c);
  const { lead_id } = body;

  if (!lead_id) return c.json({ error: 'lead_id is required' }, 400);

  const lead = await db.prepare(
    'SELECT * FROM leads WHERE id = ? AND organization_id = ?'
  ).bind(lead_id, user.org_id).first<any>();

  if (!lead) return c.json({ error: 'Lead not found' }, 404);

  const { digitalMaturity, opportunityScore, category, analysis } = await scoreLead(lead);
  const ts = now();

  await db.prepare(
    `UPDATE leads SET digital_maturity_score = ?, opportunity_score = ?, category = ?, status = 'analyzed', ai_analysis_json = ?, updated_at = ? WHERE id = ?`
  ).bind(digitalMaturity, opportunityScore, category, JSON.stringify(analysis), ts, lead_id).run();

  return c.json({
    lead_id: lead.id,
    business_name: lead.business_name,
    digital_maturity_score: digitalMaturity,
    opportunity_score: opportunityScore,
    category,
    ...analysis,
  });
});

intelligence.post('/batch-score', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const body = await reqJson(c);
  const { lead_ids } = body;

  if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
    return c.json({ error: 'lead_ids array is required' }, 400);
  }

  const leads = [];
  for (const lead_id of lead_ids.slice(0, 50)) {
    const lead = await db.prepare(
      'SELECT * FROM leads WHERE id = ? AND organization_id = ?'
    ).bind(lead_id, user.org_id).first<any>();
    if (lead) leads.push(lead);
  }

  const results = await Promise.all(leads.map(async (lead) => {
    const { digitalMaturity, opportunityScore, category, analysis } = await scoreLead(lead);
    const ts = now();

    await db.prepare(
      `UPDATE leads SET digital_maturity_score = ?, opportunity_score = ?, category = ?, status = 'analyzed', ai_analysis_json = ?, updated_at = ? WHERE id = ?`
    ).bind(digitalMaturity, opportunityScore, category, JSON.stringify(analysis), ts, lead.id).run();

    return {
      lead_id: lead.id,
      business_name: lead.business_name,
      digital_maturity_score: digitalMaturity,
      opportunity_score: opportunityScore,
      category,
    };
  }));

  return c.json({ scored: results.length, results });
});

export default intelligence;

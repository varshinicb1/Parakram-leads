interface ScorecardLead {
  id: string;
  business_name: string;
  city?: string | null;
  category?: string | null;
  digital_maturity_score?: number | null;
  opportunity_score?: number | null;
  status?: string | null;
}

interface ScorecardAnalysis {
  industry?: string;
  business_summary?: string;
  gaps?: string[];
  recommended_services?: string[];
  estimated_value?: number | string | null;
  pain_points?: string[];
}

function grade(score: number | null | undefined): string {
  const s = score ?? 0;
  if (s >= 85) return 'A';
  if (s >= 70) return 'B';
  if (s >= 55) return 'C';
  if (s >= 40) return 'D';
  return 'F';
}

function catClass(category: string | null | undefined): string {
  const c = (category || '').toUpperCase();
  if (c === 'HOT') return 'hot';
  if (c === 'WARM') return 'warm';
  return 'cold';
}

function fmtValue(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^\d.]/g, '')) : v;
  if (isNaN(n as number) || n === 0) return '—';
  return '₹' + Math.round(n as number).toLocaleString('en-IN');
}

export function renderScorecardHtml(
  lead: ScorecardLead,
  analysis: ScorecardAnalysis | null,
  origin: string
): string {
  const name = lead.business_name || 'Your Business';
  const city = lead.city ? ` · ${lead.city}` : '';
  const cat = catClass(lead.category);
  const maturity = Math.round(lead.digital_maturity_score ?? 0);
  const opportunity = Math.round(lead.opportunity_score ?? 0);
  const g = grade(maturity);
  const value = fmtValue(analysis?.estimated_value);
  const gaps = (analysis?.gaps || []).slice(0, 5);
  const services = (analysis?.recommended_services || []).slice(0, 4);
  const ogUrl = `${origin}/scorecard/${lead.id}/og`;
  const pageUrl = `${origin}/scorecard/${lead.id}`;

  const gapsHtml = gaps.length
    ? gaps.map((x) => `<li>${escape(x)}</li>`).join('')
    : '<li>No major gaps detected</li>';

  const servicesHtml = services.length
    ? services.map((x) => `<span class="chip">${escape(x)}</span>`).join('')
    : '';

  const shareText = encodeURIComponent(
    `${name} scored ${g} (${maturity}/100) on their digital presence. See the free scorecard: ${pageUrl}`
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(name)} — Digital Scorecard | Wintermute</title>
<meta name="description" content="${escape(name)}${city}: Digital Maturity ${maturity}/100 (Grade ${g}), Opportunity ${opportunity}/100. Free AI scorecard by Wintermute." />
<meta property="og:type" content="website" />
<meta property="og:title" content="${escape(name)} — Digital Scorecard (Grade ${g})" />
<meta property="og:description" content="Digital Maturity ${maturity}/100 · Opportunity ${opportunity}/100 · Est. value ${value}" />
<meta property="og:image" content="${escape(ogUrl)}" />
<meta property="og:url" content="${escape(pageUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escape(name)} — Digital Scorecard (Grade ${g})" />
<meta name="twitter:description" content="Digital Maturity ${maturity}/100 · Opportunity ${opportunity}/100" />
<meta name="twitter:image" content="${escape(ogUrl)}" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: radial-gradient(1200px 600px at 70% -10%, #1a1730 0%, #0a0a0f 55%);
    color: #f5f5f7; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 24px;
  }
  .card {
    width: 100%; max-width: 720px; background: rgba(20,20,28,0.92);
    border: 1px solid rgba(212,175,55,0.25); border-radius: 20px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.5); overflow: hidden;
  }
  .top { padding: 28px 32px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .brand { display: flex; align-items: center; gap: 10px; font-size: 13px; letter-spacing: 2px; color: #d4af37; text-transform: uppercase; }
  .brand .dot { width: 8px; height: 8px; border-radius: 50%; background: #d4af37; box-shadow: 0 0 12px #d4af37; }
  h1 { font-size: 30px; margin: 14px 0 4px; font-weight: 700; }
  .sub { color: #9a9aa8; font-size: 14px; }
  .badge { display: inline-block; margin-top: 12px; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .badge.hot { background: rgba(239,68,68,0.15); color: #ff6b6b; border: 1px solid rgba(239,68,68,0.4); }
  .badge.warm { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.4); }
  .badge.cold { background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.4); }
  .scores { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: rgba(255,255,255,0.06); }
  .score { background: #14141c; padding: 24px 28px; text-align: center; }
  .score .num { font-size: 52px; font-weight: 800; line-height: 1; background: linear-gradient(180deg,#fff,#d4af37); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .score .lbl { margin-top: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #8a8a98; }
  .score .grade { margin-top: 6px; font-size: 14px; color: #d4af37; font-weight: 700; }
  .body { padding: 24px 32px 8px; }
  .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #8a8a98; margin: 18px 0 10px; }
  ul.gaps { list-style: none; }
  ul.gaps li { padding: 8px 0 8px 22px; position: relative; color: #d6d6e0; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.04); }
  ul.gaps li:before { content: "✕"; position: absolute; left: 0; color: #ff6b6b; font-weight: 700; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { background: rgba(212,175,55,0.12); color: #e8d28a; border: 1px solid rgba(212,175,55,0.3); padding: 6px 12px; border-radius: 999px; font-size: 13px; }
  .value { font-size: 26px; font-weight: 800; color: #fff; }
  .cta { padding: 24px 32px 32px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
  .btn { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg,#d4af37,#b8941f); color: #14141c; font-weight: 700; text-decoration: none; padding: 12px 22px; border-radius: 12px; font-size: 15px; }
  .share { color: #9a9aa8; text-decoration: none; font-size: 14px; }
  .footer { padding: 16px 32px; border-top: 1px solid rgba(255,255,255,0.06); color: #6a6a78; font-size: 12px; }
  a { color: inherit; }
</style>
</head>
<body>
  <div class="card">
    <div class="top">
      <div class="brand"><span class="dot"></span> Wintermute · AI Lead Intelligence</div>
      <h1>${escape(name)}</h1>
      <div class="sub">${escape((lead.category || 'Business') + city)}</div>
      <span class="badge ${cat}">${escape((lead.category || lead.status || 'COLD'))}</span>
    </div>
    <div class="scores">
      <div class="score">
        <div class="num">${maturity}</div>
        <div class="lbl">Digital Maturity</div>
        <div class="grade">Grade ${g}</div>
      </div>
      <div class="score">
        <div class="num">${opportunity}</div>
        <div class="lbl">Opportunity</div>
        <div class="grade">${value !== '—' ? 'Est. ' + value : 'High potential'}</div>
      </div>
    </div>
    <div class="body">
      <div class="section-title">Top Digital Gaps</div>
      <ul class="gaps">${gapsHtml}</ul>
      ${servicesHtml ? `<div class="section-title">Recommended Services</div><div class="chips">${servicesHtml}</div>` : ''}
    </div>
    <div class="cta">
      <a class="btn" href="https://getparakram.in">Get your free scorecard →</a>
      <a class="share" href="https://twitter.com/intent/tweet?text=${shareText}">Share on X</a>
    </div>
    <div class="footer">Generated by Wintermute · AI-powered digital presence analysis</div>
  </div>
</body>
</html>`;
}

export function renderScorecardOgHtml(lead: ScorecardLead, analysis: ScorecardAnalysis | null): string {
  const name = (lead.business_name || 'Your Business').slice(0, 42);
  const maturity = Math.round(lead.digital_maturity_score ?? 0);
  const opportunity = Math.round(lead.opportunity_score ?? 0);
  const g = grade(maturity);
  const value = fmtValue(analysis?.estimated_value);
  const cat = catClass(lead.category);
  const catColor = cat === 'hot' ? '#ff6b6b' : cat === 'warm' ? '#fbbf24' : '#60a5fa';
  const statusLabel = (lead.category || lead.status || 'COLD').toUpperCase();

  return `<div style="display:flex;flex-direction:column;width:1200;height:630;background:#15131f;color:#f5f5f7;font-family:sans-serif;padding-top:64;padding-bottom:64;padding-left:64;padding-right:64;justify-content:space-between;">
<div style="display:flex;align-items:center;">
<div style="width:14;height:14;border-radius:7;background:#d4af37;margin-right:14;"></div>
<div style="font-size:24;letter-spacing:3;color:#d4af37;text-transform:uppercase;">Wintermute</div>
</div>
<div style="display:flex;align-items:center;">
<div style="display:flex;flex-direction:column;margin-right:40;">
<div style="font-size:62;font-weight:800;line-height:1.05;max-width:640;">${escape(name)}</div>
<div style="display:flex;align-items:center;margin-top:18;">
<div style="background:${catColor}22;color:${catColor};padding-top:8;padding-bottom:8;padding-left:18;padding-right:18;border-radius:999;font-size:22;font-weight:700;margin-right:16;">${statusLabel}</div>
<div style="color:#9a9aa8;font-size:22;">${escape(lead.category || 'Business')}</div>
</div>
</div>
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;background:#14141c;border-radius:24;padding-top:36;padding-bottom:36;padding-left:44;padding-right:44;">
<div style="font-size:96;font-weight:800;line-height:1;color:#d4af37;">${maturity}</div>
<div style="font-size:20;color:#8a8aa8;letter-spacing:2;text-transform:uppercase;margin-top:8;">Maturity Grade ${g}</div>
<div style="font-size:22;color:#d4af37;font-weight:700;margin-top:14;">Opp ${opportunity}/100</div>
</div>
</div>
<div style="display:flex;justify-content:space-between;align-items:flex-end;">
<div style="font-size:24;color:#fff;">Est. project value: <span style="color:#d4af37;font-weight:800;">${value}</span></div>
<div style="font-size:20;color:#6a6a78;">Free AI Digital Scorecard</div>
</div>
</div>`;
}

function escape(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

'use client';

import { Zap, TrendingUp, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface IntelligenceBadgeProps {
  qualityScore: number;
  conversionProb: number;
  buyingUrgency: number;
  optimalChannel?: string | null;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-zinc-500';
}

function scoreBg(score: number): string {
  if (score >= 70) return 'bg-emerald-400/10 border-emerald-400/20';
  if (score >= 40) return 'bg-amber-400/10 border-amber-400/20';
  return 'bg-zinc-800 border-zinc-700';
}

function qualityLabel(score: number): string {
  if (score >= 80) return 'Premium';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  if (score >= 20) return 'Low';
  return 'Minimal';
}

function urgencyLabel(score: number): string {
  if (score >= 70) return 'Contact Now';
  if (score >= 40) return 'This Week';
  return 'Monitor';
}

function channelIcon(channel?: string | null) {
  switch (channel) {
    case 'whatsapp': return '💬';
    case 'email': return '📧';
    case 'linkedin': return '🔗';
    default: return '📨';
  }
}

export default function IntelligenceBadge({
  qualityScore,
  conversionProb,
  buyingUrgency,
  optimalChannel,
}: IntelligenceBadgeProps) {
  const quality = qualityLabel(qualityScore);
  const urgency = urgencyLabel(buyingUrgency);
  const color = scoreColor(qualityScore);
  const bg = scoreBg(qualityScore);

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border ${bg}`}>
      <div className="flex items-center gap-1.5">
        <Zap className={`w-3.5 h-3.5 ${color}`} />
        <span className={`text-xs font-semibold ${color}`}>{quality}</span>
      </div>
      <span className="text-[10px] text-zinc-500">|</span>
      <div className="flex items-center gap-1">
        <TrendingUp className="w-3 h-3 text-zinc-500" />
        <span className="text-[11px] text-zinc-400">{Math.round(conversionProb * 100)}%</span>
      </div>
      {buyingUrgency >= 50 && (
        <>
          <span className="text-[10px] text-zinc-500">|</span>
          <div className="flex items-center gap-1">
            <AlertTriangle className={`w-3 h-3 ${buyingUrgency >= 70 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
            <span className={`text-[10px] font-medium ${buyingUrgency >= 70 ? 'text-red-400' : 'text-amber-400'}`}>{urgency}</span>
          </div>
        </>
      )}
      {optimalChannel && (
        <>
          <span className="text-[10px] text-zinc-500">|</span>
          <span className="text-[11px]" title={`Best channel: ${optimalChannel}`}>{channelIcon(optimalChannel)}</span>
        </>
      )}
    </div>
  );
}

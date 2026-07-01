interface Stats {
  m: string; d: string; u: string; p: number;
  bak: string; t: boolean; s: boolean; neb: boolean;
  c: number; l: string;
}

interface ServicesTableProps {
  stats: Stats | null;
  onToggle: (svc: string) => void;
}

const services = [
  { key: 'ssh', label: 'OpenSSH Server' },
  { key: 'tun', label: 'Cloudflare Tunnel' },
  { key: 'neb', label: 'Nebula Mesh VPN' },
  { key: 'caddy', label: 'Caddy Reverse Proxy' },
  { key: 'restic', label: 'Backups (restic)' },
  { key: 'leads', label: 'Leads Backend' },
];

export function ServicesTable({ stats, onToggle }: ServicesTableProps) {
  const getStatus = (key: string) => {
    if (!stats) return { on: false, text: 'Scanning...' };
    switch (key) {
      case 'ssh': return stats.s ? { on: true, text: 'Running' } : { on: false, text: 'Stopped' };
      case 'tun': return stats.t ? { on: true, text: 'Connected' } : { on: false, text: 'Disconnected' };
      case 'neb': return stats.neb ? { on: true, text: 'Connected' } : { on: false, text: 'Stopped' };
      case 'caddy': return { on: false, text: 'Checking...' };
      case 'restic': return stats.bak && stats.bak !== 'na'
        ? { on: true, text: `Last: ${stats.bak}` }
        : { on: false, text: 'Not configured' };
      case 'leads':
        if (stats.l === 'running') return { on: true, text: 'Running' };
        if (stats.l === 'starting') return { on: false, text: 'Starting...' };
        if (stats.l === 'not_installed') return { on: false, text: 'Not Installed' };
        return { on: false, text: stats.l };
      default: return { on: false, text: 'Unknown' };
    }
  };

  return (
    <div className="bg-[#0d0d0e] border border-[rgba(255,255,255,0.06)] rounded-lg overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)] shrink-0">
        <h3 className="text-[11px] text-[#5a5a5a] uppercase tracking-widest">Services</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-[10px] text-[#5a5a5a] uppercase tracking-wider">
              <th className="text-left px-4 py-2 font-normal">Service</th>
              <th className="text-left px-4 py-2 font-normal">Status</th>
              <th className="text-left px-4 py-2 font-normal">Action</th>
            </tr>
          </thead>
          <tbody>
            {services.map(({ key, label }) => {
              const st = getStatus(key);
              return (
                <tr key={key} className="border-t border-[rgba(255,255,255,0.06)]">
                  <td className="px-4 py-2.5">{label}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${st.on ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]'}`} />
                    {st.text}
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => onToggle(key)}
                      className="px-2.5 py-1 rounded text-[10px] border border-[rgba(255,255,255,0.06)] bg-[#141416] text-[#8a8a8a] hover:border-[#c9a96e] hover:text-[#e8e6e3] transition-all cursor-pointer">
                      {key === 'restic' ? 'Run Now' : 'Toggle'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

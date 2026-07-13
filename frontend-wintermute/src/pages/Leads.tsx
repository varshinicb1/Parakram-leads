import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { Search, Plus, Trash2, TrendingUp, Mail, MessageSquare, Globe, Loader2 } from 'lucide-react';

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ owner_name: '', business_name: '', phone: '', email: '', website: '', city: '' });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), per_page: '10' };
      if (search) params.search = search;
      const res = await api.leads.list(params);
      setLeads(res.data || []);
      setTotal(res.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const createLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.leads.create(form);
      setShowForm(false);
      setForm({ owner_name: '', business_name: '', phone: '', email: '', website: '', city: '' });
      fetchLeads();
    } catch (err: any) { alert(err.message); }
  };

  const deleteLead = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    try { await api.leads.delete(id); fetchLeads(); } catch {}
  };

  const analyzeLead = async (id: string) => {
    setActionLoading(id);
    try { await api.leads.analyze(id); fetchLeads(); } catch (err: any) { alert(err.message); } finally { setActionLoading(null); }
  };

  const generateOutreach = async (id: string, channel: string) => {
    setActionLoading(id + channel);
    try { const r = await api.leads.generateOutreach(id, channel); alert(`Generated ${r.messages} message(s)`); } catch (err: any) { alert(err.message); } finally { setActionLoading(null); }
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition">
          <Plus size={18} /> Add Lead
        </button>
      </div>

      {showForm && (
        <form onSubmit={createLead} className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input placeholder="Owner Name *" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <input placeholder="Business Name *" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Website" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">Cancel</button>
          </div>
        </form>
      )}

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" placeholder="Search leads..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
      ) : (
        <>
          <div className="space-y-3">
            {leads.map(lead => (
              <div key={lead.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{lead.business_name}</h3>
                      {lead.category && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          lead.category === 'hot' ? 'bg-red-900/50 text-red-400' :
                          lead.category === 'warm' ? 'bg-yellow-900/50 text-yellow-400' :
                          'bg-green-900/50 text-green-400'
                        }`}>{lead.category.toUpperCase()}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize`}>{lead.status}</span>
                    </div>
                    <p className="text-sm text-gray-400">{lead.owner_name}{lead.city ? ` • ${lead.city}` : ''}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                      {lead.phone && <span>{lead.phone}</span>}
                      {lead.email && <span>{lead.email}</span>}
                      {lead.website && <span>{lead.website}</span>}
                      {lead.digital_maturity_score != null && <span>Digital: {lead.digital_maturity_score}/100</span>}
                      {lead.opportunity_score != null && <span>Opp: {lead.opportunity_score}/100</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4 shrink-0">
                    <button onClick={() => analyzeLead(lead.id)} disabled={actionLoading === lead.id}
                      title="Analyze" className="p-2 hover:bg-gray-800 rounded-lg transition disabled:opacity-50">
                      {actionLoading === lead.id ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                    </button>
                    <button onClick={() => generateOutreach(lead.id, 'email')} disabled={actionLoading === lead.id + 'email'}
                      title="Generate Email" className="p-2 hover:bg-gray-800 rounded-lg transition disabled:opacity-50">
                      <Mail size={16} />
                    </button>
                    <button onClick={() => generateOutreach(lead.id, 'whatsapp')} disabled={actionLoading === lead.id + 'whatsapp'}
                      title="Generate WhatsApp" className="p-2 hover:bg-gray-800 rounded-lg transition disabled:opacity-50">
                      <MessageSquare size={16} />
                    </button>
                    <button onClick={() => generateOutreach(lead.id, 'linkedin')} disabled={actionLoading === lead.id + 'linkedin'}
                      title="Generate LinkedIn" className="p-2 hover:bg-gray-800 rounded-lg transition disabled:opacity-50">
                      <Globe size={16} />
                    </button>
                    <button onClick={() => deleteLead(lead.id)} title="Delete" className="p-2 hover:bg-red-900/50 text-red-400 rounded-lg transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {leads.length === 0 && <p className="text-center text-gray-500 py-8">No leads found</p>}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-700 transition">Previous</button>
              <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-700 transition">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

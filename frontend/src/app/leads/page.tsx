'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Search, Filter, ChevronDown, Plus, ExternalLink, Zap,
} from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [hot, setHot] = useState(0);
  const [warm, setWarm] = useState(0);
  const [cold, setCold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 20 };
      if (category) params.category = category;
      if (search) params.search = search;
      const res = await api.leads.list(params);
      setLeads(res.leads);
      setTotal(res.total);
      setHot(res.hot);
      setWarm(res.warm);
      setCold(res.cold);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, category]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const getCategoryClass = (cat: string) => {
    switch (cat) {
      case 'hot': return 'bg-red-100 text-red-700';
      case 'warm': return 'bg-amber-100 text-amber-700';
      case 'cold': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {total} total leads | {hot} hot | {warm} warm | {cold} cold
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sigma-500 outline-none w-64"
            />
          </form>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sigma-500 outline-none"
          >
            <option value="">All Categories</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-4 font-medium text-gray-600">Business</th>
                <th className="text-left px-6 py-4 font-medium text-gray-600">Industry</th>
                <th className="text-left px-6 py-4 font-medium text-gray-600">Location</th>
                <th className="text-center px-6 py-4 font-medium text-gray-600">DM Score</th>
                <th className="text-center px-6 py-4 font-medium text-gray-600">Opp Score</th>
                <th className="text-center px-6 py-4 font-medium text-gray-600">Category</th>
                <th className="text-center px-6 py-4 font-medium text-gray-600">Status</th>
                <th className="text-center px-6 py-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sigma-600 mx-auto" />
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No leads found. Add your first lead to get started.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-800">{lead.business_name}</p>
                        {lead.owner_name && (
                          <p className="text-xs text-gray-400">{lead.owner_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{lead.industry || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.location || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono font-medium">{lead.digital_maturity_score}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono font-medium">{lead.opportunity_score}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${getCategoryClass(lead.category_flag)}`}>
                        {lead.category_flag}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs text-gray-500 capitalize">{lead.status}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        className="p-2 text-sigma-600 hover:bg-sigma-50 rounded-lg"
                        onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">Page {page}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedLead(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedLead.business_name}</h2>
                  {selectedLead.owner_name && (
                    <p className="text-gray-500">{selectedLead.owner_name}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${getCategoryClass(selectedLead.category_flag)}`}>
                  {selectedLead.category_flag}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase">Digital Maturity</p>
                  <p className="text-2xl font-bold">{selectedLead.digital_maturity_score}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Opportunity Score</p>
                  <p className="text-2xl font-bold">{selectedLead.opportunity_score}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Industry</p>
                  <p className="font-medium">{selectedLead.industry || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Location</p>
                  <p className="font-medium">{selectedLead.location || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Phone</p>
                  <p className="font-medium">{selectedLead.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Email</p>
                  <p className="font-medium">{selectedLead.email || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Website</p>
                  <p className="font-medium truncate">{selectedLead.website_url || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Rating</p>
                  <p className="font-medium">{selectedLead.rating} ({selectedLead.review_count} reviews)</p>
                </div>
              </div>

              {selectedLead.estimated_needs && selectedLead.estimated_needs.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Estimated Needs</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedLead.estimated_needs.map((need: string) => (
                      <span key={need} className="px-3 py-1 bg-sigma-50 text-sigma-700 rounded-full text-xs font-medium">
                        {need}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedLead.suggested_solution && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Suggested Solution</p>
                  <p className="text-sm text-gray-700">{selectedLead.suggested_solution}</p>
                </div>
              )}

              {selectedLead.estimated_project_value > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-sm text-green-600">Estimated Project Value</p>
                  <p className="text-2xl font-bold text-green-700">₹{selectedLead.estimated_project_value.toLocaleString()}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-6 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api, getOrgId, setOrgId } from '@/lib/api';
import {
  Building2, Plus, Users, Crown, Shield, Eye, UserPlus,
  Trash2, X, Check, ChevronDown, SwitchCamera, Loader2,
} from 'lucide-react';

const TIERS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  starter: 'bg-blue-100 text-blue-700',
  growth: 'bg-purple-100 text-purple-700',
  business: 'bg-amber-100 text-amber-700',
  enterprise: 'bg-emerald-100 text-emerald-700',
};

const ROLES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700', icon: Crown },
  member: { label: 'Member', color: 'bg-blue-100 text-blue-700', icon: Shield },
  viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-600', icon: Eye },
};

const RoleBadge = ({ role }: { role: string }) => {
  const r = ROLES[role] || ROLES.member;
  const Icon = r.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${r.color}`}>
      <Icon className="w-3 h-3" />{r.label}
    </span>
  );
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [members, setMembers] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(getOrgId());
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Invite form per org
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Remove confirm
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.organizations.list();
      setOrgs(Array.isArray(data) ? data : []);
      // Fetch members for each org in parallel
      const memberMap: Record<string, any[]> = {};
      await Promise.all(
        (data || []).map(async (org: any) => {
          try {
            memberMap[org.id] = await api.organizations.listMembers(org.id);
          } catch { memberMap[org.id] = []; }
        })
      );
      setMembers(memberMap);
    } catch {
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const handleCreate = async () => {
    if (!newOrgName.trim() || !newOrgSlug.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      await api.organizations.create({ name: newOrgName.trim(), slug: newOrgSlug.trim() });
      setShowCreateModal(false);
      setNewOrgName('');
      setNewOrgSlug('');
      fetchOrgs();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  const handleSwitch = async (orgId: string) => {
    try {
      await api.organizations.switch(orgId);
      setOrgId(orgId);
      setActiveOrgId(orgId);
      window.location.reload();
    } catch {
      // ignore
    }
  };

  const handleInvite = async (orgId: string) => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError('');
    try {
      await api.organizations.inviteMember(orgId, { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      setInviteRole('member');
      const updated = await api.organizations.listMembers(orgId);
      setMembers((prev) => ({ ...prev, [orgId]: updated }));
    } catch (err: any) {
      setInviteError(err.message || 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (orgId: string, userId: string) => {
    try {
      await api.organizations.removeMember(orgId, userId);
      const updated = await api.organizations.listMembers(orgId);
      setMembers((prev) => ({ ...prev, [orgId]: updated }));
      setConfirmRemove(null);
    } catch {
      // ignore
    }
  };

  const handleRoleChange = async (orgId: string, userId: string, newRole: string) => {
    try {
      await api.organizations.updateMemberRole(orgId, userId, newRole);
      const updated = await api.organizations.listMembers(orgId);
      setMembers((prev) => ({ ...prev, [orgId]: updated }));
    } catch {
      // ignore
    }
  };

  const slugFromName = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sigma-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{orgs.length} organization{orgs.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sigma-600 text-white rounded-lg text-sm font-medium hover:bg-sigma-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Organization
        </button>
      </div>

      {/* Org cards */}
      <div className="space-y-4">
        {orgs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">You are not a member of any organization yet.</p>
          </div>
        ) : (
          orgs.map((org) => {
            const isActive = activeOrgId === org.id;
            const isExpanded = expandedOrg === org.id;
            const orgMembers = members[org.id] || [];
            return (
              <div
                key={org.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                  isActive ? 'border-sigma-400 ring-2 ring-sigma-100' : 'border-gray-100'
                }`}
              >
                {/* Card header */}
                <div
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedOrg(isExpanded ? null : org.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isActive ? 'bg-sigma-100' : 'bg-gray-100'}`}>
                      <Building2 className={`w-6 h-6 ${isActive ? 'text-sigma-600' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{org.name}</h3>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sigma-100 text-sigma-700">Active</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Users className="w-3 h-3" />{orgMembers.length} member{orgMembers.length !== 1 ? 's' : ''}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${TIERS[org.subscription_tier] || TIERS.free}`}>
                          {org.subscription_tier}
                        </span>
                        <span className="text-xs text-gray-400">/{org.slug}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSwitch(org.id); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <SwitchCamera className="w-3.5 h-3.5" />
                        Switch
                      </button>
                    )}
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Expanded members */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-700 text-sm">Members</h4>
                      </div>

                      {orgMembers.length === 0 ? (
                        <p className="text-sm text-gray-400">No members found.</p>
                      ) : (
                        <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                          {orgMembers.map((m: any) => (
                            <div key={m.user_id} className="flex items-center justify-between px-4 py-3 bg-gray-50 last:bg-white even:bg-white">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-sigma-100 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-sigma-600">
                                    {(m.full_name || m.email).charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{m.full_name || 'Unnamed'}</p>
                                  <p className="text-xs text-gray-400">{m.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400 hidden sm:block">
                                  Joined {new Date(m.joined_at).toLocaleDateString()}
                                </span>
                                {/* Role dropdown (admin only actions) */}
                                <select
                                  value={m.role}
                                  onChange={(e) => handleRoleChange(org.id, m.user_id, e.target.value)}
                                  className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-sigma-500 outline-none"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="member">Member</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                                {confirmRemove === m.user_id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleRemoveMember(org.id, m.user_id)}
                                      className="p-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600"
                                      title="Confirm"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => setConfirmRemove(null)}
                                      className="p-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50"
                                      title="Cancel"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmRemove(m.user_id)}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    title="Remove member"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Invite form */}
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <h5 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                          <UserPlus className="w-4 h-4" /> Invite Member
                        </h5>
                        {inviteError && (
                          <p className="text-xs text-red-500">{inviteError}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sigma-500 outline-none"
                          />
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sigma-500 outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            onClick={() => handleInvite(org.id)}
                            disabled={inviting || !inviteEmail.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-sigma-600 text-white rounded-lg text-sm font-medium hover:bg-sigma-700 disabled:opacity-50 transition-colors"
                          >
                            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            Invite
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Org Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Create Organization</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 rounded-lg text-sm text-red-600">{createError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Organization Name</label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => {
                    setNewOrgName(e.target.value);
                    setNewOrgSlug(slugFromName(e.target.value));
                  }}
                  placeholder="My Company"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sigma-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Slug (URL identifier)</label>
                <input
                  type="text"
                  value={newOrgSlug}
                  onChange={(e) => setNewOrgSlug(e.target.value)}
                  placeholder="my-company"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sigma-500 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newOrgName.trim() || !newOrgSlug.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-sigma-600 text-white rounded-lg text-sm font-medium hover:bg-sigma-700 disabled:opacity-50 transition-colors"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

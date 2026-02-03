'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Plus,
  Search,
  MoreVertical,
  Mail,
  Shield,
  AlertTriangle,
  UserCog,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { usePermissions } from '@/contexts/auth-context';
import { formatRelativeDate } from '@/lib/utils';
import type { Member, MemberRole } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';

// Extended member type with user info
interface MemberWithUser extends Member {
  displayName: string;
  email: string;
  photoUrl?: string;
}

// Mock members data
const mockMembers: MemberWithUser[] = [
  {
    id: '1',
    tenantId: 'tenant1',
    userId: 'user1',
    role: 'owner',
    displayName: 'Anna Lindqvist',
    email: 'anna@example.com',
    title: 'Chairman of the Board',
    isActive: true,
    conflicts: [{
      id: 'c1',
      entityName: 'TechCorp AB',
      entityType: 'company',
      relationship: 'Board member',
      declaredAt: Timestamp.fromDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)),
      isActive: true,
    }],
    permissions: { canCreateMeetings: true, canManageMembers: true, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: true },
    joinedAt: Timestamp.fromDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)),
  },
  {
    id: '2',
    tenantId: 'tenant1',
    userId: 'user2',
    role: 'secretary',
    displayName: 'Erik Johansson',
    email: 'erik@example.com',
    title: 'Board Secretary',
    isActive: true,
    conflicts: [],
    permissions: { canCreateMeetings: true, canManageMembers: false, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: true },
    joinedAt: Timestamp.fromDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)),
  },
  {
    id: '3',
    tenantId: 'tenant1',
    userId: 'user3',
    role: 'director',
    displayName: 'Maria Svensson',
    email: 'maria@example.com',
    title: 'Board Member',
    isActive: true,
    conflicts: [{
      id: 'c2',
      entityName: 'Svensson Invest AB',
      entityType: 'company',
      relationship: 'Owner',
      declaredAt: Timestamp.fromDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
      isActive: true,
    }],
    permissions: { canCreateMeetings: false, canManageMembers: false, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: false },
    joinedAt: Timestamp.fromDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
  },
  {
    id: '4',
    tenantId: 'tenant1',
    userId: 'user4',
    role: 'director',
    displayName: 'Karl Nilsson',
    email: 'karl@example.com',
    title: 'External Director',
    isActive: true,
    conflicts: [],
    permissions: { canCreateMeetings: false, canManageMembers: false, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: false },
    joinedAt: Timestamp.fromDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)),
  },
  {
    id: '5',
    tenantId: 'tenant1',
    userId: 'user5',
    role: 'observer',
    displayName: 'Lisa Andersson',
    email: 'lisa@example.com',
    title: 'Observer',
    isActive: true,
    conflicts: [],
    permissions: { canCreateMeetings: false, canManageMembers: false, canAccessFinancials: false, canSignDocuments: false, canManageDocuments: false },
    joinedAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
  },
];

const roleLabels: Record<MemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  chair: 'Chair',
  secretary: 'Secretary',
  director: 'Director',
  observer: 'Observer',
  auditor: 'Auditor',
};

const roleColors: Record<MemberRole, string> = {
  owner: 'bg-purple-500/10 text-purple-400',
  admin: 'bg-amber-500/10 text-amber-400',
  chair: 'bg-blue-500/10 text-blue-400',
  secretary: 'bg-emerald-500/10 text-emerald-400',
  director: 'bg-white/10 text-white/70',
  observer: 'bg-white/5 text-white/50',
  auditor: 'bg-cyan-500/10 text-cyan-400',
};

export default function MembersPage() {
  const params = useParams();
  void params.tenantId;
  const { canManageMembers } = usePermissions();

  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Filter members
  const filteredMembers = mockMembers.filter((member) => {
    return (
      searchQuery === '' ||
      member.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Group members by role for stats
  const membersByRole = mockMembers.reduce(
    (acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const membersWithConflicts = mockMembers.filter((m) => m.conflicts.length > 0).length;

  return (
    <div className="p-8 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-white/50 mt-1">
            Manage board members and their roles
          </p>
        </div>
        {canManageMembers && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Invite Dialog */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-white/10 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold">Invite Member</h2>
              <button onClick={() => setIsInviteOpen(false)} className="text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Email Address</label>
                <input
                  type="email"
                  placeholder="member@example.com"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Role</label>
                <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Title (optional)</label>
                <input
                  type="text"
                  placeholder="Board Member"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-white/10">
              <button
                onClick={() => setIsInviteOpen(false)}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
              >
                <Mail className="h-4 w-4" />
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5 mb-10">
        <div className="p-6 rounded-xl bg-white/[0.02]">
          <p className="text-sm text-white/40">Total Members</p>
          <p className="text-3xl font-bold mt-1">{mockMembers.length}</p>
        </div>
        <div className="p-6 rounded-xl bg-blue-500/10">
          <p className="text-sm text-blue-400">Directors</p>
          <p className="text-3xl font-bold mt-1 text-blue-400">{membersByRole['director'] || 0}</p>
        </div>
        <div className="p-6 rounded-xl bg-emerald-500/10">
          <p className="text-sm text-emerald-400">Officers</p>
          <p className="text-3xl font-bold mt-1 text-emerald-400">
            {(membersByRole['chair'] || 0) + (membersByRole['secretary'] || 0) + (membersByRole['treasurer'] || 0)}
          </p>
        </div>
        <div className="p-6 rounded-xl bg-white/[0.02]">
          <p className="text-sm text-white/40">Observers</p>
          <p className="text-3xl font-bold mt-1">{membersByRole['observer'] || 0}</p>
        </div>
        <div className="p-6 rounded-xl bg-amber-500/10">
          <p className="text-sm text-amber-400">With Conflicts</p>
          <p className="text-3xl font-bold mt-1 text-amber-400">{membersWithConflicts}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
      </div>

      {/* Members List */}
      <div className="rounded-xl bg-white/[0.02] overflow-hidden">
        <div className="divide-y divide-white/5">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-medium">
                  {member.displayName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{member.displayName}</p>
                    {member.conflicts.length > 0 && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-amber-500/10 text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        Conflict
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/40">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className={`px-2 py-0.5 text-xs rounded-md ${roleColors[member.role]}`}>
                    {roleLabels[member.role]}
                  </span>
                  <p className="text-xs text-white/30 mt-1">
                    Joined {formatRelativeDate(member.joinedAt.toDate())}
                  </p>
                </div>

                {canManageMembers && (
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                      className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen === member.id && (
                      <div className="absolute top-full right-0 mt-1 py-1 bg-[#141414] border border-white/10 rounded-lg shadow-xl z-50 min-w-[160px]">
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:bg-white/5">
                          <UserCog className="h-4 w-4" />
                          Edit Role
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:bg-white/5">
                          <Shield className="h-4 w-4" />
                          Permissions
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:bg-white/5">
                          <AlertTriangle className="h-4 w-4" />
                          Manage Conflicts
                        </button>
                        <div className="border-t border-white/10 my-1" />
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5">
                          <Trash2 className="h-4 w-4" />
                          Remove Member
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <div className="rounded-xl bg-white/[0.02] p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-white/20 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No members found</h3>
          <p className="text-white/50">
            Try adjusting your search query
          </p>
        </div>
      )}
    </div>
  );
}

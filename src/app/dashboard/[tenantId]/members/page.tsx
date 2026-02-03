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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermissions } from '@/contexts/auth-context';
import { formatRelativeDate } from '@/lib/utils';
import type { Member, MemberRole } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';

// Extended member type with user info
interface MemberWithUser extends Member {
  displayName: string;
  email: string;
  avatarUrl?: string;
  lastLoginAt?: Timestamp;
}

// Mock members
const mockMembers: MemberWithUser[] = [
  {
    id: '1',
    tenantId: 'tenant1',
    userId: '1',
    role: 'owner',
    displayName: 'Anna Lindqvist',
    email: 'anna@example.com',
    title: 'CEO & Chair',
    department: 'Executive',
    isActive: true,
    conflicts: [],
    permissions: { canCreateMeetings: true, canManageMembers: true, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: true },
    joinedAt: Timestamp.fromDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)),
    lastLoginAt: Timestamp.fromDate(new Date(Date.now() - 1 * 60 * 60 * 1000)),
  },
  {
    id: '2',
    tenantId: 'tenant1',
    userId: '2',
    role: 'secretary',
    displayName: 'Erik Johansson',
    email: 'erik@example.com',
    title: 'Board Secretary',
    department: 'Legal',
    isActive: true,
    conflicts: [],
    permissions: { canCreateMeetings: true, canManageMembers: false, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: true },
    joinedAt: Timestamp.fromDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)),
    lastLoginAt: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)),
  },
  {
    id: '3',
    tenantId: 'tenant1',
    userId: '3',
    role: 'director',
    displayName: 'Maria Svensson',
    email: 'maria@example.com',
    title: 'Board Director',
    isActive: true,
    conflicts: [],
    permissions: { canCreateMeetings: false, canManageMembers: false, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: false },
    joinedAt: Timestamp.fromDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
    lastLoginAt: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
  },
  {
    id: '4',
    tenantId: 'tenant1',
    userId: '4',
    role: 'director',
    displayName: 'Karl Nilsson',
    email: 'karl@example.com',
    title: 'External Director',
    isActive: true,
    conflicts: [
      {
        id: 'c1',
        entityName: 'TechCorp AB',
        entityType: 'company',
        organizationNumber: '556123-4567',
        relationship: 'Board Member',
        isActive: true,
        declaredAt: Timestamp.fromDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)),
      },
      {
        id: 'c2',
        entityName: 'Innovation Partners',
        entityType: 'company',
        relationship: 'Investor',
        isActive: true,
        declaredAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      },
    ],
    permissions: { canCreateMeetings: false, canManageMembers: false, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: false },
    joinedAt: Timestamp.fromDate(new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)),
    lastLoginAt: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
  },
  {
    id: '5',
    tenantId: 'tenant1',
    userId: '5',
    role: 'observer',
    displayName: 'Lisa Andersson',
    email: 'lisa@example.com',
    title: 'Employee Representative',
    isActive: true,
    conflicts: [],
    permissions: { canCreateMeetings: false, canManageMembers: false, canAccessFinancials: false, canSignDocuments: false, canManageDocuments: false },
    joinedAt: Timestamp.fromDate(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)),
    lastLoginAt: Timestamp.fromDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
  },
  {
    id: '6',
    tenantId: 'tenant1',
    userId: '6',
    role: 'auditor',
    displayName: 'Johan Bergström',
    email: 'johan@audit.com',
    title: 'External Auditor',
    department: 'Audit Firm AB',
    isActive: true,
    conflicts: [],
    permissions: { canCreateMeetings: false, canManageMembers: false, canAccessFinancials: true, canSignDocuments: false, canManageDocuments: false },
    joinedAt: Timestamp.fromDate(new Date(Date.now() - 200 * 24 * 60 * 60 * 1000)),
  },
];

const roleLabels: Record<MemberRole, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  secretary: 'Secretary',
  chair: 'Chair',
  director: 'Board Director',
  observer: 'Observer',
  auditor: 'Auditor',
};

const roleColors: Record<MemberRole, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  secretary: 'bg-green-100 text-green-800',
  chair: 'bg-amber-100 text-amber-800',
  director: 'bg-slate-100 text-slate-800',
  observer: 'bg-gray-100 text-gray-800',
  auditor: 'bg-red-100 text-red-800',
};

export default function MembersPage() {
  const params = useParams();
  void params.tenantId; // Used for routing
  const { canManageMembers } = usePermissions();

  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [, setSelectedMember] = useState<MemberWithUser | null>(null);

  // Filter members
  const filteredMembers = mockMembers.filter((member) => {
    const matchesSearch =
      searchQuery === '' ||
      member.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && member.isActive;
  });

  // Group by role
  const membersByRole = mockMembers.reduce(
    (acc, member) => {
      if (member.isActive) {
        acc[member.role] = (acc[member.role] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const membersWithConflicts = mockMembers.filter((m) => m.conflicts.length > 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-muted-foreground mt-1">
            Manage board members, roles, and conflict of interest declarations
          </p>
        </div>
        {canManageMembers && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" placeholder="member@company.com" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select defaultValue="director">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title (optional)</Label>
                  <Input placeholder="Board Director" />
                </div>
                <div className="space-y-2">
                  <Label>Personal Message (optional)</Label>
                  <Input placeholder="Welcome to the board!" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsInviteOpen(false)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Members</div>
            <div className="text-2xl font-bold">{mockMembers.filter((m) => m.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Board Directors</div>
            <div className="text-2xl font-bold">{membersByRole['director'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">With Voting Rights</div>
            <div className="text-2xl font-bold">
              {mockMembers.filter((m) => m.isActive && ['owner', 'chair', 'director'].includes(m.role)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">Declared Conflicts</div>
              {membersWithConflicts.length > 0 && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div className="text-2xl font-bold">{membersWithConflicts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Members List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <UserAvatar
                    name={member.displayName}
                    imageUrl={member.avatarUrl}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.displayName}</p>
                      {member.conflicts.length > 0 && (
                        <Badge variant="warning" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {member.conflicts.length} conflict{member.conflicts.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {member.title && <span>{member.title}</span>}
                      {member.title && member.department && <span>•</span>}
                      {member.department && <span>{member.department}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge variant="outline" className={roleColors[member.role]}>
                      {roleLabels[member.role]}
                    </Badge>
                    {member.lastLoginAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last active {formatRelativeDate(member.lastLoginAt.toDate())}
                      </p>
                    )}
                  </div>

                  {canManageMembers && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                          <UserCog className="h-4 w-4 mr-2" />
                          Edit Member
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Shield className="h-4 w-4 mr-2" />
                          Manage Conflicts
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Message
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conflict of Interest Section */}
      {membersWithConflicts.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              <CardTitle>Declared Conflicts of Interest (Jäv)</CardTitle>
            </div>
            <CardDescription>
              Members with declared conflicts that may affect voting on certain matters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {membersWithConflicts.map((member) => (
                <div key={member.id} className="p-4 rounded-lg border">
                  <div className="flex items-center gap-3 mb-3">
                    <UserAvatar name={member.displayName} size="sm" />
                    <div>
                      <p className="font-medium">{member.displayName}</p>
                      <p className="text-sm text-muted-foreground">{member.title}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {member.conflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <div>
                          <p className="text-sm font-medium">{conflict.entityName}</p>
                          <p className="text-xs text-muted-foreground">
                            {conflict.relationship}
                            {conflict.organizationNumber && ` • ${conflict.organizationNumber}`}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {conflict.entityType}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

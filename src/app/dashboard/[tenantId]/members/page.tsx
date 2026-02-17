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
import type { MemberRole } from '@/types/schema';
import { useMembers } from '@/hooks/use-firestore';

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
  const tenantId = params.tenantId as string;
  const { canManageMembers } = usePermissions();

  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const { data: members = [], isLoading } = useMembers(tenantId);

  // Helper to get display name from member
  const getMemberDisplayName = (member: { title?: string; role: MemberRole; userId: string }) => {
    return member.title || roleLabels[member.role] || member.userId;
  };

  // Filter members
  const filteredMembers = members.filter((member) => {
    const displayName = getMemberDisplayName(member);
    const matchesSearch =
      searchQuery === '' ||
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && member.isActive;
  });

  // Group by role
  const membersByRole = members.reduce(
    (acc, member) => {
      if (member.isActive) {
        acc[member.role] = (acc[member.role] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const membersWithConflicts = members.filter((m) => m.conflicts.length > 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
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
            <div className="text-2xl font-bold">{members.filter((m) => m.isActive).length}</div>
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
              {members.filter((m) => m.isActive && ['owner', 'chair', 'director'].includes(m.role)).length}
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
      {isLoading && (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading members...</p>
        </Card>
      )}

      {!isLoading && filteredMembers.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No members found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Invite board members to get started'}
          </p>
          {!searchQuery && canManageMembers && (
            <Button onClick={() => setIsInviteOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </Card>
      )}

      {!isLoading && filteredMembers.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredMembers.map((member) => {
                const displayName = getMemberDisplayName(member);
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <UserAvatar
                        name={displayName}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{displayName}</p>
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
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge variant="outline" className={roleColors[member.role]}>
                          {roleLabels[member.role]}
                        </Badge>
                        {member.joinedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Joined {formatRelativeDate(member.joinedAt.toDate())}
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
                            <DropdownMenuItem>
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
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
              {membersWithConflicts.map((member) => {
                const displayName = getMemberDisplayName(member);
                return (
                  <div key={member.id} className="p-4 rounded-lg border">
                    <div className="flex items-center gap-3 mb-3">
                      <UserAvatar name={displayName} size="sm" />
                      <div>
                        <p className="font-medium">{displayName}</p>
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
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

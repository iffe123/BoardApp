'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  Users,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';
import type { Decision, DecisionOutcome } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';

// Mock decisions data
const mockDecisions: Decision[] = [
  {
    id: '1',
    tenantId: 'tenant1',
    meetingId: '1',
    agendaItemId: '5',
    decisionNumber: 'D-2024-001',
    title: 'Budget Approval 2025',
    description: 'Approved the annual budget for fiscal year 2025 with total expenditure of 25 MSEK',
    motion: 'To approve the proposed budget for fiscal year 2025 as presented by the CFO',
    outcome: 'approved',
    votingMethod: 'show_of_hands',
    votesFor: 5,
    votesAgainst: 0,
    abstentions: 1,
    participantIds: ['1', '2', '3', '4', '5', '6'],
    recusedMemberIds: [],
    actionItems: [
      { id: '1', title: 'Implement Q1 budget allocations', assigneeName: 'CFO', status: 'in_progress', createdAt: Timestamp.now() },
    ],
    implementationDeadline: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    implementationStatus: 'in_progress',
    relatedDocumentIds: ['doc3'],
    relatedDecisionIds: [],
    decidedAt: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    recordedBy: 'user2',
    createdAt: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
  },
  {
    id: '2',
    tenantId: 'tenant1',
    meetingId: '1',
    agendaItemId: '6',
    decisionNumber: 'D-2024-002',
    title: 'TechCorp AB Acquisition',
    description: 'Decision to proceed with due diligence for potential acquisition of TechCorp AB',
    motion: 'To authorize management to conduct due diligence on TechCorp AB acquisition',
    outcome: 'approved',
    votingMethod: 'roll_call',
    votesFor: 4,
    votesAgainst: 0,
    abstentions: 0,
    participantIds: ['1', '2', '3', '5'],
    recusedMemberIds: ['4'],
    actionItems: [
      { id: '2', title: 'Engage M&A advisors', assigneeName: 'CEO', status: 'completed', createdAt: Timestamp.now() },
      { id: '3', title: 'Complete financial due diligence', assigneeName: 'CFO', status: 'in_progress', createdAt: Timestamp.now() },
    ],
    implementationDeadline: Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)),
    implementationStatus: 'in_progress',
    relatedDocumentIds: ['doc4'],
    relatedDecisionIds: [],
    decidedAt: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    recordedBy: 'user2',
    createdAt: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
  },
  {
    id: '3',
    tenantId: 'tenant1',
    meetingId: '3',
    agendaItemId: '3',
    decisionNumber: 'D-2023-045',
    title: 'Dividend Distribution',
    description: 'Approved dividend distribution of 2 SEK per share for fiscal year 2023',
    motion: 'To distribute dividends of 2 SEK per share to shareholders',
    outcome: 'approved',
    votingMethod: 'unanimous',
    votesFor: 6,
    votesAgainst: 0,
    abstentions: 0,
    participantIds: ['1', '2', '3', '4', '5', '6'],
    recusedMemberIds: [],
    actionItems: [
      { id: '4', title: 'Process dividend payments', assigneeName: 'CFO', status: 'completed', createdAt: Timestamp.now(), completedAt: Timestamp.now() },
    ],
    implementationStatus: 'completed',
    relatedDocumentIds: [],
    relatedDecisionIds: [],
    decidedAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    recordedBy: 'user2',
    createdAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)),
  },
  {
    id: '4',
    tenantId: 'tenant1',
    meetingId: '3',
    agendaItemId: '4',
    decisionNumber: 'D-2023-044',
    title: 'Office Relocation Proposal',
    description: 'Proposal to relocate headquarters to new premises',
    motion: 'To relocate the company headquarters to Kungsholmen by Q2 2024',
    outcome: 'tabled',
    votingMethod: 'show_of_hands',
    votesFor: 2,
    votesAgainst: 2,
    abstentions: 2,
    participantIds: ['1', '2', '3', '4', '5', '6'],
    recusedMemberIds: [],
    actionItems: [
      { id: '5', title: 'Conduct cost-benefit analysis', assigneeName: 'COO', status: 'pending', createdAt: Timestamp.now() },
    ],
    implementationStatus: 'pending',
    relatedDocumentIds: [],
    relatedDecisionIds: [],
    decidedAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    recordedBy: 'user2',
    createdAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
  },
];

type FilterOutcome = 'all' | DecisionOutcome;

const outcomeLabels: Record<DecisionOutcome, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  tabled: 'Tabled',
  withdrawn: 'Withdrawn',
  pending: 'Pending',
};

const outcomeIcons: Record<DecisionOutcome, React.ReactNode> = {
  approved: <CheckCircle className="h-4 w-4 text-green-600" />,
  rejected: <XCircle className="h-4 w-4 text-red-600" />,
  tabled: <Clock className="h-4 w-4 text-amber-600" />,
  withdrawn: <AlertTriangle className="h-4 w-4 text-gray-500" />,
  pending: <Clock className="h-4 w-4 text-blue-600" />,
};

const outcomeColors: Record<DecisionOutcome, string> = {
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  tabled: 'bg-amber-100 text-amber-800 border-amber-200',
  withdrawn: 'bg-gray-100 text-gray-800 border-gray-200',
  pending: 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function DecisionsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterOutcome, setFilterOutcome] = useState<FilterOutcome>('all');

  // Filter decisions
  const filteredDecisions = mockDecisions.filter((decision) => {
    const matchesOutcome = filterOutcome === 'all' || decision.outcome === filterOutcome;
    const matchesSearch =
      searchQuery === '' ||
      decision.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      decision.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      decision.decisionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesOutcome && matchesSearch;
  });

  // Stats
  const decisionsByOutcome = mockDecisions.reduce(
    (acc, d) => {
      acc[d.outcome] = (acc[d.outcome] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Decision Register</h1>
          <p className="text-muted-foreground mt-1">
            Track all board decisions and their implementation status
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Decisions</div>
            <div className="text-2xl font-bold">{mockDecisions.length}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="text-sm text-green-700">Approved</div>
            <div className="text-2xl font-bold text-green-800">{decisionsByOutcome['approved'] || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-sm text-red-700">Rejected</div>
            <div className="text-2xl font-bold text-red-800">{decisionsByOutcome['rejected'] || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="text-sm text-amber-700">Tabled</div>
            <div className="text-2xl font-bold text-amber-800">{decisionsByOutcome['tabled'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">In Progress</div>
            <div className="text-2xl font-bold">
              {mockDecisions.filter((d) => d.implementationStatus === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search decisions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {filterOutcome === 'all' ? 'All Outcomes' : outcomeLabels[filterOutcome]}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by Outcome</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setFilterOutcome('all')}>
              All Outcomes
            </DropdownMenuItem>
            {Object.entries(outcomeLabels).map(([value, label]) => (
              <DropdownMenuItem
                key={value}
                onClick={() => setFilterOutcome(value as DecisionOutcome)}
              >
                <span className="mr-2">{outcomeIcons[value as DecisionOutcome]}</span>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Decisions List */}
      <div className="space-y-4">
        {filteredDecisions.map((decision) => (
          <Card key={decision.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className={outcomeColors[decision.outcome]}>
                      <span className="mr-1">{outcomeIcons[decision.outcome]}</span>
                      {outcomeLabels[decision.outcome]}
                    </Badge>
                    <span className="text-sm text-muted-foreground font-mono">
                      {decision.decisionNumber}
                    </span>
                    {decision.recusedMemberIds.length > 0 && (
                      <Badge variant="warning" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {decision.recusedMemberIds.length} recused
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold mb-1">{decision.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{decision.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDate(decision.decidedAt.toDate())}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {decision.votesFor} for / {decision.votesAgainst} against / {decision.abstentions} abstain
                    </div>
                    {decision.relatedDocumentIds.length > 0 && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {decision.relatedDocumentIds.length} document{decision.relatedDocumentIds.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {/* Action Items */}
                  {decision.actionItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Action Items</p>
                      <div className="space-y-2">
                        {decision.actionItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              {item.status === 'completed' ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : item.status === 'in_progress' ? (
                                <Clock className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className={item.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                                {item.title}
                              </span>
                            </div>
                            {item.assigneeName && (
                              <span className="text-muted-foreground">{item.assigneeName}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Link href={`/dashboard/${tenantId}/meetings/${decision.meetingId}`}>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Meeting
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredDecisions.length === 0 && (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No decisions found</h3>
            <p className="text-muted-foreground">
              {searchQuery || filterOutcome !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Decisions will appear here after board meetings'}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

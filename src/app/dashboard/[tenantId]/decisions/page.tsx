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
  approved: <CheckCircle className="h-4 w-4 text-emerald-400" />,
  rejected: <XCircle className="h-4 w-4 text-red-400" />,
  tabled: <Clock className="h-4 w-4 text-amber-400" />,
  withdrawn: <AlertTriangle className="h-4 w-4 text-white/40" />,
  pending: <Clock className="h-4 w-4 text-blue-400" />,
};

const outcomeColors: Record<DecisionOutcome, string> = {
  approved: 'bg-emerald-500/10 text-emerald-400',
  rejected: 'bg-red-500/10 text-red-400',
  tabled: 'bg-amber-500/10 text-amber-400',
  withdrawn: 'bg-white/5 text-white/50',
  pending: 'bg-blue-500/10 text-blue-400',
};

export default function DecisionsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterOutcome, setFilterOutcome] = useState<FilterOutcome>('all');
  const [filterOpen, setFilterOpen] = useState(false);

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
    <div className="p-8 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Decision Register</h1>
          <p className="text-white/50 mt-1">
            Track all board decisions and their implementation status
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5 mb-10">
        <div className="p-6 rounded-xl bg-white/[0.02]">
          <p className="text-sm text-white/40">Total Decisions</p>
          <p className="text-3xl font-bold mt-1">{mockDecisions.length}</p>
        </div>
        <div className="p-6 rounded-xl bg-emerald-500/10">
          <p className="text-sm text-emerald-400">Approved</p>
          <p className="text-3xl font-bold mt-1 text-emerald-400">{decisionsByOutcome['approved'] || 0}</p>
        </div>
        <div className="p-6 rounded-xl bg-red-500/10">
          <p className="text-sm text-red-400">Rejected</p>
          <p className="text-3xl font-bold mt-1 text-red-400">{decisionsByOutcome['rejected'] || 0}</p>
        </div>
        <div className="p-6 rounded-xl bg-amber-500/10">
          <p className="text-sm text-amber-400">Tabled</p>
          <p className="text-3xl font-bold mt-1 text-amber-400">{decisionsByOutcome['tabled'] || 0}</p>
        </div>
        <div className="p-6 rounded-xl bg-white/[0.02]">
          <p className="text-sm text-white/40">In Progress</p>
          <p className="text-3xl font-bold mt-1">
            {mockDecisions.filter((d) => d.implementationStatus === 'in_progress').length}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Search decisions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
          >
            <Filter className="h-4 w-4" />
            {filterOutcome === 'all' ? 'All Outcomes' : outcomeLabels[filterOutcome]}
            <ChevronDown className="h-4 w-4" />
          </button>

          {filterOpen && (
            <div className="absolute top-full left-0 mt-1 py-1 bg-[#141414] border border-white/10 rounded-lg shadow-xl z-50 min-w-[160px]">
              <button
                onClick={() => { setFilterOutcome('all'); setFilterOpen(false); }}
                className="w-full px-3 py-2 text-sm text-left text-white/70 hover:bg-white/5"
              >
                All Outcomes
              </button>
              {Object.entries(outcomeLabels).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => { setFilterOutcome(value as DecisionOutcome); setFilterOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-white/70 hover:bg-white/5"
                >
                  {outcomeIcons[value as DecisionOutcome]}
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Decisions List */}
      <div className="space-y-4">
        {filteredDecisions.map((decision) => (
          <div key={decision.id} className="rounded-xl bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md ${outcomeColors[decision.outcome]}`}>
                    {outcomeIcons[decision.outcome]}
                    {outcomeLabels[decision.outcome]}
                  </span>
                  <span className="text-sm text-white/40 font-mono">
                    {decision.decisionNumber}
                  </span>
                  {decision.recusedMemberIds.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-amber-500/10 text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      {decision.recusedMemberIds.length} recused
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold mb-1">{decision.title}</h3>
                <p className="text-white/50 text-sm mb-4">{decision.description}</p>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-white/40">
                    <Calendar className="h-4 w-4" />
                    {formatDate(decision.decidedAt.toDate())}
                  </div>
                  <div className="flex items-center gap-1 text-white/40">
                    <Users className="h-4 w-4" />
                    {decision.votesFor} for / {decision.votesAgainst} against / {decision.abstentions} abstain
                  </div>
                  {decision.relatedDocumentIds.length > 0 && (
                    <div className="flex items-center gap-1 text-white/40">
                      <FileText className="h-4 w-4" />
                      {decision.relatedDocumentIds.length} document{decision.relatedDocumentIds.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Action Items */}
                {decision.actionItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-sm font-medium mb-2">Action Items</p>
                    <div className="space-y-2">
                      {decision.actionItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm p-2 rounded bg-white/5"
                        >
                          <div className="flex items-center gap-2">
                            {item.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4 text-emerald-400" />
                            ) : item.status === 'in_progress' ? (
                              <Clock className="h-4 w-4 text-blue-400" />
                            ) : (
                              <Clock className="h-4 w-4 text-white/40" />
                            )}
                            <span className={item.status === 'completed' ? 'line-through text-white/40' : 'text-white/70'}>
                              {item.title}
                            </span>
                          </div>
                          {item.assigneeName && (
                            <span className="text-white/40">{item.assigneeName}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link href={`/dashboard/${tenantId}/meetings/${decision.meetingId}`}>
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  <ExternalLink className="h-4 w-4" />
                  View Meeting
                </button>
              </Link>
            </div>
          </div>
        ))}

        {filteredDecisions.length === 0 && (
          <div className="rounded-xl bg-white/[0.02] p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-white/20 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No decisions found</h3>
            <p className="text-white/50">
              {searchQuery || filterOutcome !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Decisions will appear here after board meetings'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

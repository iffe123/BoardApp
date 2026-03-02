'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Loader2,
  RefreshCw,
  Vote,
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
import {
  db,
  auth,
  collections,
  getDocs,
  query,
  orderBy,
  onSnapshot,
} from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';

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


const executionStatusLabel = (decision: Decision) => {
  if (!decision.actionItems || decision.actionItems.length === 0) return 'Not started';
  if (decision.actionItems.every((item) => item.status === 'completed')) return 'Completed';
  return 'In progress';
};

export default function DecisionsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { currentTenantRole } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterOutcome, setFilterOutcome] = useState<FilterOutcome>('all');
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const decisionsRef = collections.decisions(tenantId);
    const decisionsQuery = query(decisionsRef, orderBy('decidedAt', 'desc'));

    const unsubscribe = onSnapshot(
      decisionsQuery,
      (snapshot) => {
        const fetchedDecisions: Decision[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Decision[];
        setDecisions(fetchedDecisions);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching decisions:', err);
        setError('Failed to load decisions. Please try again.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  const handleRefresh = async () => {
    if (!tenantId || !db) return;
    setLoading(true);
    setError(null);

    try {
      const decisionsRef = collections.decisions(tenantId);
      const decisionsQuery = query(decisionsRef, orderBy('decidedAt', 'desc'));
      const snapshot = await getDocs(decisionsQuery);
      setDecisions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Decision[]);
    } catch (err) {
      console.error('Error refreshing decisions:', err);
      setError('Failed to refresh decisions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const castDecisionAction = async (decisionId: string, action: 'vote' | 'open' | 'close', vote?: 'for' | 'against' | 'abstain') => {
    try {
      setSubmittingId(decisionId);
      const token = await auth.currentUser?.getIdToken();
      const endpoint = action === 'vote' ? 'vote' : action;
      const response = await fetch(`/api/decisions/${decisionId}/${endpoint}?tenantId=${tenantId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: action === 'vote' ? JSON.stringify({ vote }) : JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Action failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Voting action failed';
      setError(message);
    } finally {
      setSubmittingId(null);
    }
  };

  const filteredDecisions = useMemo(() => decisions.filter((decision) => {
    const matchesOutcome = filterOutcome === 'all' || decision.outcome === filterOutcome;
    const matchesSearch =
      searchQuery === '' ||
      decision.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      decision.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      decision.decisionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesOutcome && matchesSearch;
  }), [decisions, filterOutcome, searchQuery]);

  const decisionsByOutcome = decisions.reduce((acc, d) => {
    acc[d.outcome] = (acc[d.outcome] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Decision Register</h1>
          <p className="text-muted-foreground mt-1">Track all board decisions and their implementation status</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {error && <Card className="mb-6 border-red-200 bg-red-50"><CardContent className="p-4 flex items-center justify-between"><div className="flex items-center gap-2 text-red-700"><AlertTriangle className="h-4 w-4" /><span>{error}</span></div><Button variant="outline" size="sm" onClick={handleRefresh}>Retry</Button></CardContent></Card>}

      <div className="grid gap-4 md:grid-cols-5 mb-8">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total Decisions</div><div className="text-2xl font-bold">{loading ? '-' : decisions.length}</div></CardContent></Card>
        <Card className="border-green-200 bg-green-50"><CardContent className="p-4"><div className="text-sm text-green-700">Approved</div><div className="text-2xl font-bold text-green-800">{loading ? '-' : (decisionsByOutcome.approved || 0)}</div></CardContent></Card>
        <Card className="border-red-200 bg-red-50"><CardContent className="p-4"><div className="text-sm text-red-700">Rejected</div><div className="text-2xl font-bold text-red-800">{loading ? '-' : (decisionsByOutcome.rejected || 0)}</div></CardContent></Card>
        <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4"><div className="text-sm text-amber-700">Tabled</div><div className="text-2xl font-bold text-amber-800">{loading ? '-' : (decisionsByOutcome.tabled || 0)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">In Progress</div><div className="text-2xl font-bold">{loading ? '-' : decisions.filter((d) => d.implementationStatus === 'in_progress').length}</div></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search decisions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Filter className="h-4 w-4 mr-2" />{filterOutcome === 'all' ? 'All Outcomes' : outcomeLabels[filterOutcome]}<ChevronDown className="h-4 w-4 ml-2" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuLabel>Filter by Outcome</DropdownMenuLabel><DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setFilterOutcome('all')}>All Outcomes</DropdownMenuItem>
          {Object.entries(outcomeLabels).map(([value, label]) => <DropdownMenuItem key={value} onClick={() => setFilterOutcome(value as DecisionOutcome)}><span className="mr-2">{outcomeIcons[value as DecisionOutcome]}</span>{label}</DropdownMenuItem>)}
        </DropdownMenuContent></DropdownMenu>
      </div>

      <div className="space-y-4">
        {loading && <Card className="p-12 text-center"><Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" /><h3 className="text-lg font-semibold mb-2">Loading decisions...</h3><p className="text-muted-foreground">Fetching data from the database</p></Card>}

        {!loading && filteredDecisions.map((decision) => {
          const chairOrAdmin = ['chair', 'admin', 'owner'].includes(currentTenantRole || '');
          const votingEnabled = decision.voting?.enabled;
          const votingStatus = decision.voting?.status || 'draft';
          const quorumRequired = decision.voting?.quorumRequired || 0;
          const totalVotes = (decision.votesFor || 0) + (decision.votesAgainst || 0) + (decision.abstentions || 0);
          const quorumMet = !quorumRequired || totalVotes >= Number(quorumRequired);

          return <Card key={decision.id} className="hover:shadow-md transition-shadow"><CardContent className="p-6"><div className="flex items-start justify-between"><div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className={outcomeColors[decision.outcome]}><span className="mr-1">{outcomeIcons[decision.outcome]}</span>{outcomeLabels[decision.outcome]}</Badge>
              <span className="text-sm text-muted-foreground font-mono">{decision.decisionNumber}</span>
              {decision.recusedMemberIds.length > 0 && <Badge variant="warning" className="gap-1"><AlertTriangle className="h-3 w-3" />{decision.recusedMemberIds.length} recused</Badge>}
              {votingEnabled && <Badge variant="outline" className="gap-1"><Vote className="h-3 w-3" />Voting: {votingStatus}</Badge>}
            </div>

            <h3 className="text-lg font-semibold mb-1">{decision.title}</h3>
            <p className="text-muted-foreground text-sm mb-4">{decision.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm"><div className="flex items-center gap-1 text-muted-foreground"><Calendar className="h-4 w-4" />{formatDate(decision.decidedAt.toDate())}</div><div className="flex items-center gap-1 text-muted-foreground"><Users className="h-4 w-4" />{decision.votesFor} for / {decision.votesAgainst} against / {decision.abstentions} abstain</div>{decision.relatedDocumentIds.length > 0 && <div className="flex items-center gap-1 text-muted-foreground"><FileText className="h-4 w-4" />{decision.relatedDocumentIds.length} document{decision.relatedDocumentIds.length > 1 ? 's' : ''}</div>}</div>

            {votingEnabled && <div className="mt-4 p-3 border rounded-md bg-muted/40"><div className="text-sm">Quorum: {quorumMet ? 'Met' : 'Not met'} ({totalVotes}/{String(quorumRequired || 'n/a')})</div>
              {votingStatus === 'open' && <div className="flex flex-wrap gap-2 mt-2">
                <Button size="sm" variant="outline" disabled={submittingId === decision.id} onClick={() => castDecisionAction(decision.id, 'vote', 'for')}>Vote For</Button>
                <Button size="sm" variant="outline" disabled={submittingId === decision.id} onClick={() => castDecisionAction(decision.id, 'vote', 'against')}>Vote Against</Button>
                <Button size="sm" variant="outline" disabled={submittingId === decision.id} onClick={() => castDecisionAction(decision.id, 'vote', 'abstain')}>Abstain</Button>
              </div>}
              {chairOrAdmin && <div className="flex gap-2 mt-2">
                {votingStatus === 'draft' && <Button size="sm" disabled={submittingId === decision.id} onClick={() => castDecisionAction(decision.id, 'open')}>Open voting</Button>}
                {votingStatus === 'open' && <Button size="sm" variant="destructive" disabled={submittingId === decision.id} onClick={() => castDecisionAction(decision.id, 'close')}>Close voting</Button>}
              </div>}
            </div>}
          </div>
          <Link href={`/dashboard/${tenantId}/meetings/${decision.meetingId}`}><Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4 mr-1" />View Meeting</Button></Link>
          </div></CardContent></Card>;
        })}

        {!loading && filteredDecisions.length === 0 && <Card className="p-12 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-2">No decisions found</h3><p className="text-muted-foreground">{searchQuery || filterOutcome !== 'all' ? 'Try adjusting your filters or search query' : 'Decisions will appear here after board meetings'}</p></Card>}
      </div>
    </div>
  );
}

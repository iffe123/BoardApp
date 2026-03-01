'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Edit,
  Check,
  X,
  Send,
  Download,
  AlertTriangle,
  UserCheck,
  Pen,
  Clock,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn, getDecisionOutcomeColor, getAgendaItemTypeColor } from '@/lib/utils';
import type { MeetingMinutes, MinuteItem, MinuteSignature, ActionItem, MinutesComment, MinutesReview, Member } from '@/types/schema';

interface MeetingMinutesProps {
  minutes: MeetingMinutes;
  onUpdate: (minutes: MeetingMinutes) => void;
  onSign: (signerId: string, role: 'chair' | 'adjuster' | 'secretary') => Promise<void>;
  onDistribute: () => Promise<void>;
  currentUserId: string;
  currentUserName: string;
  canEdit: boolean;
  isLoading?: boolean;
  tenantId: string;
  meetingId: string;
  members: Member[];
  authToken?: string | null;
}

function getStatusConfig(status: string): { label: string; color: string; icon: React.ReactNode } {
  const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: <Edit className="h-3 w-3" /> },
    review: { label: 'In Review', color: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3" /> },
    pending_signatures: { label: 'Awaiting Signatures', color: 'bg-amber-100 text-amber-800', icon: <Pen className="h-3 w-3" /> },
    signed: { label: 'Signed', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> },
    distributed: { label: 'Distributed', color: 'bg-purple-100 text-purple-800', icon: <Send className="h-3 w-3" /> },
  };
  return (configs[status] || configs.draft)!;
}

function MinuteItemEditor({ item, onUpdate, canEdit }: { item: MinuteItem; onUpdate: (item: MinuteItem) => void; canEdit: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [discussion, setDiscussion] = useState(item.discussion);

  return (
    <Card className="mb-4"><CardContent className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">{item.orderIndex + 1}</span>
          <Badge className={getAgendaItemTypeColor(item.type)}>{item.type}</Badge>
          <h4 className="font-medium">{item.title}</h4>
        </div>
        {canEdit && !isEditing && <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4 mr-1" />Edit</Button>}
      </div>
      {isEditing ? (
        <div className="space-y-3">
          <Textarea value={discussion} onChange={(e) => setDiscussion(e.target.value)} rows={4} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setDiscussion(item.discussion); setIsEditing(false); }}><X className="h-4 w-4 mr-1" />Cancel</Button>
            <Button size="sm" onClick={() => { onUpdate({ ...item, discussion }); setIsEditing(false); }}><Check className="h-4 w-4 mr-1" />Save</Button>
          </div>
        </div>
      ) : <div className="text-sm text-muted-foreground whitespace-pre-wrap">{item.discussion || <span className="italic">No notes recorded for this item.</span>}</div>}
      {item.decision && <div className="mt-4 rounded-md bg-muted/50 p-3"><div className="flex items-center gap-2 mb-2"><strong className="text-sm">Decision:</strong><Badge className={getDecisionOutcomeColor(item.decision.outcome)}>{item.decision.outcome}</Badge></div><p className="text-sm">{item.decision.motion}</p></div>}
      {item.recusals && item.recusals.length > 0 && <div className="mt-4 rounded-md bg-amber-50 p-3"><div className="flex items-center gap-2 text-amber-800 mb-2"><AlertTriangle className="h-4 w-4" /><strong className="text-sm">Recusals (Jäv)</strong></div><ul className="text-sm space-y-1">{item.recusals.map((r, idx) => <li key={idx}><strong>{r.memberName}</strong>: {r.reason}</li>)}</ul></div>}
      {item.actionItems.length > 0 && <div className="mt-4"><h5 className="text-sm font-medium mb-2">Action Items</h5><ul className="space-y-2">{item.actionItems.map((action: ActionItem) => <li key={action.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={action.status === 'completed'} disabled className="mt-0.5 rounded" /><div><span>{action.title}</span></div></li>)}</ul></div>}
    </CardContent></Card>
  );
}

function SignaturePanel({ signatures, onSign, currentUserId, isLoading }: { signatures: MinuteSignature[]; onSign: (role: 'chair' | 'adjuster' | 'secretary') => Promise<void>; currentUserId: string; isLoading?: boolean }) {
  const roleOrder = ['chair', 'adjuster', 'secretary'] as const;
  return (
    <Card><CardHeader><CardTitle className="text-lg">Signatures</CardTitle><CardDescription>Minutes must be signed by the Chair and verified by an Adjuster (Justeringsman)</CardDescription></CardHeader>
      <CardContent className="space-y-4">{roleOrder.map((role) => {
        const signature = signatures.find((s) => s.signerRole === role);
        const canSign = signature?.signerId === currentUserId && signature?.status === 'pending';
        return <div key={role} className={cn('flex items-center justify-between p-3 rounded-lg border', signature?.status === 'signed' && 'bg-green-50 border-green-200')}><div className="flex items-center gap-3">{signature ? <UserAvatar name={signature.signerName} size="sm" /> : <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><UserCheck className="h-4 w-4 text-muted-foreground" /></div>}<div><p className="font-medium capitalize">{role}</p><p className="text-sm text-muted-foreground">{signature?.signerName || 'Not assigned'}</p></div></div><div>{canSign ? <AlertDialog><AlertDialogTrigger asChild><Button size="sm" isLoading={isLoading}><Pen className="h-4 w-4 mr-1" />Sign</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Sign Minutes</AlertDialogTitle><AlertDialogDescription>By signing, you confirm that these minutes accurately reflect the proceedings of the meeting.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onSign(role)}>Confirm & Sign</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog> : <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{signature?.status || 'pending'}</Badge>}</div></div>;
      })}</CardContent>
    </Card>
  );
}

export function MeetingMinutesEditor({ minutes, onUpdate, onSign, onDistribute, currentUserId, currentUserName, canEdit, isLoading, tenantId, meetingId, members, authToken }: MeetingMinutesProps) {
  const [localMinutes, setLocalMinutes] = useState(minutes);
  const [activeReview, setActiveReview] = useState<MinutesReview | null>(null);
  const [comments, setComments] = useState<MinutesComment[]>([]);
  const [selectedAgendaItemId, setSelectedAgendaItemId] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [commentType, setCommentType] = useState<'comment' | 'change_request'>('comment');
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const statusConfig = getStatusConfig(minutes.status);

  const handleItemUpdate = useCallback((updatedItem: MinuteItem) => {
    const newMinutes = { ...localMinutes, itemMinutes: localMinutes.itemMinutes.map((item) => item.agendaItemId === updatedItem.agendaItemId ? updatedItem : item) };
    setLocalMinutes(newMinutes);
    onUpdate(newMinutes);
  }, [localMinutes, onUpdate]);

  const authHeaders = useMemo(() => ({ 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }), [authToken]);
  const isReviewer = !!activeReview?.reviewers.some((reviewer) => reviewer.userId === currentUserId);
  const isMinutesEditor = canEdit;
  const allSigned = minutes.signatures.every((s) => s.status === 'signed');

  const commentCountByAgendaItem = useMemo(() => comments.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.agendaItemId]: (acc[c.agendaItemId] || 0) + 1 }), {}), [comments]);

  const fetchReviewAndComments = useCallback(async () => {
    const [reviewRes, commentsRes] = await Promise.all([
      fetch(`/api/meetings/${meetingId}/minutes/review?tenantId=${tenantId}`, { headers: authHeaders }),
      fetch(`/api/meetings/${meetingId}/minutes/comments?tenantId=${tenantId}`, { headers: authHeaders }),
    ]);
    if (reviewRes.ok) setActiveReview((await reviewRes.json()).activeReview || null);
    if (commentsRes.ok) setComments((await commentsRes.json()).comments || []);
  }, [authHeaders, meetingId, tenantId]);

  useEffect(() => { fetchReviewAndComments(); }, [fetchReviewAndComments]);

  const requestComments = async () => {
    const response = await fetch(`/api/meetings/${meetingId}/minutes/review/request?tenantId=${tenantId}`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ reviewers: selectedReviewers }) });
    if (response.ok) { setSelectedReviewers([]); await fetchReviewAndComments(); }
  };

  const submitComment = async () => {
    if (!selectedAgendaItemId || !commentContent.trim()) return;
    const response = await fetch(`/api/meetings/${meetingId}/minutes/comments?tenantId=${tenantId}`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ agendaItemId: selectedAgendaItemId, content: commentContent, type: commentType }) });
    if (response.ok) { setCommentContent(''); await fetchReviewAndComments(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Meeting Minutes</h2><p className="text-muted-foreground">Version {minutes.version} · Last updated {minutes.updatedAt.toDate().toLocaleDateString()}</p></div>
        <div className="flex items-center gap-2">
          <Badge className={cn('gap-1', statusConfig.color)}>{statusConfig.icon}{statusConfig.label}</Badge>
          {isMinutesEditor && <Button variant="outline" size="sm" onClick={requestComments} disabled={selectedReviewers.length === 0}>Be om kommentarer</Button>}
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export PDF</Button>
          {allSigned && minutes.status !== 'distributed' && <Button onClick={onDistribute} isLoading={isLoading}><Send className="h-4 w-4 mr-1" />Distribute</Button>}
        </div>
      </div>

      <Card><CardHeader><CardTitle className="text-lg">Review status</CardTitle><CardDescription>{activeReview?.status || 'draft'}</CardDescription></CardHeader><CardContent className="space-y-3">
        {isMinutesEditor && <div className="grid gap-1 md:grid-cols-2">{members.map((member) => <label key={member.id} className="text-xs flex items-center gap-2"><input type="checkbox" checked={selectedReviewers.includes(member.userId)} onChange={(e) => setSelectedReviewers((prev) => e.target.checked ? [...prev, member.userId] : prev.filter((id) => id !== member.userId))} />{member.userId} ({member.role})</label>)}</div>}
        {activeReview?.reviewers.map((r) => <div key={r.userId} className="flex justify-between text-sm border rounded p-2"><span>{r.userId}</span><Badge variant="outline">{r.status}</Badge></div>)}
        {isReviewer && activeReview && <div className="flex gap-2"><Button size="sm" onClick={async () => { await fetch(`/api/meetings/${meetingId}/minutes/review/${activeReview.id}/approve?tenantId=${tenantId}`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ note: `${currentUserName} approved` }) }); await fetchReviewAndComments(); }}>Approve</Button><Button size="sm" variant="outline" onClick={async () => { await fetch(`/api/meetings/${meetingId}/minutes/review/${activeReview.id}/request-changes?tenantId=${tenantId}`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ note: `${currentUserName} requests changes` }) }); await fetchReviewAndComments(); }}>Request changes</Button></div>}
        {isMinutesEditor && activeReview && <Button variant="ghost" size="sm" onClick={async () => { await fetch(`/api/meetings/${meetingId}/minutes/review/${activeReview.id}/close?tenantId=${tenantId}`, { method: 'POST', headers: authHeaders, body: JSON.stringify({}) }); await fetchReviewAndComments(); }}>Close review</Button>}
      </CardContent></Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">Meeting Proceedings</h3>
        {localMinutes.itemMinutes.map((item) => <div key={item.agendaItemId}><div className="mb-2 flex justify-end"><Button variant="ghost" size="sm" onClick={() => setSelectedAgendaItemId(item.agendaItemId)}><MessageSquare className="h-4 w-4 mr-1" />{commentCountByAgendaItem[item.agendaItemId] || 0}</Button></div><MinuteItemEditor item={item} onUpdate={handleItemUpdate} canEdit={canEdit && minutes.status === 'draft'} /></div>)}
      </div>

      <Dialog open={!!selectedAgendaItemId} onOpenChange={(open) => !open && setSelectedAgendaItemId(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Kommentarer</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {comments.filter((c) => c.agendaItemId === selectedAgendaItemId).map((c) => <div key={c.id} className="border rounded p-3"><div className="flex justify-between text-xs text-muted-foreground"><span>{c.authorName}</span><span>{c.type}</span></div><p className="text-sm mt-2">{c.content}</p>{c.resolvedAt ? <Badge variant="outline" className="mt-2">Resolved</Badge> : isMinutesEditor ? <Button className="mt-2" size="sm" variant="outline" onClick={async () => { await fetch(`/api/meetings/${meetingId}/minutes/comments/${c.id}/resolve?tenantId=${tenantId}`, { method: 'POST', headers: authHeaders, body: JSON.stringify({}) }); await fetchReviewAndComments(); }}>Resolve</Button> : null}</div>)}
            <Textarea value={commentContent} onChange={(e) => setCommentContent(e.target.value)} placeholder="Skriv kommentar" />
            <select className="w-full border rounded p-2 text-sm" value={commentType} onChange={(e) => setCommentType(e.target.value as 'comment' | 'change_request')}><option value="comment">Comment</option><option value="change_request">Change request</option></select>
            <Button onClick={submitComment}>Add comment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {minutes.status !== 'draft' && <SignaturePanel signatures={minutes.signatures} onSign={async (role) => onSign(currentUserId, role)} currentUserId={currentUserId} isLoading={isLoading} />}
    </div>
  );
}

export default MeetingMinutesEditor;

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';

interface SignatureCaseResponse {
  case: {
    id: string;
    title: string;
    status: string;
    signingOrder: string;
    expiresAt?: { toDate?: () => Date };
    signers: Array<{ id: string; name: string; email: string; status: string; signedAt?: { toDate?: () => Date } }>;
    events: Array<{ id: string; type: string; createdAt?: { toDate?: () => Date } }>;
  }
}

export default function SignatureCasePage() {
  const { user } = useAuth();
  const params = useParams();
  const tenantId = params.tenantId as string;
  const caseId = params.caseId as string;
  const [data, setData] = useState<SignatureCaseResponse['case'] | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/signature-cases/${caseId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const body: SignatureCaseResponse = await res.json();
    setData(body.case);
  }, [user, caseId]);

  useEffect(() => { load(); }, [load]);

  const runAction = async (path: string, payload?: Record<string, unknown>) => {
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload || {}),
    });
    await load();
  };

  if (!data) return <p>Loading signature case…</p>;

  const mySigner = data.signers.find((signer) => signer.id === user?.uid);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{data.title}</CardTitle>
          <div className="flex gap-2">
            <Badge>{data.status}</Badge>
            <Badge variant="outline">{data.signingOrder}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex gap-2">
          {data.status === 'draft' && <Button onClick={() => runAction(`/api/signature-cases/${caseId}/start`)}>Start</Button>}
          {data.status === 'in_progress' && <Button variant="outline" onClick={() => runAction(`/api/signature-cases/${caseId}/remind`)}>Send reminder</Button>}
          {['draft', 'in_progress'].includes(data.status) && <Button variant="destructive" onClick={() => runAction(`/api/signature-cases/${caseId}/cancel`)}>Cancel</Button>}
          {mySigner?.status === 'ready' && (
            <Button
              onClick={async () => {
                if (!user) return;
                const token = await user.getIdToken();
                const init = await fetch(`/api/signature-cases/${caseId}/sign/init`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ tenantId }),
                });
                const initBody = await init.json();
                await runAction(`/api/signature-cases/${caseId}/sign/collect`, { tenantId, orderRef: initBody.orderRef });
              }}
            >
              Sign now
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Signers</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.signers.map((signer) => (
            <div key={signer.id} className="flex items-center justify-between rounded border p-2">
              <div>
                <p className="font-medium">{signer.name}</p>
                <p className="text-xs text-muted-foreground">{signer.email}</p>
              </div>
              <Badge variant="outline">{signer.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.events.map((event) => (
            <div key={event.id} className="text-sm rounded border p-2">
              <strong>{event.type}</strong> · {event.createdAt?.toDate?.().toLocaleString?.() || '-'}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { collections, db } from '@/lib/firebase';
import { collectionGroup, getDoc, getDocs, query, where } from 'firebase/firestore';

interface InboxItem {
  id: string;
  title: string;
  status: string;
  createdAt?: { toDate?: () => Date };
}

export default function SignatureInboxPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const tenantId = params.tenantId as string;
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user || !db) return;
      setLoading(true);
      const signerSnaps = await getDocs(query(collectionGroup(db, 'signers'), where('userId', '==', user.uid), where('status', 'in', ['ready', 'pending'])));
      const cases: InboxItem[] = [];
      for (const signer of signerSnaps.docs) {
        const data = signer.data() as { userId: string; status: string };
        const caseId = signer.ref.parent.parent?.id;
        if (!caseId) continue;
        const caseDoc = await getDoc(collections.signatureCase(caseId));
        if (!caseDoc.exists() || caseDoc.data().tenantId !== tenantId) continue;
        cases.push({ id: caseId, title: caseDoc.data().title, status: data.status, createdAt: caseDoc.data().createdAt });
      }
      setItems(cases);
      setLoading(false);
    }

    load();
  }, [tenantId, user]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Needs my signature</h1>
      <Card>
        <CardHeader>
          <CardTitle>Action required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">No signature cases right now.</p>}
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.createdAt?.toDate?.().toLocaleString?.() || '-'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{item.status}</Badge>
                <Button size="sm" onClick={() => router.push(`/dashboard/${tenantId}/signature-cases/${item.id}`)}>Open</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

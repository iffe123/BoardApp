'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const contentTypes = [
  { id: 'minutes', label: 'Minutes' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'voting_logs', label: 'Voting logs' },
  { id: 'action_log', label: 'Action log' },
  { id: 'signature_cases', label: 'Signature cases' },
  { id: 'audit_events', label: 'Audit events' },
] as const;

export default function ExitModePage({ params }: { params: { tenantId: string } }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [boardrooms, setBoardrooms] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['minutes', 'decisions']);
  const [result, setResult] = useState<{ exportId: string; checksum: string } | null>(null);

  async function onGenerate() {
    const response = await fetch('/api/exports/exit-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: params.tenantId,
        from,
        to,
        boardrooms: boardrooms.split(',').map((value) => value.trim()).filter(Boolean),
        contentTypes: selectedTypes,
      }),
    });

    if (!response.ok) return;
    const data = await response.json();
    setResult({ exportId: data.exportId, checksum: data.checksum });
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Exit Mode</h1>
      <Card className="space-y-4 p-6">
        <div className="space-y-2">
          <Label>1) Select time range</Label>
          <div className="grid grid-cols-2 gap-4">
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>2) Select boardrooms (optional)</Label>
          <Input placeholder="boardroom-1, boardroom-2" value={boardrooms} onChange={(event) => setBoardrooms(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>3) Select content types</Label>
          <div className="grid grid-cols-2 gap-2">
            {contentTypes.map((type) => (
              <label key={type.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type.id)}
                  onChange={(event) => {
                    setSelectedTypes((prev) => event.target.checked ? [...prev, type.id] : prev.filter((item) => item !== type.id));
                  }}
                />
                {type.label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={onGenerate}>4) Generate export</Button>
          {result ? (
            <Button asChild variant="outline">
              <a href={`/api/exports/exit-mode/${result.exportId}?tenantId=${params.tenantId}`}>5) Download ZIP</a>
            </Button>
          ) : null}
        </div>
        {result ? <p className="text-sm text-muted-foreground">Export ready. Checksum: {result.checksum}</p> : null}
      </Card>
    </div>
  );
}

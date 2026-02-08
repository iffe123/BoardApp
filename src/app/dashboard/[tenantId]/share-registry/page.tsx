'use client';

/**
 * Share Registry (Aktiebok) Page
 *
 * Main page for managing the digital share registry with cap table
 * visualization, shareholder management, and transaction history.
 * Required by Aktiebolagslagen 5 kap.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { BookOpen, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, usePermissions } from '@/contexts/auth-context';
import { CapTableView } from '@/components/shares/cap-table-view';
import { ShareholderList } from '@/components/shares/shareholder-list';
import { TransactionForm } from '@/components/shares/transaction-form';
import type { TransactionFormData } from '@/components/shares/transaction-form';
import { ShareRegistryExport } from '@/components/shares/share-registry-export';
import type { CapTableSummary, Shareholder, ShareTransaction } from '@/types/schema';

export default function ShareRegistryPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  useAuth();
  const permissions = usePermissions();
  const isAdmin = permissions.isAdmin;

  const [capTable, setCapTable] = useState<CapTableSummary | null>(null);
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [transactions, setTransactions] = useState<ShareTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    // Get the current user's ID token from Firebase Auth
    const { auth } = await import('@/lib/firebase');
    const currentUser = auth.currentUser;
    if (!currentUser) return {};
    const token = await currentUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();

      const [capTableRes, shareholdersRes, transactionsRes] = await Promise.all([
        fetch(`/api/shares/cap-table?tenantId=${tenantId}`, { headers }),
        fetch(`/api/shareholders?tenantId=${tenantId}`, { headers }),
        fetch(`/api/shares/transactions?tenantId=${tenantId}`, { headers }),
      ]);

      if (capTableRes.ok) {
        setCapTable(await capTableRes.json());
      }
      if (shareholdersRes.ok) {
        const data = await shareholdersRes.json();
        setShareholders(data.shareholders);
      }
      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Failed to load share registry data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, getAuthHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateShareholder = async (data: {
    name: string;
    type: 'individual' | 'company' | 'fund';
    organizationNumber?: string;
    email?: string;
    address?: { street: string; city: string; postalCode: string; country: string };
  }) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/shareholders', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, ...data }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create shareholder');
    }

    await fetchData();
  };

  const handleUpdateShareholder = async (id: string, data: Record<string, unknown>) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/shareholders/${id}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, ...data }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update shareholder');
    }

    await fetchData();
  };

  const handleDeleteShareholder = async (id: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/shareholders/${id}?tenantId=${tenantId}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete shareholder');
    }

    await fetchData();
  };

  const handleCreateTransaction = async (data: TransactionFormData) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/shares/transactions', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, ...data }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create transaction');
    }

    await fetchData();
  };

  const handleExport = async (format: 'csv' | 'json') => {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `/api/shares/export?tenantId=${tenantId}&format=${format}`,
      { headers }
    );

    if (!res.ok) {
      throw new Error('Failed to export');
    }

    if (format === 'csv') {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aktiebok-${tenantId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aktiebok-${tenantId}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Aktiebok</h1>
            <p className="text-muted-foreground">Laddar...</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Aktiebok</h1>
            <p className="text-muted-foreground">
              Digital aktiebok enligt Aktiebolagslagen 5 kap.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Uppdatera
          </Button>
          <ShareRegistryExport tenantId={tenantId} onExport={handleExport} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="shareholders">Aktieägare</TabsTrigger>
          <TabsTrigger value="transactions">Transaktioner</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {capTable && <CapTableView capTable={capTable} />}
          {!capTable && (
            <div className="py-12 text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Aktieboken är tom</h3>
              <p>Börja med att lägga till aktieägare och registrera transaktioner.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="shareholders" className="mt-6">
          <ShareholderList
            shareholders={shareholders}
            onCreateShareholder={handleCreateShareholder}
            onUpdateShareholder={handleUpdateShareholder}
            onDeleteShareholder={handleDeleteShareholder}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <TransactionForm
            shareholders={shareholders}
            transactions={transactions}
            onCreateTransaction={handleCreateTransaction}
            isAdmin={isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

/**
 * Share Transaction Form
 *
 * Form for creating new share transactions (founding, new issue, transfer, etc.)
 */

import React, { useState } from 'react';
import { Plus, ArrowRightLeft, TrendingUp, Scissors, ArrowDownToLine, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/utils';
import type { Shareholder, ShareClass, ShareTransactionType, ShareTransaction } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

interface TransactionFormProps {
  shareholders: Shareholder[];
  transactions: ShareTransaction[];
  onCreateTransaction: (data: TransactionFormData) => Promise<void>;
  isAdmin: boolean;
}

export interface TransactionFormData {
  type: ShareTransactionType;
  date: string;
  description: string;
  fromShareholderId?: string;
  toShareholderId: string;
  shareClass: ShareClass;
  numberOfShares: number;
  shareNumberFrom: number;
  shareNumberTo: number;
  pricePerShare?: number;
  totalAmount?: number;
  nominalValue: number;
  votesPerShare: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const transactionTypeConfig: Record<
  ShareTransactionType,
  { label: string; icon: React.ReactNode; description: string; needsFrom: boolean }
> = {
  founding: {
    label: 'Bildande',
    icon: <Plus className="h-4 w-4" />,
    description: 'Aktier vid bolagsbildning',
    needsFrom: false,
  },
  new_issue: {
    label: 'Nyemission',
    icon: <TrendingUp className="h-4 w-4" />,
    description: 'Emission av nya aktier',
    needsFrom: false,
  },
  transfer: {
    label: 'Överlåtelse',
    icon: <ArrowRightLeft className="h-4 w-4" />,
    description: 'Överlåtelse mellan aktieägare',
    needsFrom: true,
  },
  split: {
    label: 'Split',
    icon: <Scissors className="h-4 w-4" />,
    description: 'Aktiesplit',
    needsFrom: false,
  },
  redemption: {
    label: 'Inlösen',
    icon: <ArrowDownToLine className="h-4 w-4" />,
    description: 'Inlösen av aktier',
    needsFrom: true,
  },
  bonus_issue: {
    label: 'Fondemission',
    icon: <Gift className="h-4 w-4" />,
    description: 'Fondemission av nya aktier',
    needsFrom: false,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function TransactionForm({
  shareholders,
  transactions,
  onCreateTransaction,
  isAdmin,
}: TransactionFormProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'founding',
    date: new Date().toISOString().split('T')[0]!,
    description: '',
    toShareholderId: '',
    shareClass: 'common',
    numberOfShares: 0,
    shareNumberFrom: 1,
    shareNumberTo: 0,
    nominalValue: 1,
    votesPerShare: 1,
  });

  const currentConfig = transactionTypeConfig[formData.type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onCreateTransaction(formData);
      setDialogOpen(false);
      // Reset form
      setFormData({
        type: 'founding',
        date: new Date().toISOString().split('T')[0]!,
        description: '',
        toShareholderId: '',
        shareClass: 'common',
        numberOfShares: 0,
        shareNumberFrom: 1,
        shareNumberTo: 0,
        nominalValue: 1,
        votesPerShare: 1,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateShareCount = (from: number, to: number) => {
    setFormData({
      ...formData,
      shareNumberFrom: from,
      shareNumberTo: to,
      numberOfShares: Math.max(0, to - from + 1),
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaktioner</CardTitle>
              <CardDescription>
                {transactions.length} registrerade transaktioner
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ny transaktion
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Datum</th>
                  <th className="text-left py-3 px-2 font-medium">Typ</th>
                  <th className="text-left py-3 px-2 font-medium">Beskrivning</th>
                  <th className="text-left py-3 px-2 font-medium">Aktieslag</th>
                  <th className="text-right py-3 px-2 font-medium">Antal</th>
                  <th className="text-right py-3 px-2 font-medium">Aktienr</th>
                  <th className="text-right py-3 px-2 font-medium">Pris/aktie</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const date = tx.date && 'toDate' in tx.date
                    ? tx.date.toDate().toLocaleDateString('sv-SE')
                    : '';
                  const config = transactionTypeConfig[tx.type];
                  return (
                    <tr key={tx.id} className="border-b last:border-0">
                      <td className="py-3 px-2">{date}</td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="gap-1">
                          {config?.icon}
                          {config?.label || tx.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 max-w-[200px] truncate">{tx.description}</td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary">{tx.shareClass}</Badge>
                      </td>
                      <td className="py-3 px-2 text-right">{formatNumber(tx.numberOfShares)}</td>
                      <td className="py-3 px-2 text-right">
                        {tx.shareNumberFrom}–{tx.shareNumberTo}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {tx.pricePerShare != null ? `${formatNumber(tx.pricePerShare)} SEK` : '–'}
                      </td>
                    </tr>
                  );
                })}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Inga transaktioner registrerade.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ny transaktion</DialogTitle>
            <DialogDescription>
              Registrera en ny aktietransaktion i aktieboken.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>Transaktionstyp *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: ShareTransactionType) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(transactionTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {config.icon}
                        <span>{config.label}</span>
                        <span className="text-muted-foreground text-xs">— {config.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Datum *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            {/* From Shareholder (for transfers/redemptions) */}
            {currentConfig.needsFrom && (
              <div className="space-y-2">
                <Label>Från aktieägare *</Label>
                <Select
                  value={formData.fromShareholderId || ''}
                  onValueChange={(value) => setFormData({ ...formData, fromShareholderId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj aktieägare..." />
                  </SelectTrigger>
                  <SelectContent>
                    {shareholders.map((sh) => (
                      <SelectItem key={sh.id} value={sh.id}>
                        {sh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* To Shareholder */}
            <div className="space-y-2">
              <Label>Till aktieägare *</Label>
              <Select
                value={formData.toShareholderId}
                onValueChange={(value) => setFormData({ ...formData, toShareholderId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj aktieägare..." />
                </SelectTrigger>
                <SelectContent>
                  {shareholders.map((sh) => (
                    <SelectItem key={sh.id} value={sh.id}>
                      {sh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Share Class */}
            <div className="space-y-2">
              <Label>Aktieslag *</Label>
              <Select
                value={formData.shareClass}
                onValueChange={(value: ShareClass) => setFormData({ ...formData, shareClass: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">Stamaktie</SelectItem>
                  <SelectItem value="A">A-aktie</SelectItem>
                  <SelectItem value="B">B-aktie</SelectItem>
                  <SelectItem value="C">C-aktie</SelectItem>
                  <SelectItem value="preference">Preferensaktie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Share Numbers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shareFrom">Aktienummer från *</Label>
                <Input
                  id="shareFrom"
                  type="number"
                  min={1}
                  value={formData.shareNumberFrom || ''}
                  onChange={(e) => updateShareCount(Number(e.target.value), formData.shareNumberTo)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shareTo">Aktienummer till *</Label>
                <Input
                  id="shareTo"
                  type="number"
                  min={formData.shareNumberFrom}
                  value={formData.shareNumberTo || ''}
                  onChange={(e) => updateShareCount(formData.shareNumberFrom, Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {formData.numberOfShares > 0 && (
              <p className="text-sm text-muted-foreground">
                Antal aktier: <span className="font-medium">{formatNumber(formData.numberOfShares)}</span>
              </p>
            )}

            {/* Nominal Value and Votes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nominalValue">Kvotvärde (SEK) *</Label>
                <Input
                  id="nominalValue"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={formData.nominalValue || ''}
                  onChange={(e) => setFormData({ ...formData, nominalValue: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="votesPerShare">Röster per aktie *</Label>
                <Input
                  id="votesPerShare"
                  type="number"
                  min={0}
                  step={1}
                  value={formData.votesPerShare || ''}
                  onChange={(e) => setFormData({ ...formData, votesPerShare: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            {/* Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pricePerShare">Pris per aktie (SEK)</Label>
                <Input
                  id="pricePerShare"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.pricePerShare ?? ''}
                  onChange={(e) => {
                    const price = e.target.value ? Number(e.target.value) : undefined;
                    setFormData({
                      ...formData,
                      pricePerShare: price,
                      totalAmount: price != null ? price * formData.numberOfShares : undefined,
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Totalt belopp (SEK)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.totalAmount ?? ''}
                  onChange={(e) =>
                    setFormData({ ...formData, totalAmount: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Beskrivning *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Beskrivning av transaktionen..."
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !formData.toShareholderId ||
                  !formData.numberOfShares ||
                  !formData.description
                }
              >
                {isSubmitting ? 'Registrerar...' : 'Registrera transaktion'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TransactionForm;

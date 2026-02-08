'use client';

/**
 * Shareholder List Component
 *
 * CRUD interface for managing shareholders in the Aktiebok.
 */

import React, { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Building2,
  User,
  Landmark,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Shareholder } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

interface ShareholderListProps {
  shareholders: Shareholder[];
  onCreateShareholder: (data: ShareholderFormData) => Promise<void>;
  onUpdateShareholder: (id: string, data: Partial<ShareholderFormData>) => Promise<void>;
  onDeleteShareholder: (id: string) => Promise<void>;
  isAdmin: boolean;
}

interface ShareholderFormData {
  name: string;
  type: 'individual' | 'company' | 'fund';
  organizationNumber?: string;
  email?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

// ============================================================================
// FORM DIALOG
// ============================================================================

interface ShareholderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShareholderFormData) => Promise<void>;
  initialData?: Partial<ShareholderFormData>;
  title: string;
  description: string;
}

function ShareholderFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title,
  description,
}: ShareholderFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ShareholderFormData>({
    name: initialData?.name || '',
    type: initialData?.type || 'individual',
    organizationNumber: initialData?.organizationNumber || '',
    email: initialData?.email || '',
    address: initialData?.address || {
      street: '',
      city: '',
      postalCode: '',
      country: 'Sverige',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Namn *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Namn på aktieägare"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Typ *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'individual' | 'company' | 'fund') =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Privatperson</SelectItem>
                <SelectItem value="company">Företag</SelectItem>
                <SelectItem value="fund">Fond</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgNumber">
              {formData.type === 'individual' ? 'Personnummer' : 'Organisationsnummer'}
            </Label>
            <Input
              id="orgNumber"
              value={formData.organizationNumber || ''}
              onChange={(e) => setFormData({ ...formData, organizationNumber: e.target.value })}
              placeholder={formData.type === 'individual' ? 'YYYYMMDD-XXXX' : '556XXX-XXXX'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-post</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="namn@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Adress</Label>
            <div className="grid gap-2">
              <Input
                value={formData.address?.street || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address!, street: e.target.value },
                  })
                }
                placeholder="Gatuadress"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={formData.address?.postalCode || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address!, postalCode: e.target.value },
                    })
                  }
                  placeholder="Postnummer"
                />
                <Input
                  value={formData.address?.city || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address!, city: e.target.value },
                    })
                  }
                  placeholder="Ort"
                />
              </div>
              <Input
                value={formData.address?.country || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address!, country: e.target.value },
                  })
                }
                placeholder="Land"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name}>
              {isSubmitting ? 'Sparar...' : 'Spara'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const typeIcons = {
  individual: <User className="h-4 w-4" />,
  company: <Building2 className="h-4 w-4" />,
  fund: <Landmark className="h-4 w-4" />,
};

const typeLabels = {
  individual: 'Privatperson',
  company: 'Företag',
  fund: 'Fond',
};

export function ShareholderList({
  shareholders,
  onCreateShareholder,
  onUpdateShareholder,
  onDeleteShareholder,
  isAdmin,
}: ShareholderListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredShareholders = shareholders.filter((sh) =>
    sh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sh.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sh.organizationNumber?.includes(searchQuery)
  );

  const editingShareholder = shareholders.find((sh) => sh.id === editingId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Aktieägare</CardTitle>
            <CardDescription>
              {shareholders.length} registrerade aktieägare
            </CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ny aktieägare
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sök aktieägare..."
            className="pl-9"
          />
        </div>

        {/* List */}
        <div className="space-y-2">
          {filteredShareholders.map((sh) => (
            <div
              key={sh.id}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {typeIcons[sh.type]}
                </div>
                <div>
                  <p className="font-medium">{sh.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[sh.type]}
                    </Badge>
                    {sh.organizationNumber && (
                      <span>{sh.organizationNumber}</span>
                    )}
                    {sh.email && <span>{sh.email}</span>}
                  </div>
                </div>
              </div>

              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingId(sh.id)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Redigera
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeleteShareholder(sh.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Ta bort
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}

          {filteredShareholders.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              {searchQuery
                ? 'Inga aktieägare matchar din sökning.'
                : 'Inga aktieägare registrerade. Klicka "Ny aktieägare" för att börja.'}
            </div>
          )}
        </div>
      </CardContent>

      {/* Create Dialog */}
      <ShareholderFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={onCreateShareholder}
        title="Ny aktieägare"
        description="Lägg till en ny aktieägare i aktieboken."
      />

      {/* Edit Dialog */}
      {editingShareholder && (
        <ShareholderFormDialog
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          onSubmit={(data) => onUpdateShareholder(editingId!, data)}
          initialData={{
            name: editingShareholder.name,
            type: editingShareholder.type,
            organizationNumber: editingShareholder.organizationNumber,
            email: editingShareholder.email,
            address: editingShareholder.address,
          }}
          title="Redigera aktieägare"
          description="Uppdatera aktieägarens uppgifter."
        />
      )}
    </Card>
  );
}

export default ShareholderList;

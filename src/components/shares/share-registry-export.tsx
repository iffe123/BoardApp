'use client';

/**
 * Share Registry Export Component
 *
 * Dialog for exporting the Aktiebok in various formats (CSV, PDF).
 */

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Label } from '@/components/ui/label';

// ============================================================================
// TYPES
// ============================================================================

interface ShareRegistryExportProps {
  tenantId: string;
  onExport: (format: 'csv' | 'json') => Promise<void>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ShareRegistryExport({ onExport }: ShareRegistryExportProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(format);
      setDialogOpen(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        <Download className="h-4 w-4 mr-2" />
        Exportera
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Exportera aktiebok</DialogTitle>
            <DialogDescription>
              Exportera aktieboken med ägarförteckning och transaktionshistorik.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v: 'csv' | 'json') => setFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV (Excel-kompatibel)
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      JSON (strukturerad data)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? 'Exporterar...' : 'Exportera'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ShareRegistryExport;

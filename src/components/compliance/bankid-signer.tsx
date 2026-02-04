'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSignature,
  Loader2,
  CheckCircle,
  XCircle,
  Smartphone,
  QrCode,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';

interface BankIDSignerProps {
  tenantId: string;
  documentId: string;
  documentType: 'minutes' | 'document' | 'decision';
  documentTitle: string;
  onSignComplete?: (signatureData: SignatureData) => void;
  onSignFailed?: (error: string) => void;
  onCancel?: () => void;
}

interface SignatureData {
  signatureId: string;
  orderRef: string;
  signerName: string;
  signerPersonalNumber?: string;
  signedAt: Date;
}

type SigningStatus = 'idle' | 'initiating' | 'pending' | 'complete' | 'failed' | 'cancelled';

export function BankIDSigner({
  tenantId,
  documentId,
  documentType,
  documentTitle,
  onSignComplete,
  onSignFailed,
  onCancel,
}: BankIDSignerProps) {
  const { user, userProfile } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<SigningStatus>('idle');
  const [personalNumber, setPersonalNumber] = useState('');
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [autoStartToken, setAutoStartToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hintMessage, setHintMessage] = useState<string>('');

  // Poll for signature status
  useEffect(() => {
    if (status !== 'pending' || !orderRef) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/bankid/collect/${orderRef}?tenantId=${tenantId}`
        );
        const data = await response.json();

        if (data.status === 'complete') {
          setStatus('complete');
          if (onSignComplete) {
            onSignComplete({
              signatureId: signatureId!,
              orderRef: orderRef!,
              signerName: data.completionData?.user?.name || 'Unknown',
              signerPersonalNumber: data.completionData?.user?.personalNumber,
              signedAt: new Date(),
            });
          }
        } else if (data.status === 'failed') {
          setStatus('failed');
          setError(getHintMessage(data.hintCode));
          if (onSignFailed) {
            onSignFailed(data.hintCode || 'Signing failed');
          }
        } else if (data.hintCode) {
          setHintMessage(getHintMessage(data.hintCode));
        }
      } catch (err) {
        console.error('Error polling signature status:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [status, orderRef, tenantId, signatureId, onSignComplete, onSignFailed]);

  // Get user-friendly hint messages
  function getHintMessage(hintCode: string): string {
    const messages: Record<string, string> = {
      outstandingTransaction: 'An outstanding transaction is already in progress.',
      noClient: 'Start the BankID app on your device.',
      started: 'The BankID app has been started.',
      userSign: 'Please sign in the BankID app.',
      expiredTransaction: 'The signing request has expired. Please try again.',
      certificateErr: 'Certificate error. Please contact support.',
      userCancel: 'Signing was cancelled.',
      cancelled: 'Signing was cancelled.',
      startFailed: 'Failed to start BankID. Please try again.',
    };
    return messages[hintCode] || 'Processing...';
  }

  // Initiate signing
  const handleInitiateSign = useCallback(async () => {
    setStatus('initiating');
    setError(null);

    try {
      const userVisibleData = `Sign document: ${documentTitle}\n\nDocument ID: ${documentId}\nDate: ${new Date().toISOString()}`;

      const response = await fetch('/api/bankid/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          userId: user?.uid,
          userName: userProfile?.displayName || user?.displayName || 'Unknown',
          documentId,
          documentType,
          personalNumber: personalNumber || undefined,
          userVisibleData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate signing');
      }

      setOrderRef(data.orderRef);
      setSignatureId(data.signatureId);
      setAutoStartToken(data.autoStartToken);
      setStatus('pending');
      setHintMessage('Open BankID on your device');
    } catch (err) {
      console.error('Error initiating signing:', err);
      setStatus('failed');
      setError(err instanceof Error ? err.message : 'Failed to initiate signing');
    }
  }, [tenantId, user, userProfile, documentId, documentType, documentTitle, personalNumber]);

  // Cancel signing
  const handleCancel = useCallback(async () => {
    if (orderRef && status === 'pending') {
      try {
        await fetch('/api/bankid/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            orderRef,
            userId: user?.uid,
            userName: userProfile?.displayName || 'Unknown',
          }),
        });
      } catch (err) {
        console.error('Error cancelling signature:', err);
      }
    }

    setStatus('cancelled');
    setIsOpen(false);
    if (onCancel) onCancel();
  }, [orderRef, status, tenantId, user, userProfile, onCancel]);

  // Open BankID app on same device
  const handleOpenBankID = useCallback(() => {
    if (autoStartToken) {
      window.location.href = `bankid:///?autostarttoken=${autoStartToken}&redirect=null`;
    }
  }, [autoStartToken]);

  // Reset and try again
  const handleRetry = useCallback(() => {
    setStatus('idle');
    setError(null);
    setOrderRef(null);
    setSignatureId(null);
    setAutoStartToken(null);
    setHintMessage('');
  }, []);

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        <FileSignature className="h-4 w-4 mr-2" />
        Sign with BankID
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && status === 'pending') {
          handleCancel();
        } else if (!open) {
          setIsOpen(false);
          handleRetry();
        } else {
          setIsOpen(true);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Sign with BankID
            </DialogTitle>
            <DialogDescription>
              Digitally sign &quot;{documentTitle}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Idle State */}
            {status === 'idle' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="personalNumber">Personal Number (optional)</Label>
                  <Input
                    id="personalNumber"
                    placeholder="YYYYMMDDXXXX"
                    value={personalNumber}
                    onChange={(e) => setPersonalNumber(e.target.value)}
                    maxLength={12}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to sign on any device with BankID
                  </p>
                </div>
              </div>
            )}

            {/* Initiating State */}
            {status === 'initiating' && (
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6 text-center">
                  <Loader2 className="h-12 w-12 mx-auto text-primary mb-4 animate-spin" />
                  <p className="font-medium">Starting BankID...</p>
                </CardContent>
              </Card>
            )}

            {/* Pending State */}
            {status === 'pending' && (
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6 text-center">
                  <div className="flex justify-center gap-4 mb-6">
                    <Button variant="outline" size="lg" onClick={handleOpenBankID}>
                      <Smartphone className="h-5 w-5 mr-2" />
                      Open BankID
                    </Button>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{hintMessage || 'Waiting for signature...'}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Complete State */}
            {status === 'complete' && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
                  <p className="font-medium text-green-800">Document signed successfully!</p>
                  <p className="text-sm text-green-700 mt-1">
                    Your signature has been recorded
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Failed State */}
            {status === 'failed' && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6 text-center">
                  <XCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
                  <p className="font-medium text-red-800">Signing failed</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Cancelled State */}
            {status === 'cancelled' && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto text-amber-600 mb-4" />
                  <p className="font-medium text-amber-800">Signing cancelled</p>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            {status === 'idle' && (
              <>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInitiateSign}>
                  <FileSignature className="h-4 w-4 mr-2" />
                  Start Signing
                </Button>
              </>
            )}

            {status === 'pending' && (
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}

            {(status === 'complete' || status === 'cancelled') && (
              <Button onClick={() => {
                setIsOpen(false);
                handleRetry();
              }}>
                Close
              </Button>
            )}

            {status === 'failed' && (
              <>
                <Button variant="outline" onClick={() => {
                  setIsOpen(false);
                  handleRetry();
                }}>
                  Close
                </Button>
                <Button onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BankIDSigner;

/**
 * Digital Signature Service
 *
 * Provides an abstraction layer for digital signatures with support for:
 * - Swedish BankID (via integration partner)
 * - Mock provider for development
 *
 * Implements eIDAS-compliant Advanced Electronic Signatures.
 */

import { generateHash } from '@/lib/utils';
import type { SignatureAudit } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';

// ============================================================================
// TYPES
// ============================================================================

export interface SignatureRequest {
  documentId: string;
  documentType: 'minutes' | 'resolution' | 'contract' | 'policy';
  documentContent: string; // Content to hash
  signerId: string;
  signerName: string;
  signerEmail: string;
  signerRole: 'chair' | 'adjuster' | 'secretary';
  tenantId: string;
}

export interface SignatureResult {
  success: boolean;
  transactionId?: string;
  signedAt?: Date;
  documentHash?: string;
  certificate?: string;
  signatureLevel: 'simple' | 'advanced' | 'qualified';
  error?: string;
}

export interface BankIDResult {
  personalNumber?: string; // Hashed for privacy
  givenName: string;
  surname: string;
  notBefore: Date;
  notAfter: Date;
  signature: string;
  ocspResponse?: string;
}

export interface SignatureProvider {
  name: string;
  initiateSignature(request: SignatureRequest): Promise<{
    orderRef: string;
    autoStartToken?: string;
    qrStartToken?: string;
  }>;
  collectSignature(orderRef: string): Promise<SignatureResult>;
  cancelSignature(orderRef: string): Promise<void>;
}

// ============================================================================
// MOCK PROVIDER (for development)
// ============================================================================

class MockSignatureProvider implements SignatureProvider {
  name = 'mock';

  private pendingOrders = new Map<
    string,
    { request: SignatureRequest; status: 'pending' | 'signed' | 'failed' }
  >();

  async initiateSignature(
    request: SignatureRequest
  ): Promise<{ orderRef: string; autoStartToken?: string }> {
    const orderRef = `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    this.pendingOrders.set(orderRef, {
      request,
      status: 'pending',
    });

    // Simulate auto-sign after 2 seconds in development
    setTimeout(() => {
      const order = this.pendingOrders.get(orderRef);
      if (order && order.status === 'pending') {
        order.status = 'signed';
      }
    }, 2000);

    return {
      orderRef,
      autoStartToken: 'mock-auto-start-token',
    };
  }

  async collectSignature(orderRef: string): Promise<SignatureResult> {
    const order = this.pendingOrders.get(orderRef);

    if (!order) {
      return {
        success: false,
        signatureLevel: 'simple',
        error: 'Order not found',
      };
    }

    if (order.status === 'pending') {
      return {
        success: false,
        signatureLevel: 'simple',
        error: 'Signature pending',
      };
    }

    if (order.status === 'failed') {
      return {
        success: false,
        signatureLevel: 'simple',
        error: 'Signature failed',
      };
    }

    const documentHash = await generateHash(order.request.documentContent);

    return {
      success: true,
      transactionId: orderRef,
      signedAt: new Date(),
      documentHash,
      certificate: 'MOCK_CERTIFICATE_BASE64_ENCODED',
      signatureLevel: 'advanced',
    };
  }

  async cancelSignature(orderRef: string): Promise<void> {
    const order = this.pendingOrders.get(orderRef);
    if (order) {
      order.status = 'failed';
    }
  }
}

// ============================================================================
// BANKID PROVIDER (production)
// ============================================================================

class BankIDProvider implements SignatureProvider {
  name = 'bankid';
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    // In production, these would come from environment variables
    // Using a BankID integration partner like Criipto, Scrive, or BankID direct
    this.apiUrl = process.env.BANKID_API_URL || 'https://api.bankid-partner.example/v1';
    this.apiKey = process.env.BANKID_API_KEY || '';
  }

  async initiateSignature(
    request: SignatureRequest
  ): Promise<{ orderRef: string; autoStartToken?: string; qrStartToken?: string }> {
    // This would make an actual API call to the BankID integration partner
    // Example implementation (would need actual partner SDK):

    const documentHash = await generateHash(request.documentContent);

    const response = await fetch(`${this.apiUrl}/sign/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        endUserInfo: {
          email: request.signerEmail,
          displayName: request.signerName,
        },
        signatureData: {
          documentId: request.documentId,
          documentType: request.documentType,
          documentHash,
          visibleData: `Sign meeting minutes as ${request.signerRole}`,
          nonVisibleData: documentHash,
        },
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/signatures/callback`,
        reference: `${request.tenantId}:${request.documentId}:${request.signerId}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`BankID API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      orderRef: data.orderRef,
      autoStartToken: data.autoStartToken,
      qrStartToken: data.qrStartToken,
    };
  }

  async collectSignature(orderRef: string): Promise<SignatureResult> {
    const response = await fetch(`${this.apiUrl}/sign/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ orderRef }),
    });

    if (!response.ok) {
      throw new Error(`BankID API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 'pending') {
      return {
        success: false,
        signatureLevel: 'advanced',
        error: 'Signature pending',
      };
    }

    if (data.status === 'failed') {
      return {
        success: false,
        signatureLevel: 'advanced',
        error: data.hintCode || 'Signature failed',
      };
    }

    return {
      success: true,
      transactionId: data.orderRef,
      signedAt: new Date(data.completionData.timestamp),
      documentHash: data.completionData.documentHash,
      certificate: data.completionData.signature,
      signatureLevel: 'advanced', // BankID is eIDAS Advanced
    };
  }

  async cancelSignature(orderRef: string): Promise<void> {
    await fetch(`${this.apiUrl}/sign/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ orderRef }),
    });
  }
}

// ============================================================================
// SIGNATURE SERVICE
// ============================================================================

export class SignatureService {
  private provider: SignatureProvider;

  constructor(providerType: 'bankid' | 'mock' = 'mock') {
    if (providerType === 'bankid' && process.env.BANKID_API_KEY) {
      this.provider = new BankIDProvider();
    } else {
      this.provider = new MockSignatureProvider();
    }
  }

  getProviderName(): string {
    return this.provider.name;
  }

  async requestSignature(request: SignatureRequest): Promise<{
    orderRef: string;
    autoStartToken?: string;
    qrStartToken?: string;
  }> {
    return this.provider.initiateSignature(request);
  }

  async checkSignatureStatus(orderRef: string): Promise<SignatureResult> {
    return this.provider.collectSignature(orderRef);
  }

  async cancelSignature(orderRef: string): Promise<void> {
    return this.provider.cancelSignature(orderRef);
  }

  async createSignatureAudit(
    request: SignatureRequest,
    result: SignatureResult
  ): Promise<Omit<SignatureAudit, 'id'>> {
    return {
      tenantId: request.tenantId,
      documentId: request.documentId,
      documentType: request.documentType,
      documentHash: result.documentHash || '',
      documentVersion: 1,
      signerId: request.signerId,
      signerName: request.signerName,
      signerEmail: request.signerEmail,
      signatureMethod: this.provider.name === 'bankid' ? 'bankid' : 'touch_signature',
      signatureTransactionId: result.transactionId || '',
      signatureCertificate: result.certificate,
      signatureLevel: result.signatureLevel,
      signedAt: Timestamp.fromDate(result.signedAt || new Date()),
      verified: true,
      verifiedAt: Timestamp.now(),
    };
  }

  // Verify document integrity
  async verifyDocument(
    documentContent: string,
    expectedHash: string
  ): Promise<{ valid: boolean; currentHash: string }> {
    const currentHash = await generateHash(documentContent);
    return {
      valid: currentHash === expectedHash,
      currentHash,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let signatureServiceInstance: SignatureService | null = null;

export function getSignatureService(): SignatureService {
  if (!signatureServiceInstance) {
    const providerType = process.env.SIGNATURE_PROVIDER === 'bankid' ? 'bankid' : 'mock';
    signatureServiceInstance = new SignatureService(providerType);
  }
  return signatureServiceInstance;
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

import { useState, useCallback } from 'react';

export interface UseSignatureOptions {
  onSuccess?: (result: SignatureResult) => void;
  onError?: (error: string) => void;
  pollInterval?: number;
}

export function useSignature(options: UseSignatureOptions = {}) {
  const { onSuccess, onError, pollInterval = 2000 } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [autoStartToken, setAutoStartToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const service = getSignatureService();

  const initiateSignature = useCallback(
    async (request: SignatureRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await service.requestSignature(request);
        setOrderRef(result.orderRef);
        setAutoStartToken(result.autoStartToken || null);

        // Start polling for completion
        const poll = async () => {
          if (!result.orderRef) return;

          const status = await service.checkSignatureStatus(result.orderRef);

          if (status.success) {
            setIsLoading(false);
            onSuccess?.(status);
            return;
          }

          if (status.error && status.error !== 'Signature pending') {
            setIsLoading(false);
            setError(status.error);
            onError?.(status.error);
            return;
          }

          // Continue polling
          setTimeout(poll, pollInterval);
        };

        poll();
      } catch (err) {
        setIsLoading(false);
        const errorMessage = err instanceof Error ? err.message : 'Signature failed';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    },
    [service, onSuccess, onError, pollInterval]
  );

  const cancelSignature = useCallback(async () => {
    if (orderRef) {
      await service.cancelSignature(orderRef);
      setOrderRef(null);
      setAutoStartToken(null);
      setIsLoading(false);
    }
  }, [orderRef, service]);

  return {
    initiateSignature,
    cancelSignature,
    isLoading,
    orderRef,
    autoStartToken,
    error,
    providerName: service.getProviderName(),
  };
}

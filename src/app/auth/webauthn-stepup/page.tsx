'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';

interface WebAuthnOptionsJSON {
  challenge: string;
  allowCredentials?: Array<{ id: string; type: string }>;
  timeout?: number;
  rpId?: string;
  userVerification?: UserVerificationRequirement;
}

interface ApiResult {
  options?: WebAuthnOptionsJSON;
  noCredentials?: boolean;
  bypass?: boolean;
  error?: string;
}

const fromBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const toBase64Url = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...Array.from(new Uint8Array(buffer)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

export default function WebAuthnStepUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>}>
      <WebAuthnStepUpContent />
    </Suspense>
  );
}

function WebAuthnStepUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = useMemo(() => searchParams.get('tenantId') || '', [searchParams]);
  const [message, setMessage] = useState('Preparing security key check...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          router.replace('/auth/login');
          return;
        }
        const token = await currentUser.getIdToken();
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

        const optionsRes = await fetch('/api/auth/webauthn/authenticate/options', {
          method: 'POST',
          headers,
          body: JSON.stringify({ tenantId }),
        });
        const payload = await optionsRes.json() as ApiResult;
        if (!optionsRes.ok) throw new Error(payload.error || 'Unable to prepare authentication');
        if (payload.bypass) {
          router.replace(`/dashboard/${tenantId}`);
          return;
        }
        if (payload.noCredentials || !payload.options) {
          setError('No passkeys/security keys registered. Add one in Settings.');
          return;
        }

        setMessage('Touch your security key or use your passkey...');
        const options = payload.options;
        const publicKey: PublicKeyCredentialRequestOptions = {
          challenge: fromBase64Url(options.challenge),
          allowCredentials: options.allowCredentials?.map((item) => ({ ...item, id: fromBase64Url(item.id) })) as PublicKeyCredentialDescriptor[] | undefined,
          timeout: options.timeout,
          rpId: options.rpId,
          userVerification: options.userVerification,
        };
        const credential = await navigator.credentials.get({ publicKey }) as PublicKeyCredential;
        if (!credential) throw new Error('No credential returned');

        const response = credential.response as AuthenticatorAssertionResponse;
        const verifyRes = await fetch('/api/auth/webauthn/authenticate/verify', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            tenantId,
            credential: {
              id: credential.id,
              type: credential.type,
              response: {
                clientDataJSON: toBase64Url(response.clientDataJSON),
                authenticatorData: toBase64Url(response.authenticatorData),
                signature: toBase64Url(response.signature),
                userHandle: response.userHandle ? toBase64Url(response.userHandle) : null,
              },
            },
          }),
        });

        if (!verifyRes.ok) {
          const verifyPayload = await verifyRes.json();
          throw new Error(verifyPayload.error || 'Verification failed');
        }

        router.replace(`/dashboard/${tenantId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Step-up failed. Please retry.');
      }
    };

    if (tenantId) void run();
  }, [router, tenantId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full border rounded-lg p-6 space-y-3">
        <h1 className="text-xl font-semibold">Security key verification</h1>
        {error ? <p className="text-sm text-destructive">{error}</p> : <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}

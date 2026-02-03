'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';

export default function ResetPasswordPage() {
  const { resetPassword, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Clear errors on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);

    try {
      await resetPassword(email);
      setIsSuccess(true);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a password reset link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>
            Click the link in the email to reset your password. If you don&apos;t see
            the email, check your spam folder.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setIsSuccess(false);
              setEmail('');
            }}
          >
            Try another email
          </Button>
          <Link href="/auth/login" className="w-full">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {displayError && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {displayError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
              required
              autoComplete="email"
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Send Reset Link
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/auth/login">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sign in
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

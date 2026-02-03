'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle, ArrowRight } from 'lucide-react';
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
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-white/50">
            We&apos;ve sent a password reset link to <span className="text-white">{email}</span>
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-sm">
          <p className="text-white/50 text-sm text-center mb-6">
            Click the link in the email to reset your password. If you don&apos;t see
            the email, check your spam folder.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                setIsSuccess(false);
                setEmail('');
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/10 transition-all"
            >
              Try another email
            </button>
            <Link
              href="/auth/login"
              className="w-full flex items-center justify-center gap-2 py-3 text-white/60 hover:text-white font-medium rounded-lg transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Reset your password</h1>
        <p className="text-white/50">
          Enter your email address and we&apos;ll send you a link to reset your password
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {displayError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {displayError}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-white/70">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                Send Reset Link
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-white/40 mt-6">
        <Link href="/auth/login" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

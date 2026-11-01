'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { useToast } from '../../components/ToastProvider';

function ForgotPasswordForm() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const linkError = searchParams.get('error') === 'link';

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      // Rate limits are worth surfacing; otherwise stay neutral so we don't reveal which emails exist.
      if (error && error.status === 429) {
        toast.error('Too many requests. Please wait a minute and try again.');
        return;
      }
      setSent(true);
      toast.success('Check your email for a reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 sm:p-8">
      <div className="mb-6 text-center">
        <p className="text-3xl mb-2" aria-hidden>
          🔑
        </p>
        <h1 className="text-2xl font-bold text-gray-900">Forgot password</h1>
        <p className="text-sm text-gray-600 mt-1">We&apos;ll email you a link to set a new one.</p>
      </div>

      {linkError && !sent && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3" role="alert">
          That reset link is invalid or has expired. Request a new one below.
        </p>
      )}

      {sent ? (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-3" role="status">
          If an account exists for <strong>{email.trim()}</strong>, a password reset link has been sent. Open it in
          this same browser to continue.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="you@example.com"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-600">
        Remembered it?{' '}
        <Link href="/login" className="text-emerald-700 font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 sm:p-8 text-center text-gray-500">
            Loading…
          </div>
        }
      >
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}

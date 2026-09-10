'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();

  const [farmName, setFarmName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const trimmedFarm = farmName.trim();
      if (!trimmedFarm) {
        setError('Farm name is required');
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // If email confirmation is required, session may be null.
      if (!data.session) {
        setInfo(
          'Check your email to confirm your account, then sign in. After first sign-in, if no farm appears, contact an admin — farm creation needs an active session.'
        );
        return;
      }

      const { data: farmId, error: farmError } = await supabase.rpc('create_farm_for_new_user', {
        p_farm_name: trimmedFarm,
      });

      if (farmError) {
        setError(
          'Account created, but farm setup failed: ' +
            farmError.message +
            '. Ensure multi_farm_phase1.sql has been applied.'
        );
        return;
      }

      if (farmId && typeof window !== 'undefined') {
        window.localStorage.setItem('farm-log-active-farm-id', String(farmId));
      }

      router.replace('/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 sm:p-8">
        <div className="mb-6 text-center">
          <p className="text-3xl mb-2" aria-hidden>
            🌾
          </p>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-sm text-gray-600 mt-1">
            Creates your user plus a new farm (editor role)
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup-farm" className="block text-sm font-medium text-gray-700 mb-1">
              Farm name
            </label>
            <input
              id="signup-farm"
              type="text"
              required
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              className="form-input"
              placeholder="e.g. Rush Farms"
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              {info}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await authApi.forgotPassword(data);
    } catch {
      // Intentionally swallow error to avoid email enumeration
    }
    // Always show success — don't reveal if email exists
    setSuccess(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-serif text-3xl font-bold text-black">R·ECOM</Link>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Forgot your password?</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your email and we&apos;ll send a reset link</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4" />
              <h2 className="font-semibold text-gray-900 mb-2">Check your email</h2>
              <p className="text-sm text-gray-500">
                If an account with that email exists, we&apos;ve sent a password reset link. Check your inbox and spam folder.
              </p>
              <Link href="/auth/login" className="btn btn-primary mt-6 w-full">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {serverError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                  {serverError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="input"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? <Loader2 size={16} className="animate-spin" />
                  : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <Link
          href="/auth/login"
          className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-black transition-colors mt-6"
        >
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}

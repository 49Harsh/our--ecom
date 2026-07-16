'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Suspense } from 'react';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [showPass, setShowPass] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    if (!token) {
      setServerError('Invalid or missing reset token. Please request a new reset link.');
      return;
    }
    try {
      await authApi.resetPassword({ token, password: data.password });
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message ?? 'Reset failed. The link may have expired.'
      );
    }
  };

  if (!token) {
    return (
      <div className="text-center py-4">
        <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
        <h2 className="font-semibold text-gray-900 mb-2">Invalid Link</h2>
        <p className="text-sm text-gray-500 mb-5">
          This reset link is invalid or has expired.
        </p>
        <Link href="/auth/forgot-password" className="btn btn-primary w-full">
          Request New Link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4" />
        <h2 className="font-semibold text-gray-900 mb-2">Password Reset!</h2>
        <p className="text-sm text-gray-500">
          Your password has been updated. Redirecting to sign in...
        </p>
        <Link href="/auth/login" className="btn btn-primary mt-6 w-full">
          Sign In Now
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="password">
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPass ? 'text' : 'password'}
            autoComplete="new-password"
            {...register('password')}
            className="input pr-10"
            placeholder="Min. 8 characters"
          />
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="confirmPassword">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          className="input"
          placeholder="••••••••"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting
          ? <Loader2 size={16} className="animate-spin" />
          : 'Reset Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="font-serif text-3xl font-bold text-black">R·ECOM</Link>
            <h1 className="mt-4 text-xl font-semibold text-gray-900">Reset your password</h1>
            <p className="text-sm text-gray-500 mt-1">Enter a new password for your account</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <ResetPasswordForm />
          </div>
          <Link
            href="/auth/login"
            className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-black transition-colors mt-6"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </Suspense>
  );
}

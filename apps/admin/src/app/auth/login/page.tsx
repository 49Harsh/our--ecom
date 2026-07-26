'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import { authApi } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const data = res.data?.data ?? res.data;

      if (data.requires2FA) {
        setTempToken(data.tempToken);
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      // Check role
      if (!['ADMIN', 'MANAGER'].includes(data.user?.role)) {
        setError('Access denied. Admin or Manager role required.');
        setLoading(false);
        return;
      }

      localStorage.setItem('adminAccessToken', data.accessToken);
      localStorage.setItem('adminRefreshToken', data.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Invalid credentials');
      setLoading(false);
    }
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verify2FA({ tempToken, token: totpCode });
      const data = res.data?.data ?? res.data;
      localStorage.setItem('adminAccessToken', data.accessToken);
      localStorage.setItem('adminRefreshToken', data.refreshToken);
      router.push('/dashboard');
    } catch {
      setError('Invalid 2FA code. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">R·ECOM Admin</h1>
          <p className="text-slate-400 text-sm mt-1">
            {requires2FA ? 'Enter your 2FA code' : 'Sign in to your account'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {!requires2FA ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@recom.in" autoComplete="email"
                  className="input !bg-slate-800 !border-slate-700 !text-white placeholder:!text-slate-500 focus:!border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password"
                    className="input !bg-slate-800 !border-slate-700 !text-white placeholder:!text-slate-500 focus:!border-indigo-500 pr-10"
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" tabIndex={-1}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="btn btn-primary w-full gap-2 disabled:opacity-60 !py-2.5">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handle2FA} className="space-y-5">
              <p className="text-sm text-slate-400">
                Open your authenticator app and enter the 6-digit code for R·ECOM.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">TOTP Code</label>
                <input
                  type="text" required value={totpCode} maxLength={6}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000" autoComplete="one-time-code"
                  className="input !bg-slate-800 !border-slate-700 !text-white text-center text-2xl tracking-widest focus:!border-indigo-500"
                />
              </div>
              <button type="submit" disabled={loading || totpCode.length < 6}
                className="btn btn-primary w-full gap-2 disabled:opacity-60 !py-2.5">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Verify'}
              </button>
              <button type="button" onClick={() => { setRequires2FA(false); setTotpCode(''); setError(''); }}
                className="btn btn-ghost w-full text-slate-400 text-xs">
                ← Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

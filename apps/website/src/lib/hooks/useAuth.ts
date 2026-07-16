'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { usersApi, authApi } from '@/lib/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'CUSTOMER' | 'ADMIN' | 'MANAGER';
}

export function useAuth() {
  const qc = useQueryClient();
  const router = useRouter();

  const isLoggedIn =
    typeof window !== 'undefined' && !!localStorage.getItem('accessToken');

  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => usersApi.getMe(),
    enabled: isLoggedIn,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const user: AuthUser | null = data?.data?.data ?? data?.data ?? null;

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch {}
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    qc.clear();
    router.push('/');
    router.refresh();
  }, [qc, router]);

  const requireAuth = useCallback(
    (redirectTo = '/auth/login') => {
      if (!isLoggedIn) {
        router.push(redirectTo);
        return false;
      }
      return true;
    },
    [isLoggedIn, router]
  );

  return {
    user,
    isLoading,
    isLoggedIn,
    logout,
    requireAuth,
  };
}

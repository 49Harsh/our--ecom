'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell, Search } from 'lucide-react';
import { usersApi } from '@/lib/api';

export default function Header({ title }: { title?: string }) {
  const { data } = useQuery({
    queryKey: ['admin-me'],
    queryFn: () => usersApi.getMe(),
    staleTime: 5 * 60_000,
    retry: false,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('adminAccessToken'),
  });
  const user = data?.data?.data ?? data?.data;

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center justify-between bg-white border-b border-slate-200 px-6"
      style={{ left: 'var(--sidebar-width, 240px)', height: 'var(--header-height, 56px)' }}
    >
      <h1 className="text-base font-semibold text-slate-800">{title ?? 'Dashboard'}</h1>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors relative">
          <Bell size={18} />
        </button>

        {user && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
              {user.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user.role?.toLowerCase()}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

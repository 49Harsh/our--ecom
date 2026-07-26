'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('adminAccessToken');
    router.replace(token ? '/dashboard' : '/auth/login');
  }, [router]);
  return null;
}

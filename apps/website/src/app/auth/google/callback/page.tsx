'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function GoogleCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (!accessToken || !refreshToken) {
      router.replace('/auth/login?error=google_login_failed');
      return;
    }

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    // Merge guest cart into user cart after login (non-critical)
    const guestId = localStorage.getItem('guestCartId');
    if (guestId) {
      import('@/lib/api')
        .then(({ cartApi }) =>
          cartApi.merge(guestId).then(() => {
            localStorage.removeItem('guestCartId');
          }),
        )
        .catch(() => {});
    }

    router.replace('/');
    router.refresh();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Signing you in…</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">Redirecting…</p>
        </div>
      }
    >
      <GoogleCallbackHandler />
    </Suspense>
  );
}

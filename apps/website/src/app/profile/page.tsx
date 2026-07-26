'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, User, Package, MapPin, Heart, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usersApi, authApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';

const schema = z.object({
  name:  z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email(),
  phone: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const navItems = [
  { label: 'My Orders',   href: '/orders',    icon: Package },
  { label: 'Addresses',   href: '/addresses', icon: MapPin },
  { label: 'Wishlist',    href: '/wishlist',  icon: Heart },
];

export default function ProfilePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe(),
    retry: false,
    enabled: mounted && !!token,
  });

  const user = data?.data?.data ?? data?.data;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (user) reset({ name: user.name, email: user.email, phone: user.phone ?? '' });
  }, [user, reset]);

  const updateMutation = useMutation({
    mutationFn: (d: Partial<FormData>) => usersApi.updateMe(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });

  const handleLogout = async () => {
    const rt = localStorage.getItem('refreshToken');
    if (rt) {
      try { await authApi.logout(rt); } catch {}
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/');
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="container-site py-10 max-w-3xl">
        <Skeleton className="h-8 w-40 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Skeleton className="h-40 rounded-xl sm:col-span-1" />
          <Skeleton className="h-72 rounded-xl sm:col-span-2" />
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="container-site py-8 lg:py-12 max-w-3xl">
      <h1 className="font-serif text-2xl font-bold text-black mb-8">My Account</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-3">
          <div className="card p-5 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center text-xl font-bold mx-auto mb-3">
              {user.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
          </div>

          <nav className="card overflow-hidden">
            {navItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors border-b border-gray-100 last:border-0"
              >
                <Icon size={15} className="text-gray-400" /> {label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} /> Logout
            </button>
          </nav>
        </div>

        {/* Form */}
        <div className="sm:col-span-2">
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <User size={16} /> Personal Information
            </h2>

            <form
              onSubmit={handleSubmit((d) => updateMutation.mutate(d))}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                <input {...register('name')} className="input" />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input {...register('email')} type="email" className="input !bg-gray-50" disabled />
                <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
                <input {...register('phone')} type="tel" className="input" placeholder="+91 XXXXX XXXXX" />
              </div>

              {updateMutation.isSuccess && (
                <p className="text-sm text-emerald-600">✓ Profile updated successfully</p>
              )}
              {updateMutation.isError && (
                <p className="text-sm text-red-600">Failed to update profile</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !isDirty || updateMutation.isPending}
                className="btn btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

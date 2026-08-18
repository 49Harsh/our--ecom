'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, MapPin, Loader2, X, Lock } from 'lucide-react';
import Link from 'next/link';
import { usersApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import AuthPromptModal from '@/components/ui/AuthPromptModal';

const schema = z.object({
  fullName: z.string().min(2),
  phone:    z.string().min(10),
  line1:    z.string().min(5),
  line2:    z.string().optional(),
  city:     z.string().min(2),
  state:    z.string().min(2),
  pincode:  z.string().length(6, 'PIN must be 6 digits'),
  landmark: z.string().optional(),
  type:     z.enum(['HOME', 'WORK', 'OTHER']),
  isDefault: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

function AddressForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: Partial<FormData>;
  onSubmit: (d: FormData) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { type: 'HOME', isDefault: false },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input {...register('fullName')} className="input" />
          {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
          <input {...register('phone')} type="tel" className="input" />
          {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
        <input {...register('line1')} className="input" placeholder="House/Flat no., Building, Street" />
        {errors.line1 && <p className="text-xs text-red-600 mt-1">{errors.line1.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
        <input {...register('line2')} className="input" placeholder="Area, Colony (optional)" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
          <input {...register('city')} className="input" />
          {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
          <input {...register('state')} className="input" />
          {errors.state && <p className="text-xs text-red-600 mt-1">{errors.state.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code *</label>
          <input {...register('pincode')} className="input" maxLength={6} />
          {errors.pincode && <p className="text-xs text-red-600 mt-1">{errors.pincode.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
          <input {...register('landmark')} className="input" placeholder="Near..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address Type</label>
          <select {...register('type')} className="input">
            <option value="HOME">Home</option>
            <option value="WORK">Work</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" {...register('isDefault')} className="w-4 h-4 accent-black" />
        Set as default address
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn btn-primary gap-2 disabled:opacity-60">
          {loading && <Loader2 size={14} className="animate-spin" />}
          Save Address
        </button>
        <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>
      </div>
    </form>
  );
}

export default function AddressesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [isMounted, setIsMounted] = useState(false);
  useState(() => {
    if (typeof window !== 'undefined') {
      setIsMounted(true);
    }
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const { data, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => usersApi.getAddresses(),
    retry: false,
    enabled: isMounted && !!token,
  });

  const addresses: any[] = data?.data?.data ?? data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (d: FormData) => {
      if (!localStorage.getItem('accessToken')) {
        setShowAuthModal(true);
        throw new Error('Please sign in or create an account to save address.');
      }
      return usersApi.createAddress(d);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      setShowForm(false);
      setErrorMessage('');
    },
    onError: (err: any) => {
      if (err?.response?.status === 401 || !localStorage.getItem('accessToken')) {
        setShowAuthModal(true);
      } else {
        setErrorMessage(err?.response?.data?.message || 'Failed to save address');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FormData> }) => {
      if (!localStorage.getItem('accessToken')) {
        setShowAuthModal(true);
        throw new Error('Please sign in or create an account to update address.');
      }
      return usersApi.updateAddress(id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      setEditId(null);
      setErrorMessage('');
    },
    onError: (err: any) => {
      if (err?.response?.status === 401 || !localStorage.getItem('accessToken')) {
        setShowAuthModal(true);
      } else {
        setErrorMessage(err?.response?.data?.message || 'Failed to update address');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteAddress(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
    onError: (err: any) => {
      if (err?.response?.status === 401) setShowAuthModal(true);
    },
  });

  if (!isMounted) {
    return (
      <div className="container-site py-8 lg:py-12 max-w-3xl">
        <h1 className="font-serif text-2xl font-bold text-black mb-8">My Addresses</h1>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  // Not logged in view
  if (!token) {
    return (
      <div className="container-site py-12 lg:py-20 max-w-lg text-center">
        <div className="card p-8 shadow-sm border border-gray-100">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={26} />
          </div>
          <h1 className="font-serif text-2xl font-bold text-gray-900 mb-2">Sign in to view addresses</h1>
          <p className="text-sm text-gray-600 mb-6">
            Please sign in to your account or create a new one to save and manage your delivery addresses.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/auth/login?redirect=/addresses" className="btn btn-primary w-full">
              Sign In
            </Link>
            <Link href="/auth/register?redirect=/addresses" className="btn btn-outline w-full">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-site py-8 lg:py-12 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl font-bold text-black">My Addresses</h1>
        {!showForm && !editId && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary gap-2 !py-2">
            <Plus size={15} /> Add New
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Add New Address</h2>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          <AddressForm
            onSubmit={(d) => createMutation.mutate(d as any)}
            onCancel={() => setShowForm(false)}
            loading={createMutation.isPending}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <MapPin size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No saved addresses yet</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary gap-2">
            <Plus size={15} /> Add Address
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((addr: any) => (
            <div key={addr.id} className="card p-5">
              {editId === addr.id ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">Edit Address</h2>
                    <button onClick={() => setEditId(null)}><X size={18} className="text-gray-400" /></button>
                  </div>
                  <AddressForm
                    initial={addr}
                    onSubmit={(d) => updateMutation.mutate({ id: addr.id, data: d as any })}
                    onCancel={() => setEditId(null)}
                    loading={updateMutation.isPending}
                  />
                </>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{addr.fullName}</p>
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {addr.type}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-black text-white px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {[addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{addr.phone}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setEditId(addr.id)} className="p-2 text-gray-400 hover:text-black transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(addr.id)}
                      disabled={deleteMutation.isPending}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Login Prompt Modal */}
      <AuthPromptModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign In Required"
        message="Please sign in or create an account to save your address."
        redirectUrl="/addresses"
      />
    </div>
  );
}

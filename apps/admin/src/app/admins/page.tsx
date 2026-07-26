'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, UserX, Shield, X, Loader2, ShieldCheck } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { adminsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'MANAGER']),
});
type InviteForm = z.infer<typeof inviteSchema>;

export default function AdminsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-admins'],
    queryFn: () => adminsApi.getAll(),
  });

  const admins = (data?.data?.data ?? []).filter((u: any) =>
    ['ADMIN','MANAGER'].includes(u.role)
  );

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'MANAGER' },
  });

  const inviteMutation = useMutation({
    mutationFn: (d: InviteForm) => adminsApi.invite(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-admins'] }); setShowForm(false); reset(); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => adminsApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-admins'] }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminsApi.updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-admins'] }),
  });

  return (
    <AdminLayout title="Admin Users">
      <div className="card">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-indigo-600"/>
            <p className="font-medium text-slate-800">{admins.length} admin users</p>
          </div>
          <button onClick={() => { reset({ role: 'MANAGER' }); setShowForm(true); }}
            className="btn btn-primary btn-sm gap-1"><Plus size={14}/> Invite Admin</button>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({length:4}).map((_,i)=><div key={i} className="skeleton h-16 rounded-lg"/>)}</div>
        ) : admins.length === 0 ? (
          <div className="py-12 text-center text-slate-400">No admin users found</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {admins.map((admin: any) => (
              <div key={admin.id} className="flex items-center justify-between p-4 hover:bg-slate-50 gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    admin.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {admin.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{admin.name}</p>
                    <p className="text-xs text-slate-400">{admin.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`badge ${admin.role === 'ADMIN' ? 'badge-purple' : 'badge-blue'}`}>
                    {admin.role}
                  </span>
                  <span className={`badge ${admin.isActive ? 'badge-green' : 'badge-red'}`}>
                    {admin.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:block">{formatDate(admin.createdAt)}</span>

                  <div className="flex gap-1">
                    <button
                      onClick={() => updateRoleMutation.mutate({
                        id: admin.id,
                        role: admin.role === 'ADMIN' ? 'MANAGER' : 'ADMIN',
                      })}
                      disabled={updateRoleMutation.isPending}
                      className="btn btn-ghost btn-xs gap-1"
                      title={`Switch to ${admin.role === 'ADMIN' ? 'Manager' : 'Admin'}`}>
                      <Shield size={13}/> Swap Role
                    </button>
                    {admin.isActive && (
                      <button
                        onClick={() => { if (confirm(`Deactivate ${admin.name}?`)) deactivateMutation.mutate(admin.id); }}
                        className="btn btn-ghost btn-xs text-red-500 gap-1">
                        <UserX size={13}/> Deactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)}/>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">Invite Admin User</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm"><X size={16}/></button>
            </div>
            <form onSubmit={handleSubmit((d) => inviteMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input {...register('name')} className="input"/>
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input {...register('email')} type="email" className="input"/>
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <input {...register('password')} type="password" className="input" placeholder="Min 8 characters"/>
                {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select {...register('role')} className="input">
                  <option value="MANAGER">Manager — limited access</option>
                  <option value="ADMIN">Admin — full access</option>
                </select>
              </div>
              {inviteMutation.isError && (
                <p className="text-sm text-red-600">{(inviteMutation.error as any)?.response?.data?.message ?? 'Failed to create admin'}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting || inviteMutation.isPending}
                  className="btn btn-primary gap-2 disabled:opacity-60">
                  {inviteMutation.isPending ? <Loader2 size={14} className="animate-spin"/> : 'Create Admin'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

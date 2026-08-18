'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, X, Truck, Package } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { shippingApi } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const zoneSchema = z.object({
  name: z.string().min(2),
  states: z.string().min(2),
  baseRate: z.number().nonnegative(),
  freeAbove: z.number().optional(),
  estimatedDays: z.number().positive(),
  isActive: z.boolean().optional(),
});
type ZoneForm = z.infer<typeof zoneSchema>;

export default function ShippingPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'zones' | 'shipments'>('zones');
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);

  const { data: zonesData, isLoading: zonesLoading } = useQuery({
    queryKey: ['shipping-zones'],
    queryFn: () => shippingApi.getZones(),
  });

  const { data: shipmentsData, isLoading: shipmentsLoading } = useQuery({
    queryKey: ['shipping-shipments'],
    queryFn: () => shippingApi.getShipments({ limit: 30 }),
    enabled: tab === 'shipments',
  });

  const zones: any[] = Array.isArray(zonesData?.data?.data) ? zonesData.data.data : (Array.isArray(zonesData?.data) ? zonesData.data : []);
  const shipments: any[] = Array.isArray(shipmentsData?.data?.data) ? shipmentsData.data.data : [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ZoneForm>({
    resolver: zodResolver(zoneSchema),
    defaultValues: { isActive: true, estimatedDays: 5, baseRate: 0 },
  });

  const openCreate = () => { setEditingZone(null); reset({ isActive: true, estimatedDays: 5, baseRate: 0 }); setShowZoneForm(true); };
  const openEdit = (z: any) => {
    setEditingZone(z);
    reset({ name: z.name, states: z.states?.join(', ') ?? '', baseRate: Number(z.baseRate),
      freeAbove: z.freeAbove ? Number(z.freeAbove) : undefined, estimatedDays: z.estimatedDays, isActive: z.isActive });
    setShowZoneForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: (d: any) => editingZone
      ? shippingApi.updateZone(editingZone.id, d)
      : shippingApi.createZone(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shipping-zones'] }); setShowZoneForm(false); },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: string) => shippingApi.deleteZone(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipping-zones'] }),
  });

  const createShipmentMutation = useMutation({
    mutationFn: (orderId: string) => shippingApi.createShipment(orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipping-shipments'] }),
  });

  return (
    <AdminLayout title="Shipping">
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white border border-slate-200 rounded-lg p-1 w-fit">
        {[
          { key: 'zones', label: 'Shipping Zones', icon: Package },
          { key: 'shipments', label: 'Shipments', icon: Truck },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'zones' && (
        <div className="card">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <p className="font-medium text-slate-800">{zones.length} Shipping Zones</p>
            <button onClick={openCreate} className="btn btn-primary btn-sm gap-1"><Plus size={14} /> Add Zone</button>
          </div>
          {zonesLoading ? (
            <div className="p-5 space-y-3">{Array.from({length:4}).map((_,i)=><div key={i} className="skeleton h-16 rounded-lg"/>)}</div>
          ) : zones.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No shipping zones configured</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {zones.map((zone: any) => (
                <div key={zone.id} className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-800">{zone.name}</p>
                      <span className={`badge ${zone.isActive ? 'badge-green' : 'badge-gray'}`}>
                        {zone.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{zone.states?.join(', ')}</p>
                    <div className="flex gap-4 mt-1 text-xs text-slate-500">
                      <span>Base: {formatPrice(zone.baseRate)}</span>
                      {zone.freeAbove && <span>Free above: {formatPrice(zone.freeAbove)}</span>}
                      <span>ETA: {zone.estimatedDays} days</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(zone)} className="btn btn-ghost btn-xs"><Pencil size={13}/></button>
                    <button onClick={() => { if (confirm('Delete zone?')) deleteZoneMutation.mutate(zone.id); }}
                      className="btn btn-ghost btn-xs text-red-500"><Trash2 size={13}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'shipments' && (
        <div className="card">
          <div className="p-4 border-b border-slate-100">
            <p className="font-medium text-slate-800">Active Shipments</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Order #</th><th>AWB / Tracking</th><th>Courier</th>
                <th>Status</th><th>Est. Delivery</th><th>Updated</th>
              </tr></thead>
              <tbody>
                {shipmentsLoading
                  ? Array.from({length:5}).map((_,i)=>(
                      <tr key={i}>{Array.from({length:6}).map((_,j)=>(
                        <td key={j}><div className="skeleton h-4 w-20"/></td>
                      ))}</tr>
                    ))
                  : shipments.length === 0
                    ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">No shipments</td></tr>
                    : shipments.map((s: any) => (
                        <tr key={s.id}>
                          <td className="font-medium text-indigo-600">#{s.order?.orderNumber}</td>
                          <td>
                            {s.trackingUrl
                              ? <a href={s.trackingUrl} target="_blank" rel="noreferrer"
                                  className="text-indigo-600 hover:underline text-xs">{s.awbCode ?? 'Track'}</a>
                              : <span className="text-slate-400 text-xs">{s.awbCode ?? '—'}</span>
                            }
                          </td>
                          <td className="text-sm">{s.courier ?? '—'}</td>
                          <td><span className="badge badge-blue">{s.status?.replace(/_/g,' ')}</span></td>
                          <td className="text-xs text-slate-400">
                            {s.estimatedDelivery ? formatDate(s.estimatedDelivery) : '—'}
                          </td>
                          <td className="text-xs text-slate-400">{formatDate(s.updatedAt)}</td>
                        </tr>
                      ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Zone Form Modal */}
      {showZoneForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowZoneForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">{editingZone ? 'Edit Zone' : 'Add Shipping Zone'}</h2>
              <button onClick={() => setShowZoneForm(false)} className="btn btn-ghost btn-sm"><X size={16}/></button>
            </div>
            <form onSubmit={handleSubmit((d) => saveMutation.mutate({ ...d, states: d.states.split(',').map((s:string)=>s.trim()) }))}
              className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Zone Name *</label>
                <input {...register('name')} className="input" placeholder="North India" />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">States (comma separated) *</label>
                <input {...register('states')} className="input" placeholder="Delhi, UP, Haryana, Punjab" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Base Rate (₹) *</label>
                  <input {...register('baseRate', { valueAsNumber: true })} type="number" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Free Above (₹)</label>
                  <input {...register('freeAbove', { valueAsNumber: true })} type="number" className="input" placeholder="999" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Est. Days *</label>
                  <input {...register('estimatedDays', { valueAsNumber: true })} type="number" className="input" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register('isActive')} className="accent-indigo-600 w-4 h-4" />
                Active
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saveMutation.isPending} className="btn btn-primary gap-2 disabled:opacity-60">
                  {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : editingZone ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowZoneForm(false)} className="btn btn-outline">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

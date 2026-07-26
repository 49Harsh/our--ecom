'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import AdminLayout from '@/components/layout/AdminLayout';
import { analyticsApi, ordersApi } from '@/lib/api';
import { formatPrice, formatNumber, getOrderStatusBadge, formatDate } from '@/lib/utils';
import { Download } from 'lucide-react';

const PIE_COLORS = ['#6366f1','#22d3ee','#f59e0b','#10b981','#f43f5e','#8b5cf6'];

export default function ReportsPage() {
  const [period, setPeriod] = useState('30d');

  const { data: overview } = useQuery({
    queryKey: ['reports-overview', period],
    queryFn: () => analyticsApi.getOverview({ period }),
  });
  const { data: topProducts } = useQuery({
    queryKey: ['reports-top', period],
    queryFn: () => analyticsApi.getTopProducts({ period, limit: 10 }),
  });
  const { data: statsData } = useQuery({
    queryKey: ['reports-order-stats'],
    queryFn: () => ordersApi.getStats(),
  });

  const ov = overview?.data?.data ?? {};
  const products = topProducts?.data?.data ?? [];
  const stats = statsData?.data?.data ?? {};

  // Build order status pie data
  const pieData = Object.entries(stats).map(([key, val]: any) => ({
    name: key.replace(/_/g,' '), value: Number(val),
  })).filter(d => d.value > 0);

  const handleExportCSV = () => {
    const rows = products.map((p: any) =>
      `"${p.title}",${p.soldCount},${formatPrice(p.revenue)}`
    );
    const csv = ['Product,Units Sold,Revenue', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="Reports">
      {/* Period + Export */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {[['7d','7 Days'],['30d','30 Days'],['90d','90 Days'],['1y','1 Year']].map(([v,l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === v ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={handleExportCSV} className="btn btn-outline btn-sm gap-1">
          <Download size={14}/> Export CSV
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Revenue',         value: formatPrice(ov.revenue ?? 0) },
          { label: 'Orders',          value: formatNumber(ov.orders ?? 0) },
          { label: 'Avg Order Value', value: formatPrice(ov.avgOrderValue ?? 0) },
          { label: 'Conversion Rate', value: ov.conversionRate ? `${ov.conversionRate}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Top products bar */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Top 10 Products by Revenue</h2>
          {products.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={products.slice(0,10)} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`}/>
                <YAxis dataKey="title" type="category" tick={{ fontSize: 9 }} width={100}
                  tickFormatter={v => v?.length > 16 ? v.slice(0,16)+'…' : v}/>
                <Tooltip formatter={(v: any) => formatPrice(v)}/>
                <Bar dataKey="revenue" fill="#6366f1" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data</div>}
        </div>

        {/* Order status pie */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Orders by Status</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={90} label={({ name, percent }) => `${(percent*100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                </Pie>
                <Legend formatter={(v) => <span className="text-xs">{v}</span>}/>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data</div>}
        </div>
      </div>

      {/* Product table */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Product Performance</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Product</th><th>Units Sold</th><th>Revenue</th><th>Avg Rating</th></tr>
            </thead>
            <tbody>
              {products.length === 0
                ? <tr><td colSpan={5} className="text-center py-10 text-slate-400">No data</td></tr>
                : products.map((p: any, i: number) => (
                  <tr key={p.id}>
                    <td className="text-slate-400 font-mono text-xs">{i+1}</td>
                    <td className="font-medium text-slate-800">{p.title}</td>
                    <td>{formatNumber(p.soldCount ?? 0)}</td>
                    <td className="font-semibold">{formatPrice(p.revenue ?? 0)}</td>
                    <td className="text-amber-600">{p.ratingAvg ? `${Number(p.ratingAvg).toFixed(1)} ★` : '—'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

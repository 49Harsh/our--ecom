'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import AdminLayout from '@/components/layout/AdminLayout';
import StatCard from '@/components/ui/StatCard';
import { analyticsApi } from '@/lib/api';
import { formatPrice, formatNumber } from '@/lib/utils';
import { DollarSign, ShoppingBag, Users, Package } from 'lucide-react';

const PERIODS = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: '1 Year', value: '1y' },
];

const PIE_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview', period],
    queryFn: () => analyticsApi.getOverview({ period }),
  });

  const { data: revenueData } = useQuery({
    queryKey: ['analytics-revenue', period],
    queryFn: () => analyticsApi.getRevenue({ period }),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['analytics-orders', period],
    queryFn: () => analyticsApi.getOrders({ period }),
  });

  const { data: topProductsData } = useQuery({
    queryKey: ['analytics-top', period],
    queryFn: () => analyticsApi.getTopProducts({ period, limit: 10 }),
  });

  const { data: customersData } = useQuery({
    queryKey: ['analytics-customers', period],
    queryFn: () => analyticsApi.getCustomers({ period }),
  });

  const ov = overview?.data?.data ?? overview?.data ?? {};
  const revenue = revenueData?.data?.data ?? [];
  const orders = ordersData?.data?.data ?? [];
  const topProducts = topProductsData?.data?.data ?? [];
  const customers = customersData?.data?.data ?? {};

  return (
    <AdminLayout title="Analytics">
      {/* Period selector */}
      <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-lg p-1 w-fit">
        {PERIODS.map(({ label, value }) => (
          <button key={value} onClick={() => setPeriod(value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              period === value ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Revenue" value={formatPrice(ov.revenue ?? 0)} icon={DollarSign}
          iconColor="bg-indigo-100 text-indigo-600" change={ov.revenueChange} loading={overviewLoading} />
        <StatCard title="Orders" value={formatNumber(ov.orders ?? 0)} icon={ShoppingBag}
          iconColor="bg-blue-100 text-blue-600" change={ov.ordersChange} loading={overviewLoading} />
        <StatCard title="New Customers" value={formatNumber(ov.newCustomers ?? 0)} icon={Users}
          iconColor="bg-emerald-100 text-emerald-600" change={ov.customersChange} loading={overviewLoading} />
        <StatCard title="Avg Order Value" value={formatPrice(ov.avgOrderValue ?? 0)} icon={Package}
          iconColor="bg-orange-100 text-orange-600" loading={overviewLoading} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue chart */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Revenue Trend</h2>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={v=>v?.slice(5)}/>
                <YAxis tick={{fontSize:10}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v:any)=>formatPrice(v)}/>
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#rev)"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data</div>}
        </div>

        {/* Orders chart */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Orders by Day</h2>
          {orders.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={orders}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={v=>v?.slice(5)}/>
                <YAxis tick={{fontSize:10}}/>
                <Tooltip/>
                <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data</div>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Top Products by Revenue</h2>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.slice(0, 8).map((p: any, i: number) => (
                <div key={p.id ?? i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                    <div className="mt-0.5 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full"
                        style={{width:`${(p.revenue / (topProducts[0]?.revenue||1))*100}%`}}/>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 shrink-0">{formatPrice(p.revenue ?? 0)}</span>
                </div>
              ))}
            </div>
          ) : <div className="py-12 text-center text-slate-400 text-sm">No product data</div>}
        </div>

        {/* Customer stats */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Customer Breakdown</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { label: 'Total Customers', value: customers.total ?? 0 },
              { label: 'New This Period', value: customers.new ?? 0 },
              { label: 'Returning', value: customers.returning ?? 0 },
              { label: 'Avg LTV', value: customers.avgLtv ? formatPrice(customers.avgLtv) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">{label}</p>
                <p className="text-xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

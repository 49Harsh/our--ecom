'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import AdminLayout from '@/components/layout/AdminLayout';
import StatCard from '@/components/ui/StatCard';
import { analyticsApi } from '@/lib/api';
import { formatPrice, formatNumber } from '@/lib/utils';
import { DollarSign, ShoppingBag, Users, Package } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn:  () => analyticsApi.getOverview(),
  });

  const { data: revenueData } = useQuery({
    queryKey: ['analytics-revenue'],
    queryFn:  () => analyticsApi.getRevenue({ period: '30d' }),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['analytics-orders'],
    queryFn:  () => analyticsApi.getOrders(),
  });

  const { data: topProductsData } = useQuery({
    queryKey: ['analytics-top'],
    queryFn:  () => analyticsApi.getTopProducts({ limit: 8 }),
  });

  const { data: customersData } = useQuery({
    queryKey: ['analytics-customers'],
    queryFn:  () => analyticsApi.getCustomers({ limit: 5 }),
  });

  // analytics/overview → { revenue:{total,thisMonth,growth}, orders:{total,thisMonth,growth}, customers:{total,thisMonth}, products:{total,active} }
  const ov = overview?.data?.data ?? overview?.data ?? {};

  const revenue = Array.isArray(revenueData?.data?.data)
    ? revenueData.data.data
    : Array.isArray(revenueData?.data) ? revenueData.data : [];

  // orders/by-status → [{ status, _count:{id}, _sum:{total} }]
  const ordersByStatus = Array.isArray(ordersData?.data?.data)
    ? ordersData.data.data
    : Array.isArray(ordersData?.data) ? ordersData.data : [];

  const topProducts = Array.isArray(topProductsData?.data?.data)
    ? topProductsData.data.data
    : Array.isArray(topProductsData?.data) ? topProductsData.data : [];

  const topCustomers = Array.isArray(customersData?.data?.data)
    ? customersData.data.data
    : Array.isArray(customersData?.data) ? customersData.data : [];

  return (
    <AdminLayout title="Analytics">
      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={formatPrice(ov.revenue?.total ?? 0)}
          icon={DollarSign}
          iconColor="bg-indigo-100 text-indigo-600"
          change={ov.revenue?.growth ?? undefined}
          loading={overviewLoading}
        />
        <StatCard
          title="Total Orders"
          value={formatNumber(ov.orders?.total ?? 0)}
          icon={ShoppingBag}
          iconColor="bg-blue-100 text-blue-600"
          change={ov.orders?.growth ?? undefined}
          loading={overviewLoading}
        />
        <StatCard
          title="Total Customers"
          value={formatNumber(ov.customers?.total ?? 0)}
          icon={Users}
          iconColor="bg-emerald-100 text-emerald-600"
          sub={`+${ov.customers?.thisMonth ?? 0} this month`}
          loading={overviewLoading}
        />
        <StatCard
          title="Total Products"
          value={formatNumber(ov.products?.total ?? 0)}
          icon={Package}
          iconColor="bg-orange-100 text-orange-600"
          sub={`${ov.products?.active ?? 0} active`}
          loading={overviewLoading}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue chart */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Revenue Trend (Last 30 Days)</h2>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={v => v?.slice(5)}/>
                <YAxis tick={{fontSize:10}} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v: any) => formatPrice(v)}/>
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#rev)"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No revenue data</div>
          )}
        </div>

        {/* Orders by status */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Orders by Status</h2>
          {ordersByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ordersByStatus.map((o: any) => ({
                status:  o.status?.replace(/_/g, ' '),
                count:   o._count?.id ?? 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="status" tick={{fontSize:9}}/>
                <YAxis tick={{fontSize:10}}/>
                <Tooltip/>
                <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} name="Orders"/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No order data</div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Top Products by Sales</h2>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.slice(0, 8).map((p: any, i: number) => (
                <div key={p.id ?? i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                    <div className="mt-0.5 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full"
                        style={{ width: `${((p.soldCount ?? 0) / (topProducts[0]?.soldCount || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 shrink-0">
                    {p.soldCount ?? 0} sold
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">No product data</div>
          )}
        </div>

        {/* Top customers */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Top Customers</h2>
          {topCustomers.length > 0 ? (
            <div className="space-y-3">
              {topCustomers.slice(0, 5).map((c: any, i: number) => (
                <div key={c.id ?? i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {c.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.name ?? '—'}</p>
                    <p className="text-xs text-slate-400 truncate">{c.email ?? ''}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 shrink-0 bg-slate-100 px-2 py-0.5 rounded-full">
                    {c._count?.orders ?? 0} orders
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">No customer data</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

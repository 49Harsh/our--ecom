'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag, Users, DollarSign, Package,
  TrendingUp, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import AdminLayout from '@/components/layout/AdminLayout';
import StatCard from '@/components/ui/StatCard';
import { dashboardApi } from '@/lib/api';
import { formatPrice, formatDate, getOrderStatusBadge } from '@/lib/utils';

export default function DashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
  });

  const { data: revenueData } = useQuery({
    queryKey: ['dashboard-revenue'],
    queryFn: () => dashboardApi.getRevenue('30d'),
  });

  const { data: recentData } = useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: () => dashboardApi.getRecentOrders(),
  });

  const { data: topData } = useQuery({
    queryKey: ['dashboard-top-products'],
    queryFn: () => dashboardApi.getTopProducts(),
  });

  const stats = statsData?.data?.data ?? statsData?.data ?? {};
  const revenue = revenueData?.data?.data ?? revenueData?.data ?? [];
  const recentOrders = recentData?.data?.data ?? recentData?.data ?? [];
  const topProducts = topData?.data?.data ?? topData?.data ?? [];

  return (
    <AdminLayout title="Dashboard">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatCard
          title="Total Revenue"
          value={formatPrice(stats.totalRevenue ?? 0)}
          sub="All time"
          icon={DollarSign}
          iconColor="bg-indigo-100 text-indigo-600"
          change={stats.revenueChange}
          loading={statsLoading}
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders ?? 0}
          sub="All time"
          icon={ShoppingBag}
          iconColor="bg-blue-100 text-blue-600"
          change={stats.ordersChange}
          loading={statsLoading}
        />
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers ?? 0}
          sub="Registered users"
          icon={Users}
          iconColor="bg-emerald-100 text-emerald-600"
          change={stats.customersChange}
          loading={statsLoading}
        />
        <StatCard
          title="Total Products"
          value={stats.totalProducts ?? 0}
          sub="Active listings"
          icon={Package}
          iconColor="bg-orange-100 text-orange-600"
          loading={statsLoading}
        />
      </div>

      {/* Order status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending',   value: stats.pendingOrders ?? 0,   icon: Clock,         color: 'text-yellow-600 bg-yellow-50' },
          { label: 'Confirmed', value: stats.confirmedOrders ?? 0, icon: TrendingUp,    color: 'text-blue-600 bg-blue-50' },
          { label: 'Delivered', value: stats.deliveredOrders ?? 0, icon: CheckCircle2,  color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Cancelled', value: stats.cancelledOrders ?? 0, icon: XCircle,       color: 'text-red-600 bg-red-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`card p-4 flex items-center gap-3 ${color}`}>
            <Icon size={20} />
            <div>
              <p className="text-lg font-bold">{value}</p>
              <p className="text-xs opacity-70">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue chart */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold text-slate-800 mb-4">Revenue (Last 30 Days)</h2>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatPrice(v)} labelFormatter={(l) => `Date: ${l}`} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
              No revenue data available
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Top Products</h2>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topProducts.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="title" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip />
                <Bar dataKey="soldCount" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
              No product data
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Recent Orders</h2>
          <a href="/orders" className="text-xs text-indigo-600 hover:underline">View all →</a>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No recent orders</td></tr>
              ) : recentOrders.slice(0, 8).map((order: any) => {
                const { label, badge } = getOrderStatusBadge(order.status);
                return (
                  <tr key={order.id}>
                    <td className="font-medium text-indigo-600">
                      <a href={`/orders?id=${order.id}`}>#{order.orderNumber}</a>
                    </td>
                    <td className="text-slate-700">{order.user?.name ?? '—'}</td>
                    <td className="font-semibold">{formatPrice(order.total)}</td>
                    <td><span className={`badge ${badge}`}>{label}</span></td>
                    <td className="text-slate-400 text-xs">{formatDate(order.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

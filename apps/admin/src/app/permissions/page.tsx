'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { Shield, Check, X } from 'lucide-react';

const ROLES = ['ADMIN', 'MANAGER', 'CUSTOMER'];

const PERMISSIONS = [
  { group: 'Products',   actions: ['View','Create','Edit','Delete','Publish'] },
  { group: 'Orders',     actions: ['View','Update Status','Cancel','Refund'] },
  { group: 'Customers',  actions: ['View','Edit','Deactivate'] },
  { group: 'Categories', actions: ['View','Create','Edit','Delete'] },
  { group: 'Coupons',    actions: ['View','Create','Edit','Delete'] },
  { group: 'Reviews',    actions: ['View','Approve','Delete'] },
  { group: 'Returns',    actions: ['View','Approve','Reject','Refund'] },
  { group: 'Inventory',  actions: ['View','Edit Stock'] },
  { group: 'Analytics',  actions: ['View'] },
  { group: 'Reports',    actions: ['View','Export'] },
  { group: 'Shipping',   actions: ['View','Create','Edit'] },
  { group: 'Settings',   actions: ['View','Edit'] },
  { group: 'Admins',     actions: ['View','Invite','Deactivate'] },
];

// Default permission matrix — ADMIN has all, MANAGER has most, CUSTOMER has none
const MATRIX: Record<string, Record<string, Record<string, boolean>>> = {
  ADMIN: Object.fromEntries(PERMISSIONS.map(p => [
    p.group, Object.fromEntries(p.actions.map(a => [a, true]))
  ])),
  MANAGER: {
    Products:   { View: true,  Create: true,   Edit: true,   Delete: false, Publish: true },
    Orders:     { View: true,  'Update Status': true, Cancel: true, Refund: false },
    Customers:  { View: true,  Edit: false, Deactivate: false },
    Categories: { View: true,  Create: true,  Edit: true,  Delete: false },
    Coupons:    { View: true,  Create: true,  Edit: true,  Delete: false },
    Reviews:    { View: true,  Approve: true, Delete: false },
    Returns:    { View: true,  Approve: true, Reject: true, Refund: false },
    Inventory:  { View: true,  'Edit Stock': true },
    Analytics:  { View: true },
    Reports:    { View: true,  Export: true },
    Shipping:   { View: true,  Create: true,  Edit: true },
    Settings:   { View: true,  Edit: false },
    Admins:     { View: false, Invite: false, Deactivate: false },
  },
  CUSTOMER: Object.fromEntries(PERMISSIONS.map(p => [
    p.group, Object.fromEntries(p.actions.map(a => [a, false]))
  ])),
};

export default function PermissionsPage() {
  return (
    <AdminLayout title="Permissions">
      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <strong>Read-only reference.</strong> Permissions are enforced server-side via role-based guards.
        To change permissions, update the backend <code className="bg-amber-100 px-1 rounded">roles.guard.ts</code> and <code className="bg-amber-100 px-1 rounded">@Roles()</code> decorators.
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Shield size={16} className="text-indigo-600"/>
          <h2 className="font-semibold text-slate-800">Role Permission Matrix</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Resource</th>
                <th>Action</th>
                {ROLES.map(r => (
                  <th key={r}>
                    <span className={`badge ${r === 'ADMIN' ? 'badge-purple' : r === 'MANAGER' ? 'badge-blue' : 'badge-gray'}`}>
                      {r}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.flatMap(({ group, actions }) =>
                actions.map((action, i) => (
                  <tr key={`${group}-${action}`}>
                    {i === 0 && (
                      <td rowSpan={actions.length}
                        className="font-semibold text-slate-700 bg-slate-50 border-r border-slate-100 align-top pt-3">
                        {group}
                      </td>
                    )}
                    <td className="text-slate-600">{action}</td>
                    {ROLES.map(role => {
                      const allowed = MATRIX[role]?.[group]?.[action] ?? false;
                      return (
                        <td key={role} className="text-center">
                          {allowed
                            ? <Check size={14} className="text-emerald-500 mx-auto"/>
                            : <X size={14} className="text-slate-300 mx-auto"/>}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

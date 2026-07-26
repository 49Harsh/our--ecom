import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

export const ORDER_STATUS_MAP: Record<string, { label: string; badge: string }> = {
  PENDING:          { label: 'Pending',          badge: 'badge-yellow' },
  CONFIRMED:        { label: 'Confirmed',         badge: 'badge-blue'   },
  PACKED:           { label: 'Packed',            badge: 'badge-purple' },
  SHIPPED:          { label: 'Shipped',           badge: 'badge-purple' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  badge: 'badge-orange' },
  DELIVERED:        { label: 'Delivered',         badge: 'badge-green'  },
  CANCELLED:        { label: 'Cancelled',         badge: 'badge-red'    },
  RETURNED:         { label: 'Returned',          badge: 'badge-gray'   },
  REFUNDED:         { label: 'Refunded',          badge: 'badge-teal'   },
};

export const RETURN_STATUS_MAP: Record<string, { label: string; badge: string }> = {
  REQUESTED: { label: 'Requested', badge: 'badge-yellow' },
  APPROVED:  { label: 'Approved',  badge: 'badge-blue'   },
  REJECTED:  { label: 'Rejected',  badge: 'badge-red'    },
  PICKED_UP: { label: 'Picked Up', badge: 'badge-purple' },
  INSPECTED: { label: 'Inspected', badge: 'badge-orange' },
  REFUNDED:  { label: 'Refunded',  badge: 'badge-teal'   },
};

export function getOrderStatusBadge(status: string) {
  return ORDER_STATUS_MAP[status] ?? { label: status, badge: 'badge-gray' };
}

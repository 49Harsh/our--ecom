import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function getOrderStatusColor(status: string) {
  const map: Record<string, string> = {
    PENDING:          'bg-yellow-100 text-yellow-800',
    CONFIRMED:        'bg-blue-100 text-blue-800',
    PACKED:           'bg-indigo-100 text-indigo-800',
    SHIPPED:          'bg-purple-100 text-purple-800',
    OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-800',
    DELIVERED:        'bg-green-100 text-green-800',
    CANCELLED:        'bg-red-100 text-red-800',
    RETURNED:         'bg-gray-100 text-gray-800',
    REFUNDED:         'bg-teal-100 text-teal-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

export function getOrderStatusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

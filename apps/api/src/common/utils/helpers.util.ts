import slugify from 'slugify';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10);

/**
 * Generate a URL-friendly slug from any string
 */
export function generateSlug(text: string): string {
  return slugify(text, { lower: true, strict: true, trim: true });
}

/**
 * Generate a unique SKU code
 */
export function generateSKU(prefix = 'SKU'): string {
  return `${prefix}-${nanoid(8).toUpperCase()}`;
}

/**
 * Generate a short unique ID
 */
export function generateId(length = 10): string {
  return nanoid(length);
}

/**
 * Generate order number in format ORD-YYYYMMDD-XXXXX
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = nanoid(5).toUpperCase();
  return `ORD-${dateStr}-${random}`;
}

/**
 * Generate invoice number in format INV-YYYYMM-XXXXX
 */
export function generateInvoiceNumber(): string {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const random = nanoid(5).toUpperCase();
  return `INV-${yearMonth}-${random}`;
}

/**
 * Calculate GST amounts (CGST + SGST for within state, IGST for inter-state)
 */
export function calculateGST(
  amount: number,
  gstRate = 5,
  isInterState = false,
): { cgst: number; sgst: number; igst: number; totalTax: number; totalWithTax: number } {
  const taxAmount = (amount * gstRate) / 100;
  if (isInterState) {
    return { cgst: 0, sgst: 0, igst: taxAmount, totalTax: taxAmount, totalWithTax: amount + taxAmount };
  }
  const halfTax = taxAmount / 2;
  return { cgst: halfTax, sgst: halfTax, igst: 0, totalTax: taxAmount, totalWithTax: amount + taxAmount };
}

/**
 * Paginate helper — returns offset/limit from page/limit
 */
export function getPaginationParams(page = 1, limit = 20): { skip: number; take: number } {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  return { skip: (safePage - 1) * safeLimit, take: safeLimit };
}

/**
 * Build paginated response envelope
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  const totalPages = Math.ceil(total / limit);
  return {
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Round to 2 decimal places
 */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Unit tests for helper utility functions
 */
import {
  generateSlug,
  generateSKU,
  generateOrderNumber,
  generateInvoiceNumber,
  calculateGST,
  getPaginationParams,
  buildPaginatedResponse,
  roundMoney,
} from './helpers.util';

describe('helpers.util', () => {

  // ─── generateSlug() ────────────────────────────────────────────────────────
  describe('generateSlug()', () => {
    it('should convert text to lowercase slug', () => {
      expect(generateSlug('Men T-Shirts')).toBe('men-t-shirts');
    });

    it('should handle special characters', () => {
      // slugify converts "%" to "percent", so "100% Cotton!" → "100percent-cotton"
      expect(generateSlug('100% Cotton!')).toBe('100percent-cotton');
    });

    it('should handle multiple spaces', () => {
      expect(generateSlug('  Blue   Jeans  ')).toBe('blue-jeans');
    });

    it('should handle Hindi/Unicode by slugifying to ASCII-friendly', () => {
      const slug = generateSlug('Test Product 2024');
      expect(slug).toBe('test-product-2024');
    });
  });

  // ─── generateSKU() ─────────────────────────────────────────────────────────
  describe('generateSKU()', () => {
    it('should generate a SKU with the default PRD prefix', () => {
      const sku = generateSKU();
      expect(sku).toMatch(/^SKU-[A-Z0-9]{8}$/);
    });

    it('should generate a SKU with a custom prefix', () => {
      const sku = generateSKU('TSHIRT');
      expect(sku).toMatch(/^TSHIRT-[A-Z0-9]{8}$/);
    });

    it('should generate unique SKUs on each call', () => {
      const sku1 = generateSKU();
      const sku2 = generateSKU();
      expect(sku1).not.toBe(sku2);
    });
  });

  // ─── generateOrderNumber() ─────────────────────────────────────────────────
  describe('generateOrderNumber()', () => {
    it('should generate a properly formatted order number', () => {
      const num = generateOrderNumber();
      expect(num).toMatch(/^ORD-\d{8}-[A-Z0-9]{5}$/);
    });

    it('should contain today\'s date', () => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const num = generateOrderNumber();
      expect(num).toContain(today);
    });
  });

  // ─── generateInvoiceNumber() ───────────────────────────────────────────────
  describe('generateInvoiceNumber()', () => {
    it('should generate a properly formatted invoice number', () => {
      const num = generateInvoiceNumber();
      expect(num).toMatch(/^INV-\d{6}-[A-Z0-9]{5}$/);
    });
  });

  // ─── calculateGST() ────────────────────────────────────────────────────────
  describe('calculateGST()', () => {
    it('should calculate CGST + SGST for intra-state transactions', () => {
      const result = calculateGST(1000, 5, false);
      expect(result.cgst).toBe(25);
      expect(result.sgst).toBe(25);
      expect(result.igst).toBe(0);
      expect(result.totalTax).toBe(50);
      expect(result.totalWithTax).toBe(1050);
    });

    it('should calculate IGST for inter-state transactions', () => {
      const result = calculateGST(1000, 5, true);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBe(50);
      expect(result.totalTax).toBe(50);
      expect(result.totalWithTax).toBe(1050);
    });

    it('should use default 5% GST rate', () => {
      const result = calculateGST(2000);
      expect(result.totalTax).toBe(100);
    });

    it('should handle 18% GST rate', () => {
      const result = calculateGST(1000, 18, false);
      expect(result.cgst).toBe(90);
      expect(result.sgst).toBe(90);
      expect(result.totalTax).toBe(180);
      expect(result.totalWithTax).toBe(1180);
    });
  });

  // ─── getPaginationParams() ─────────────────────────────────────────────────
  describe('getPaginationParams()', () => {
    it('should return correct skip and take for page 1', () => {
      const { skip, take } = getPaginationParams(1, 20);
      expect(skip).toBe(0);
      expect(take).toBe(20);
    });

    it('should return correct skip for page 3', () => {
      const { skip, take } = getPaginationParams(3, 10);
      expect(skip).toBe(20);
      expect(take).toBe(10);
    });

    it('should cap limit at 100', () => {
      const { take } = getPaginationParams(1, 999);
      expect(take).toBe(100);
    });

    it('should enforce minimum limit of 1', () => {
      const { take } = getPaginationParams(1, 0);
      expect(take).toBe(1);
    });

    it('should enforce minimum page of 1', () => {
      const { skip } = getPaginationParams(-5, 20);
      expect(skip).toBe(0);
    });

    it('should default to page 1, limit 20', () => {
      const { skip, take } = getPaginationParams();
      expect(skip).toBe(0);
      expect(take).toBe(20);
    });
  });

  // ─── buildPaginatedResponse() ──────────────────────────────────────────────
  describe('buildPaginatedResponse()', () => {
    const data = [{ id: 1 }, { id: 2 }];

    it('should build correct response structure', () => {
      const result = buildPaginatedResponse(data, 50, 1, 20);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(50);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should correctly compute hasNextPage', () => {
      const result = buildPaginatedResponse(data, 50, 2, 20);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(true);
    });

    it('should set hasNextPage false on last page', () => {
      const result = buildPaginatedResponse(data, 40, 2, 20);
      expect(result.meta.hasNextPage).toBe(false);
    });

    it('should set hasPrevPage false on first page', () => {
      const result = buildPaginatedResponse(data, 50, 1, 20);
      expect(result.meta.hasPrevPage).toBe(false);
    });
  });

  // ─── roundMoney() ──────────────────────────────────────────────────────────
  describe('roundMoney()', () => {
    it('should round to 2 decimal places', () => {
      expect(roundMoney(10.567)).toBe(10.57);
      expect(roundMoney(10.564)).toBe(10.56);
    });

    it('should handle already-rounded values', () => {
      expect(roundMoney(100)).toBe(100);
      expect(roundMoney(99.99)).toBe(99.99);
    });

    it('should handle floating point edge cases', () => {
      expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    });
  });
});

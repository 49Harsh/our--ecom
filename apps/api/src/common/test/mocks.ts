/**
 * Shared Prisma Mock Factory
 * Returns a fully mocked PrismaService with all models.
 * Import this in every spec file to get a clean, independent mock.
 */
export const createPrismaMock = () => ({
  // ── User ──────────────────────────────────────────────────────────────────
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  // ── Auth ──────────────────────────────────────────────────────────────────
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  otpVerification: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  // ── Address ───────────────────────────────────────────────────────────────
  address: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  // ── Category ──────────────────────────────────────────────────────────────
  category: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  // ── Product ───────────────────────────────────────────────────────────────
  product: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  productVariant: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  productImage: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn(),
  },
  // ── Inventory ─────────────────────────────────────────────────────────────
  inventory: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
    fields: { lowStock: 5 },
  },
  // ── Cart ──────────────────────────────────────────────────────────────────
  cart: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  cartItem: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  // ── Coupon ────────────────────────────────────────────────────────────────
  coupon: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  // ── Order ─────────────────────────────────────────────────────────────────
  order: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  orderItem: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    createMany: jest.fn(),
  },
  // ── Payment ───────────────────────────────────────────────────────────────
  payment: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  invoice: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  },
  // ── Review ────────────────────────────────────────────────────────────────
  review: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  // ── Wishlist ──────────────────────────────────────────────────────────────
  wishlist: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  // ── Return ────────────────────────────────────────────────────────────────
  return: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  // ── Notification ──────────────────────────────────────────────────────────
  notification: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  // ── Settings ─────────────────────────────────────────────────────────────
  settings: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  heroBanner: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  homepageSection: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  activityLog: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  // ── Transactions ──────────────────────────────────────────────────────────
  $transaction: jest.fn((fn: (tx: any) => Promise<any>) => fn({
    payment: { findUnique: jest.fn(), update: jest.fn() },
    order: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    transaction: { create: jest.fn() },
    inventory: { update: jest.fn(), findUnique: jest.fn() },
    coupon: { update: jest.fn() },
    cartItem: { deleteMany: jest.fn() },
    cart: { update: jest.fn() },
    refreshToken: { update: jest.fn(), updateMany: jest.fn() },
    user: { update: jest.fn() },
  })),
  $queryRaw: jest.fn(),
  $disconnect: jest.fn(),
});

/**
 * Shared Redis Mock Factory
 */
export const createRedisMock = () => ({
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
});

/**
 * Shared JWT Service Mock
 */
export const createJwtMock = () => ({
  signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
  verifyAsync: jest.fn(),
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
});

/**
 * Shared ConfigService Mock
 */
export const createConfigMock = () => ({
  get: jest.fn((key: string, defaultVal?: any) => {
    const values: Record<string, string> = {
      JWT_SECRET: 'test-jwt-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      TOTP_APP_NAME: 'TestApp',
      RAZORPAY_KEY_ID: 'rzp_test_key',
      RAZORPAY_KEY_SECRET: 'rzp_test_secret',
      RAZORPAY_WEBHOOK_SECRET: 'rzp_test_webhook',
      GST_NUMBER: '27AAABBB1234C1ZX',
    };
    return values[key] ?? defaultVal;
  }),
});

/**
 * Factory for a mock User object
 */
export const mockUser = (overrides: Record<string, any> = {}) => ({
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  phone: '+919876543210',
  password: '$2a$12$hashedpassword',
  role: 'CUSTOMER',
  isActive: true,
  isVerified: true,
  isTwoFAEnabled: false,
  twoFASecret: null,
  googleId: null,
  fcmToken: null,
  avatar: null,
  lastLoginAt: null,
  deletedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

/**
 * Factory for a mock Product object
 */
export const mockProduct = (overrides: Record<string, any> = {}) => ({
  id: 'product-123',
  title: 'Test T-Shirt',
  slug: 'test-t-shirt',
  description: 'A great test t-shirt',
  shortDescription: null,
  sku: 'PRD-ABC123',
  barcode: null,
  brand: 'TestBrand',
  gender: 'UNISEX',
  categoryId: 'cat-123',
  collection: null,
  season: null,
  price: 999,
  discountPrice: 799,
  costPrice: null,
  weight: null,
  thumbnail: 'https://example.com/image.jpg',
  video: null,
  tags: ['casual', 'cotton'],
  isFeatured: false,
  isTrending: true,
  isNewArrival: false,
  isBestSeller: false,
  status: 'ACTIVE',
  seoTitle: null,
  seoDesc: null,
  seoKeywords: [],
  ratingAvg: 4.2,
  reviewCount: 10,
  soldCount: 50,
  viewCount: 200,
  deletedAt: null,
  publishedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

/**
 * Factory for a mock Order object
 */
export const mockOrder = (overrides: Record<string, any> = {}) => ({
  id: 'order-123',
  orderNumber: 'ORD-20240101-ABCDE',
  userId: 'user-123',
  addressId: 'addr-123',
  couponId: null,
  status: 'PENDING',
  subtotal: 1598,
  discount: 0,
  shippingCharge: 0,
  taxAmount: 79.9,
  total: 1677.9,
  notes: null,
  cancelledAt: null,
  cancelledReason: null,
  deliveredAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

/**
 * Factory for a mock Cart
 */
export const mockCart = (overrides: Record<string, any> = {}) => ({
  id: 'cart-123',
  userId: 'user-123',
  guestId: null,
  couponId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [],
  coupon: null,
  ...overrides,
});

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token or guest ID if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      let guestId = localStorage.getItem('guestCartId');
      if (!guestId) {
        guestId = `guest_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
        localStorage.setItem('guestCartId', guestId);
      }
      config.headers['X-Guest-ID'] = guestId;
    }
  }
  return config;
});

// These endpoints require auth — redirect to login only when explicitly needed
const AUTH_REQUIRED_PATHS = [
  '/orders',
  '/users/me',
  '/users/addresses',
  '/wishlist',
  '/checkout',
];

const requiresAuth = (url?: string) =>
  AUTH_REQUIRED_PATHS.some((p) => url?.includes(p));

// Auto-refresh on 401 — only redirect to login if user was previously logged in
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refreshToken =
        typeof window !== 'undefined'
          ? localStorage.getItem('refreshToken')
          : null;

      // If we have a refresh token, try to refresh silently
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
            refreshToken,
          });
          const tokens = data?.data ?? data;
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
          original.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return api(original);
        } catch {
          // Refresh failed — clear tokens silently, do NOT redirect
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }

      // No tokens at all — just reject silently (guest user)
      // Only redirect if it's a page that truly needs auth AND user tried to access it directly
      // (handled at page/component level, not here)
    }

    return Promise.reject(error);
  },
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  register:       (data: any)             => api.post('/auth/register', data),
  login:          (data: any)             => api.post('/auth/login', data),
  logout:         (refreshToken: string)  => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (data: any)             => api.post('/auth/forgot-password', data),
  resetPassword:  (data: any)             => api.post('/auth/reset-password', data),
  me:             ()                      => api.get('/auth/me'),
};

// ─── Products ──────────────────────────────────────────────────────────────
export const productsApi = {
  getAll:    (params?: any)  => api.get('/products', { params }),
  getBySlug: (slug: string)  => api.get(`/products/${slug}`),
};

// ─── Categories ────────────────────────────────────────────────────────────
// CategoryQueryDto only supports: page, limit, search, parentId
// isActive is NOT a supported query param — filtering is done by backend automatically
export const categoriesApi = {
  getAll: (params?: any) => {
    const { isActive: _drop, ...rest } = params ?? {};
    return api.get('/categories', { params: rest });
  },
  getBySlug: (slug: string) => api.get(`/categories/${slug}`),
};

// ─── Hero Banners (public) ─────────────────────────────────────────────────
// Route is under dashboard controller: GET /dashboard/hero-banners (public)
export const heroBannersApi = {
  getActive: () => api.get('/dashboard/hero-banners'),
};

// ─── Cart (works for guests too — no auth required) ────────────────────────
export const cartApi = {
  get:          (guestId?: string) =>
    api.get('/cart', {
      headers: guestId ? { 'X-Guest-ID': guestId } : {},
    }),
  add:          (data: any, guestId?: string) =>
    api.post('/cart/add', data, {
      headers: guestId ? { 'X-Guest-ID': guestId } : {},
    }),
  updateItem:   (itemId: string, data: any) =>
    api.patch(`/cart/items/${itemId}`, data),
  removeItem:   (itemId: string) =>
    api.delete(`/cart/items/${itemId}`),
  clear:        () => api.delete('/cart/clear'),
  applyCoupon:  (code: string) => api.post('/cart/coupon', { code }),
  removeCoupon: () => api.delete('/cart/coupon'),
  merge:        (guestId: string) => api.post('/cart/merge', { guestId }),
};

// ─── Wishlist ──────────────────────────────────────────────────────────────
export const wishlistApi = {
  get:    ()                   => api.get('/wishlist'),
  add:    (productId: string)  => api.post(`/wishlist/${productId}`),
  remove: (productId: string)  => api.delete(`/wishlist/${productId}`),
  check:  (productId: string)  => api.get(`/wishlist/${productId}/check`),
};

// ─── Orders ────────────────────────────────────────────────────────────────
export const ordersApi = {
  create:      (data: any)     => api.post('/orders', data),
  getMyOrders: (params?: any)  => api.get('/orders/my', { params }),
  getById:     (id: string)    => api.get(`/orders/my/${id}`),
  cancel:      (id: string)    => api.patch(`/orders/my/${id}/cancel`),
};

// ─── Users / Profile ───────────────────────────────────────────────────────
export const usersApi = {
  getMe:         ()                          => api.get('/users/me'),
  updateMe:      (data: any)                 => api.patch('/users/me', data),
  getAddresses:  ()                          => api.get('/users/me/addresses'),
  createAddress: (data: any)                 => api.post('/users/me/addresses', data),
  updateAddress: (id: string, data: any)     => api.patch(`/users/me/addresses/${id}`, data),
  deleteAddress: (id: string)                => api.delete(`/users/me/addresses/${id}`),
};

// ─── Search ────────────────────────────────────────────────────────────────
export const searchApi = {
  search: (q: string, params?: any) => {
    // Ensure numeric params are sent as numbers, not strings
    const cleaned: Record<string, any> = { q };
    if (params?.sort)     cleaned.sort = params.sort;
    if (params?.limit)    cleaned.limit = Number(params.limit);
    if (params?.page)     cleaned.page = Number(params.page);
    if (params?.minPrice) cleaned.minPrice = Number(params.minPrice);
    if (params?.maxPrice) cleaned.maxPrice = Number(params.maxPrice);
    if (params?.category) cleaned.category = params.category;
    if (params?.gender)   cleaned.gender = params.gender;
    if (params?.brand)    cleaned.brand = params.brand;
    if (params?.size)     cleaned.size = params.size;
    if (params?.color)    cleaned.color = params.color;
    return api.get('/search', { params: cleaned });
  },
  suggestions: (q: string) =>
    api.get('/search/suggestions', { params: { q } }),
};

// ─── Payments ──────────────────────────────────────────────────────────────
export const paymentsApi = {
  createOrder:  (orderId: string) =>
    api.post('/payments/create-order', { orderId }),
  verifyPayment: (data: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    method?: string;
  }) => api.post('/payments/verify', data),
  getByOrder:   (orderId: string) => api.get(`/payments/${orderId}`),
};

// ─── Reviews ───────────────────────────────────────────────────────────────
export const reviewsApi = {
  getByProduct: (productId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/reviews/product/${productId}`, {
      params: {
        page:  Number(params?.page ?? 1),
        limit: Number(params?.limit ?? 10),
      },
    }),
  create: (productId: string, data: { rating: number; title?: string; body?: string }) =>
    api.post(`/reviews/product/${productId}`, data),
  delete: (reviewId: string) => api.delete(`/reviews/${reviewId}`),
};

// ─── Returns ───────────────────────────────────────────────────────────────
export const returnsApi = {
  getMyReturns: ()                           => api.get('/returns/my'),
  create:       (orderId: string, data: any) => api.post(`/returns/${orderId}`, data),
};

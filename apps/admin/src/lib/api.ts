import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('adminAccessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken =
        typeof window !== 'undefined' ? localStorage.getItem('adminRefreshToken') : null;
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          const tokens = data?.data ?? data;
          localStorage.setItem('adminAccessToken', tokens.accessToken);
          localStorage.setItem('adminRefreshToken', tokens.refreshToken);
          original.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return api(original);
        } catch {
          localStorage.removeItem('adminAccessToken');
          localStorage.removeItem('adminRefreshToken');
          if (typeof window !== 'undefined') window.location.href = '/auth/login';
        }
      } else if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  },
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login:   (data: any) => api.post('/auth/login', data),
  logout:  (rt: string) => api.post('/auth/logout', { refreshToken: rt }),
  me:      () => api.get('/users/me'),
  verify2FA: (body: { tempToken: string; token: string }) =>
    api.post('/auth/2fa/verify', body),
};

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats:        () => api.get('/analytics/overview'),
  getRevenue:      (period?: string) => api.get('/analytics/revenue', { params: { period: period === '30d' ? 'month' : (period ?? 'month') } }),
  getTopProducts:  () => api.get('/analytics/products/best-selling', { params: { limit: 5 } }),
  getRecentOrders: () => api.get('/orders/admin', { params: { limit: 8 } }),
};

// ─── Products ──────────────────────────────────────────────────────────────
export const productsApi = {
  getAll:    (params?: any)             => api.get('/products', { params }),
  getById:   (id: string)               => api.get(`/products/${id}`),
  create:    (data: any)                => api.post('/products', data),
  update:    (id: string, data: any)    => api.patch(`/products/${id}`, data),
  delete:    (id: string)               => api.delete(`/products/${id}`),
  createVariant: (id: string, data: any) => api.post(`/products/${id}/variants`, data),
  updateVariant: (id: string, vid: string, data: any) => api.patch(`/products/${id}/variants/${vid}`, data),
};

// ─── Categories ────────────────────────────────────────────────────────────
export const categoriesApi = {
  getAll:  (params?: any)            => api.get('/categories', { params }),
  getById: (id: string)              => api.get(`/categories/${id}`),
  create:  (data: any)               => api.post('/categories', data),
  update:  (id: string, data: any)   => api.patch(`/categories/${id}`, data),
  delete:  (id: string)              => api.delete(`/categories/${id}`),
};

// ─── Orders ────────────────────────────────────────────────────────────────
export const ordersApi = {
  getAll:      (params?: any)          => api.get('/orders/admin', { params }),
  getStats:    ()                       => api.get('/orders/admin/stats'),
  getById:     (id: string)             => api.get(`/orders/admin/${id}`),
  updateStatus: (id: string, data: any) => api.patch(`/orders/admin/${id}/status`, data),
};

// ─── Users / Customers ─────────────────────────────────────────────────────
export const usersApi = {
  getAll:     (params?: any)           => api.get('/users', { params }),
  getById:    (id: string)              => api.get(`/users/${id}`),
  updateRole: (id: string, role: string) => api.patch(`/users/${id}/role`, { role }),
  deactivate: (id: string)              => api.delete(`/users/${id}`),
  getMe:      ()                        => api.get('/users/me'),
};

// ─── Coupons ───────────────────────────────────────────────────────────────
export const couponsApi = {
  getAll:  (params?: any)            => api.get('/coupons', { params }),
  getById: (id: string)              => api.get(`/coupons/${id}`),
  create:  (data: any)               => api.post('/coupons', data),
  update:  (id: string, data: any)   => api.patch(`/coupons/${id}`, data),
  delete:  (id: string)              => api.delete(`/coupons/${id}`),
};

// ─── Reviews ───────────────────────────────────────────────────────────────
export const reviewsApi = {
  getPending: (params?: any) => api.get('/reviews/admin/pending', { params }),
  approve:    (id: string)   => api.patch(`/reviews/admin/${id}/approve`),
  delete:     (id: string)   => api.delete(`/reviews/admin/${id}`),
};

// ─── Returns ───────────────────────────────────────────────────────────────
export const returnsApi = {
  getAll:  (params?: any)            => api.get('/returns/admin', { params }),
  getById: (id: string)              => api.get(`/returns/admin/${id}`),
  update:  (id: string, data: any)   => api.patch(`/returns/admin/${id}`, data),
};

// ─── Inventory ─────────────────────────────────────────────────────────────
export const inventoryApi = {
  // search is NOT in InventoryQueryDto — filtering is done client-side
  getAll:      (params?: any) => {
    const { search: _search, ...rest } = params ?? {};
    return api.get('/inventory', { params: rest });
  },
  getLowStock: () => api.get('/inventory/alerts'),                          // correct endpoint
  update:      (variantId: string, stock: number) =>
    api.patch(`/inventory/variant/${variantId}`, { stock }),                // correct path
};

// ─── Hero Banners ──────────────────────────────────────────────────────────
// Routes are under dashboard controller: /dashboard/hero-banners
export const heroBannerApi = {
  getAll:  ()                        => api.get('/dashboard/hero-banners/admin'),
  create:  (data: any)               => api.post('/dashboard/hero-banners', data),
  update:  (id: string, data: any)   => api.patch(`/dashboard/hero-banners/${id}`, data),
  delete:  (id: string)              => api.delete(`/dashboard/hero-banners/${id}`),
  reorder: (ids: string[])           => api.patch('/dashboard/hero-banners/reorder', { ids }),
};

// ─── Homepage Builder ──────────────────────────────────────────────────────
// Routes are under dashboard controller: /dashboard/sections
export const homepageApi = {
  getSections: ()                       => api.get('/dashboard/sections/admin'),
  update:      (id: string, data: any)  => api.patch(`/dashboard/sections/${id}`, data),
  create:      (data: any)              => api.post('/dashboard/sections', data),
  delete:      (id: string)             => api.delete(`/dashboard/sections/${id}`),
  reorder:     (ids: string[])          => api.patch('/dashboard/sections/reorder', { ids }),
};

// ─── Media / Uploads ───────────────────────────────────────────────────────
export const uploadsApi = {
  upload:      (formData: FormData)  => api.post('/uploads/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadMulti: (formData: FormData)  => api.post('/uploads/images', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll:      (params?: any)        => api.get('/uploads', { params }),
  delete:      (publicId: string)    => api.delete(`/uploads/${publicId}`),
};

// ─── Analytics ─────────────────────────────────────────────────────────────
export const analyticsApi = {
  getOverview:    ()             => api.get('/analytics/overview'),
  getRevenue:     (params?: any) => api.get('/analytics/revenue', {
    params: { period: params?.period === '7d' ? 'week' : params?.period === '1y' ? 'year' : 'month' },
  }),
  getOrders:      ()             => api.get('/analytics/orders/by-status'),       // groups by status
  getTopProducts: (params?: any) => api.get('/analytics/products/best-selling', {
    params: { limit: params?.limit ?? 10 },
  }),
  getCustomers:   (params?: any) => api.get('/analytics/customers/top', {
    params: { limit: params?.limit ?? 10 },
  }),
  getConversion:  ()             => api.get('/analytics/conversion'),
  getInventory:   ()             => api.get('/analytics/inventory'),
};

// ─── Invoices ──────────────────────────────────────────────────────────────
// No dedicated /invoices route in backend — invoices are part of orders.
// We fetch orders from /orders/admin and display invoice info from each order.
export const invoicesApi = {
  getAll:   (params?: any) => {
    const { search, page, limit } = params ?? {};
    const cleanParams: any = { page: page ?? 1, limit: limit ?? 20 };
    if (search) cleanParams.search = search;   // maps to orderNumber search
    return api.get('/orders/admin', { params: cleanParams });
  },
  download: (id: string)   => api.get(`/invoices/${id}/download`, { responseType: 'blob' }),
};

// ─── Shipping ──────────────────────────────────────────────────────────────
// No zones endpoint in backend — shipping controller only has:
// POST /shipping/rates, GET /shipping/track/:awb, POST /shipping/create/:orderId, POST /shipping/cancel
// Shipments are tracked via orders; zones are managed client-side / not implemented in backend yet.
export const shippingApi = {
  // Zones: not implemented in backend — these will gracefully return empty
  getZones:       ()                      => Promise.resolve({ data: { data: [] } }),
  createZone:     (data: any)             => Promise.resolve({ data }),
  updateZone:     (id: string, data: any) => Promise.resolve({ data }),
  deleteZone:     (id: string)            => Promise.resolve({ data: { id } }),
  // Shipments: fetch shipped/out-for-delivery orders from orders API
  getShipments:   (params?: any)          => api.get('/orders/admin', {
    params: { status: 'SHIPPED', limit: params?.limit ?? 30 },
  }),
  createShipment: (orderId: string)       => api.post(`/shipping/create/${orderId}`),
  trackShipment:  (awb: string)           => api.get(`/shipping/track/${awb}`),
};

// ─── Payments ──────────────────────────────────────────────────────────────
export const paymentsApi = {
  refund: (orderId: string, amount?: number) =>
    api.post(`/payments/refund/${orderId}`, amount ? { amount } : {}),
  getByOrder: (orderId: string) => api.get(`/payments/${orderId}`),
};

// ─── Settings ──────────────────────────────────────────────────────────────
export const settingsApi = {
  getAll:   (group?: string)              => api.get('/settings', { params: group ? { group } : {} }),
  update:   (key: string, value: any)     => api.patch(`/settings/${key}`, { value }),
  updateMany: (settings: Record<string, any>) => api.patch('/settings', { settings }),
};

// ─── Admins ────────────────────────────────────────────────────────────────
export const adminsApi = {
  getAll:   ()                         => api.get('/users', { params: { role: 'ADMIN,MANAGER' } }),
  invite:   (data: any)                => api.post('/auth/register', { ...data, role: data.role ?? 'MANAGER' }),
  updateRole: (id: string, role: string) => api.patch(`/users/${id}/role`, { role }),
  deactivate: (id: string)              => api.delete(`/users/${id}`),
};

// ─── Logs / Activity ───────────────────────────────────────────────────────
export const logsApi = {
  getAll: (params?: any) => api.get('/dashboard/logs', { params }),
};

// ─── Search reindex ────────────────────────────────────────────────────────
export const searchApi = {
  reindex: () => api.post('/search/reindex'),
};

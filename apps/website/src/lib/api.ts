import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token automatically
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  },
);

// Auth endpoints
export const authApi = {
  register: (data: any)          => api.post('/auth/register', data),
  login:    (data: any)          => api.post('/auth/login', data),
  logout:   (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  me:       ()                   => api.get('/auth/me'),
};

// Products
export const productsApi = {
  getAll:    (params?: any)       => api.get('/products', { params }),
  getBySlug: (slug: string)       => api.get(`/products/${slug}`),
};

// Categories
export const categoriesApi = {
  getAll: (params?: any) => api.get('/categories', { params }),
  getBySlug: (slug: string) => api.get(`/categories/${slug}`),
};

// Cart
export const cartApi = {
  get:          (guestId?: string) => api.get('/cart', { headers: guestId ? { 'X-Guest-ID': guestId } : {} }),
  add:          (data: any, guestId?: string) => api.post('/cart/add', data, { headers: guestId ? { 'X-Guest-ID': guestId } : {} }),
  updateItem:   (itemId: string, data: any)   => api.patch(`/cart/items/${itemId}`, data),
  removeItem:   (itemId: string)               => api.delete(`/cart/items/${itemId}`),
  clear:        ()                             => api.delete('/cart/clear'),
  applyCoupon:  (code: string)                 => api.post('/cart/coupon', { code }),
  removeCoupon: ()                             => api.delete('/cart/coupon'),
};

// Wishlist
export const wishlistApi = {
  get:    ()                    => api.get('/wishlist'),
  add:    (productId: string)   => api.post('/wishlist', { productId }),
  remove: (productId: string)   => api.delete(`/wishlist/${productId}`),
  check:  (productId: string)   => api.get(`/wishlist/check/${productId}`),
};

// Orders
export const ordersApi = {
  create:     (data: any)         => api.post('/orders', data),
  getMyOrders: (params?: any)     => api.get('/orders', { params }),
  getById:    (id: string)        => api.get(`/orders/${id}`),
  cancel:     (id: string)        => api.patch(`/orders/${id}/cancel`),
};

// User / Profile
export const usersApi = {
  getMe:           ()            => api.get('/users/me'),
  updateMe:        (data: any)   => api.patch('/users/me', data),
  getAddresses:    ()            => api.get('/users/addresses'),
  createAddress:   (data: any)   => api.post('/users/addresses', data),
  updateAddress:   (id: string, data: any) => api.patch(`/users/addresses/${id}`, data),
  deleteAddress:   (id: string)  => api.delete(`/users/addresses/${id}`),
};

// Search
export const searchApi = {
  search: (q: string, params?: any) => api.get('/search', { params: { q, ...params } }),
};

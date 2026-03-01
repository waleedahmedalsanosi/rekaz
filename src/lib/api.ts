// Frontend API client — talks to Express backend on port 3001 via Vite proxy
const BASE = '/api';

let _token: string | null = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

export function setToken(token: string | null) {
  _token = token;
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }
}

export function getToken() { return _token; }

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('تعذّر الاتصال بالخادم. شغّل: npm start');
  }

  if (!res.ok) {
    let msg = 'حدث خطأ';
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    sendOtp: (phone: string) =>
      request<{ success: boolean }>('POST', '/auth/send-otp', { phone }),
    verifyOtp: (phone: string, code: string, role?: string, name?: string, specialty?: string, city?: string) =>
      request<{ token: string; user: ApiUser }>('POST', '/auth/verify-otp', { phone, code, role, name, specialty, city }),
    adminLogin: (password: string) =>
      request<{ token: string; user: ApiUser }>('POST', '/auth/admin-login', { password }),
    logout: () => request<{ success: boolean }>('POST', '/auth/logout'),
  },

  // ─── Providers ──────────────────────────────────────────────────────────
  providers: {
    list: () => request<ApiProvider[]>('GET', '/providers'),
    get: (id: string) => request<ApiProvider>('GET', `/providers/${id}`),
    services: (id: string) => request<ApiService[]>('GET', `/providers/${id}/services`),
    reviews: (id: string) => request<ApiReview[]>('GET', `/providers/${id}/reviews`),
    updateMe: (data: Partial<ApiProvider & { name: string; phone: string }>) =>
      request<ApiProvider>('PATCH', '/providers/me', data),
  },

  // ─── Services ───────────────────────────────────────────────────────────
  services: {
    list: (providerId?: string) =>
      request<ApiService[]>('GET', `/services${providerId ? `?providerId=${providerId}` : ''}`),
    create: (data: Omit<ApiService, 'id' | 'providerId' | 'createdAt'>) =>
      request<ApiService>('POST', '/services', data),
    update: (id: string, data: Partial<ApiService>) =>
      request<ApiService>('PATCH', `/services/${id}`, data),
    delete: (id: string) =>
      request<{ success: boolean }>('DELETE', `/services/${id}`),
  },

  // ─── Bookings ───────────────────────────────────────────────────────────
  bookings: {
    list: () => request<ApiBooking[]>('GET', '/bookings'),
    create: (data: { serviceId: string; providerId: string; date: string; time: string; neighborhood?: string }) =>
      request<ApiBooking>('POST', '/bookings', data),
    updateStatus: (id: string, status: string) =>
      request<ApiBooking>('PATCH', `/bookings/${id}/status`, { status }),
    pay: (id: string) =>
      request<ApiBooking>('PATCH', `/bookings/${id}/pay`),
    confirm: (id: string) =>
      request<ApiBooking>('PATCH', `/bookings/${id}/confirm`),
  },

  // ─── Messages ───────────────────────────────────────────────────────────
  conversations: {
    list: () => request<ApiConversation[]>('GET', '/conversations'),
    start: (providerId: string) =>
      request<ApiConversation>('POST', '/conversations', { providerId }),
    messages: (id: string) =>
      request<ApiMessage[]>('GET', `/conversations/${id}/messages`),
    send: (id: string, content: string) =>
      request<ApiMessage>('POST', `/conversations/${id}/messages`, { content }),
  },

  // ─── Wallet ─────────────────────────────────────────────────────────────
  wallet: {
    get: () => request<ApiWallet>('GET', '/wallet'),
    transactions: () => request<ApiTransaction[]>('GET', '/wallet/transactions'),
    requestPayout: (amount: number, iban: string) =>
      request<{ id: string; status: string }>('POST', '/wallet/payout', { amount, iban }),
  },

  // ─── Reviews ────────────────────────────────────────────────────────────
  reviews: {
    create: (bookingId: string, rating: number, comment: string) =>
      request<ApiReview>('POST', '/reviews', { bookingId, rating, comment }),
  },

  // ─── Admin ──────────────────────────────────────────────────────────────
  admin: {
    stats: () => request<ApiAdminStats>('GET', '/admin/stats'),
    providers: () => request<ApiProvider[]>('GET', '/admin/providers'),
    verifyProvider: (id: string) =>
      request<{ isVerified: boolean }>('PATCH', `/admin/providers/${id}/verify`),
    disputes: () => request<ApiDispute[]>('GET', '/admin/disputes'),
    resolveDispute: (id: string, resolution: string, favorClient: boolean) =>
      request<{ success: boolean }>('PATCH', `/admin/disputes/${id}`, { resolution, favorClient }),
    payouts: () => request<ApiPayoutRequest[]>('GET', '/admin/payouts'),
    processPayout: (id: string, approved: boolean) =>
      request<{ success: boolean; status: string }>('PATCH', `/admin/payouts/${id}`, { approved }),
    revenue: () => request<{ date: string; commission: number; revenue: number }[]>('GET', '/admin/revenue'),
  },
};

// ─── API Types ────────────────────────────────────────────────────────────
export interface ApiUser {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: 'ADMIN' | 'PROVIDER' | 'CLIENT';
  avatar?: string;
  providerId?: string;
}

export interface ApiProvider {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  avatar?: string;
  city?: string;
  bio?: string;
  coveredNeighborhoods?: string[];
  isVerified?: boolean;
  subscriptionTier?: string;
  reviewCount?: number;
  phone?: string;
  userId?: string;
}

export interface ApiService {
  id: string;
  providerId: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  image?: string;
  isAvailable?: boolean;
  createdAt?: string;
}

export interface ApiBooking {
  id: string;
  customerId: string;
  customerName?: string;
  serviceId: string;
  serviceName?: string;
  providerId: string;
  providerName?: string;
  date: string;
  time: string;
  status: string;
  paymentStatus: string;
  servicePrice: number;
  commission: number;
  totalPrice: number;
  neighborhood?: string;
  clientConfirmed?: boolean;
  providerConfirmed?: boolean;
  reviewId?: string;
  disputeId?: string;
  createdAt?: string;
}

export interface ApiConversation {
  id: string;
  clientId: string;
  clientName: string;
  providerId: string;
  providerName: string;
  providerAvatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount?: number;
}

export interface ApiMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'CLIENT' | 'PROVIDER';
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiWallet {
  id: string;
  providerId: string;
  balance: number;
  pendingBalance: number;
  totalEarned: number;
}

export interface ApiTransaction {
  id: string;
  walletId: string;
  bookingId?: string;
  type: 'CREDIT' | 'DEBIT' | 'PAYOUT';
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

export interface ApiReview {
  id: string;
  bookingId: string;
  customerId: string;
  customerName?: string;
  customerAvatar?: string;
  providerId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ApiDispute {
  id: string;
  bookingId: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
  resolution?: string;
  clientId: string;
  providerId: string;
  clientName: string;
  clientPhone: string;
  providerName: string;
  providerPhone: string;
  createdAt: string;
}

export interface ApiPayoutRequest {
  id: string;
  providerId: string;
  providerName: string;
  amount: number;
  iban: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  createdAt: string;
}

export interface ApiAdminStats {
  totalBookings: number;
  totalSales: number;
  totalCommissions: number;
  providerCount: number;
  platformRating: number;
  openDisputes: number;
  pendingPayouts: number;
  activeSubscriptions: number;
  topProviders: (ApiProvider & { totalIncome: number })[];
}

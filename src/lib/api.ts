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

  if (res.status === 204) return undefined as T;

  const text = await res.text();

  if (text.trimStart().startsWith('<')) {
    console.error('[api] Got HTML instead of JSON from', path, '— proxy misconfiguration');
    throw new Error('خطأ في الاتصال بالخادم — يُرجى المحاولة لاحقاً');
  }

  if (!res.ok) {
    let msg = 'حدث خطأ';
    try { msg = JSON.parse(text).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }

  return JSON.parse(text) as T;
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
    getMe: () => request<ApiProvider>('GET', '/providers/me'),
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
    // Dual-write: create in Node.js (source of truth for UI) then register in
    // .NET (source of truth for escrow/wallet). ExternalId links the two records.
    create: async (data: {
      serviceId: string; providerId: string; date: string; time: string;
      neighborhood?: string; clientId: string; clientName: string; totalPrice: number;
    }): Promise<ApiBooking> => {
      // 1. Create in Node.js — returns the booking with a Node.js UUID
      const nodeBooking = await request<ApiBooking>('POST', '/bookings', {
        serviceId: data.serviceId, providerId: data.providerId,
        date: data.date, time: data.time, neighborhood: data.neighborhood,
      });
      // 2. Register in .NET for escrow tracking (fire-and-forget on failure)
      try {
        await dotnetRequest<DotNetBookingResponseDto>('POST', '/bookings', {
          clientId:   data.clientId,
          clientName: data.clientName,
          merchantId: data.providerId,
          serviceId:  data.serviceId,
          scheduledAt: `${data.date}T${data.time}:00.000Z`,
          totalPrice:  data.totalPrice,
          externalId:  nodeBooking.id,          // link Node.js UUID → .NET record
        } satisfies DotNetBookingCreateDto);
      } catch { /* .NET unavailable — Node.js booking still succeeds */ }
      return nodeBooking;
    },
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
    // Routes to .NET GET /api/wallet/{merchantId}.
    // Response is mapped back to ApiWallet so existing UI state is unaffected.
    get: (merchantId: string) =>
      dotnetRequest<DotNetWalletDto>('GET', `/wallet/${merchantId}`)
        .then(mapDotNetWalletToApi),
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
  workingHours?: WorkingHourEntry[] | null;
}

export interface WorkingHourEntry {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
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

// ─── .NET Backend client ─────────────────────────────────────────────────
// Dev:  requests go to /dotnet-api which Vite proxies to http://localhost:5000
// Prod: VITE_DOTNET_API_URL is set in the Render dashboard (build-time bake-in)
const DOTNET_BASE = import.meta.env.VITE_DOTNET_API_URL
  ? `${import.meta.env.VITE_DOTNET_API_URL}/api`
  : '/dotnet-api/api';

async function dotnetRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${DOTNET_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('تعذّر الاتصال بخادم زينة (.NET). تأكد من تشغيل dotnet run');
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();

  // If the server returns HTML it means a proxy/routing misconfiguration.
  if (text.trimStart().startsWith('<')) {
    console.error('[dotnetApi] Got HTML instead of JSON from', path, '— check DOTNET_API_URL / VITE_DOTNET_API_URL');
    throw new Error('خطأ في الاتصال بخادم زينة — يُرجى المحاولة لاحقاً');
  }

  if (!res.ok) {
    let msg = 'حدث خطأ';
    try { msg = JSON.parse(text).messageAr || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }

  return JSON.parse(text) as T;
}

// ─── Transition mappers ───────────────────────────────────────────────────
// Convert .NET responses into the legacy ApiBooking / ApiWallet shapes so
// UI components that haven't been migrated yet continue to work unchanged.

export function mapDotNetBookingToApi(dto: DotNetBookingResponseDto): ApiBooking {
  // scheduledAt is ISO 8601, e.g. "2024-06-15T14:30:00.0000000"
  const [datePart = '', timePart = ''] = dto.scheduledAt.split('T');
  return {
    id:               dto.id,
    customerId:       '',                          // not exposed by .NET — identity lives in auth context
    customerName:     dto.clientName,
    serviceId:        '',                          // not in .NET response
    providerId:       '',                          // not in .NET response
    providerName:     dto.merchantName,
    date:             datePart,
    time:             timePart.slice(0, 5),        // "HH:mm"
    status:           dto.status.toUpperCase(),    // "Pending" → "PENDING"
    paymentStatus:    'PAID',                      // escrow captured at creation
    servicePrice:     dto.totalPrice,
    commission:       dto.escrowAmount,
    totalPrice:       dto.totalPrice,
  };
}

export function mapDotNetWalletToApi(dto: DotNetWalletDto): ApiWallet {
  return {
    id:             dto.merchantId,
    providerId:     dto.merchantId,
    balance:        dto.availableBalance,
    pendingBalance: dto.pendingBalance,
    totalEarned:    dto.availableBalance + dto.pendingBalance,
  };
}

export const dotnetApi = {
  notifications: {
    getVapidPublicKey: () =>
      dotnetRequest<{ publicKey: string }>('GET', '/notifications/vapid-public-key'),
    subscribe: (dto: DotNetPushSubscriptionDto) =>
      dotnetRequest<{ success: boolean }>('POST', '/notifications/subscribe', dto),
  },
  admin: {
    platformStats: () =>
      dotnetRequest<DotNetPlatformStatsDto>('GET', '/admin/stats'),
  },
  merchants: {
    getAll: () =>
      dotnetRequest<DotNetMerchantDto[]>('GET', '/merchants'),
    updateWorkingHours: (providerRefId: string, workingHoursJson: string) =>
      dotnetRequest<void>('PATCH', `/merchants/${encodeURIComponent(providerRefId)}/working-hours`, { workingHoursJson }),
  },
  bookings: {
    merchantBookings: (merchantId: string) =>
      dotnetRequest<DotNetBookingResponseDto[]>('GET', `/bookings/merchant/${merchantId}`),
    getAvailableMerchants: (serviceId: string, requestedTime: string) =>
      dotnetRequest<DotNetAvailabilityResponseDto>('GET',
        `/bookings/available-merchants?serviceId=${encodeURIComponent(serviceId)}&requestedTime=${encodeURIComponent(requestedTime)}`),
  },
  wallet: {
    get: (merchantId: string) =>
      dotnetRequest<DotNetWalletDto>('GET', `/wallet/${merchantId}`),
    completeBooking: (bookingId: string) =>
      dotnetRequest<DotNetWalletDto>('POST', `/wallet/complete-booking/${bookingId}`),
  },
};

// ─── .NET Backend DTOs (Ziena.Backend — port 5000) ───────────────────────
// These types mirror the C# records in Ziena.Application/DTOs exactly,
// serialised to camelCase by System.Text.Json (ASP.NET Core default).
// Keep in sync with: Ziena.Backend/Ziena.Application/DTOs/

export interface DotNetMerchantDto {
  id: string;
  businessName: string;
  bio: string | null;
  isVerified: boolean;
  commissionRate: number;       // e.g. 0.02 = 2%
  providerRefId: string | null; // Node.js provider ID bridge (e.g. "p1")
}

/** POST /api/bookings — request body */
export interface DotNetBookingCreateDto {
  clientId: string;
  clientName: string;           // display name — client may not exist in .NET DB
  merchantId: string;           // Node.js provider ID (e.g. "p1") resolved via ProviderRefId
  serviceId: string;
  scheduledAt: string;          // ISO 8601 datetime
  totalPrice: number;
  externalId?: string;          // Node.js booking UUID — stored for cross-system lookup
}

/** POST /api/bookings — response body */
export interface DotNetBookingResponseDto {
  id: string;
  clientName: string;
  merchantName: string;
  status: string;               // "Pending" | "Confirmed" | "Completed" | "Cancelled" | "Disputed"
  totalPrice: number;
  escrowAmount: number;         // Math.Ceiling(totalPrice * commissionRate)
  scheduledAt: string;          // ISO 8601 datetime
  externalId: string | null;    // Node.js booking UUID (echoed back)
}

/** GET /api/wallet/{merchantId} · POST /api/wallet/complete-booking/{bookingId} */
export interface DotNetWalletDto {
  merchantId: string;
  availableBalance: number;     // totalEarnings - commissionDeducted
  pendingBalance: number;       // sum of totalPrice for Confirmed bookings
}

/** GET /api/bookings/available-merchants */
export interface DotNetMerchantAvailabilityDto {
  id: string;
  businessName: string;
  bio: string | null;
  isVerified: boolean;
  providerRefId: string | null;
}

export interface DotNetAvailabilityResponseDto {
  isAvailable: boolean;
  availableMerchants: DotNetMerchantAvailabilityDto[];
  suggestedMerchant: DotNetMerchantAvailabilityDto | null;
  suggestedTime: string | null;  // ISO 8601 — null if no suggestion found
}

/** GET /api/admin/stats */
export interface DotNetPlatformStatsDto {
  totalMerchants: number;
  totalBookings: number;
  totalPlatformRevenue: number; // sum of EscrowAmount for all Completed bookings
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

/** POST /api/notifications/subscribe */
export interface DotNetPushSubscriptionDto {
  userRef:   string;  // Node.js provider ID (e.g. "p1")
  endpoint:  string;  // push service URL
  p256dh:    string;  // DH public key (base64url)
  auth:      string;  // auth secret (base64url)
}

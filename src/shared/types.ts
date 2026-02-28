export enum UserRole {
  ADMIN = "ADMIN",
  PROVIDER = "PROVIDER",
  CLIENT = "CLIENT",
}

export enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  DISPUTED = "DISPUTED",
}

export enum PaymentStatus {
  UNPAID = "UNPAID",
  PAID = "PAID",
  REFUNDED = "REFUNDED",
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Customer extends User {
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category: string;
  image?: string;
  isAvailable?: boolean;
}

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  providerId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  customerId: string;
  serviceId: string;
  providerId: string;
  date: string;
  time: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  servicePrice: number;   // سعر الخدمة الأصلي
  commission: number;     // عمولة ركاز 2%
  totalPrice: number;     // servicePrice + commission
  neighborhood?: string;  // حي العميلة
  reviewId?: string;
  clientConfirmed?: boolean;   // العميلة أكدت استلام الخدمة
  providerConfirmed?: boolean; // المبدعة أكدت اكتمال الخدمة
  disputeId?: string;
}

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  avatar?: string;
  city?: string;
  bio?: string;
  coveredNeighborhoods?: string[];
  isVerified?: boolean;
  subscriptionTier?: 'free' | 'basic' | 'pro';
  reviewCount?: number;
}

export interface DashboardStats {
  totalSales: number;
  newCustomers: number;
  totalBookings: number;
  activeSubscriptions: number;
}

export interface Wallet {
  id: string;
  providerId: string;
  balance: number;        // متاح للسحب
  pendingBalance: number; // معلّق حتى تأكيد الخدمة
  totalEarned: number;    // إجمالي الأرباح التاريخية
}

export interface Transaction {
  id: string;
  walletId: string;
  bookingId?: string;
  type: 'CREDIT' | 'DEBIT' | 'PAYOUT';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  description: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
  resolvedBy?: string;
  resolution?: string;
  clientId: string;
  providerId: string;
  clientName: string;
  providerName: string;
  clientPhone: string;
  providerPhone: string;
  createdAt: string;
}

export interface Conversation {
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

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'CLIENT' | 'PROVIDER';
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  providerId: string;
  providerName: string;
  amount: number;
  iban: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: 'مجانية' | 'أساسية' | 'برو';
  priceMonthly: number;
  priceYearly: number;
  maxBookings: number | null;
  maxServices: number | null;
  features: string[];
}

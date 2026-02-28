import {
  BookingStatus, Customer, Service, Booking, Provider, UserRole, PaymentStatus, Review,
  Wallet, Transaction, Dispute, Conversation, Message, PayoutRequest, SubscriptionPlan,
} from "./types";

export const RIYADH_NEIGHBORHOODS = [
  'العليا', 'الملز', 'الروضة', 'الورود', 'النزهة', 'الريان',
  'الغدير', 'الصحافة', 'السليمانية', 'قرطبة', 'حطين', 'الربيع',
  'المرسلات', 'البطحاء', 'الخالدية', 'النسيم', 'الديرة', 'شبرا',
  'أم الحمام', 'لبن', 'العارض',
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: "1", name: "نورة العتيبي", phone: "0582314924", email: "noura@example.com", createdAt: "2026-02-23", role: UserRole.CLIENT },
  { id: "2", name: "سارة القحطاني", phone: "0501234567", email: "sara@example.com", createdAt: "2026-02-24", role: UserRole.CLIENT },
  { id: "3", name: "هيا محمد", phone: "0559876543", email: "haya@example.com", createdAt: "2026-02-25", role: UserRole.CLIENT },
];

export const MOCK_SERVICES: Service[] = [
  { id: "1", name: "مكياج سهرة", description: "مكياج احترافي للمناسبات والسهرا", price: 350, duration: 60, category: "مكياج", image: "https://picsum.photos/seed/makeup1/200/200", isAvailable: true },
  { id: "2", name: "تسريحة شعر ويفي", description: "تسريحة شعر ويفي عصرية", price: 200, duration: 45, category: "شعر", image: "https://picsum.photos/seed/hair1/200/200", isAvailable: true },
  { id: "3", name: "مكياج عروس", description: "باقة مكياج العروس المتكاملة", price: 1500, duration: 180, category: "مكياج", image: "https://picsum.photos/seed/bride/200/200", isAvailable: true },
  { id: "4", name: "صبغة شعر كاملة", description: "تغيير لون الشعر بالكامل مع حماية", price: 600, duration: 150, category: "شعر", image: "https://picsum.photos/seed/haircolor/200/200", isAvailable: true },
];

export const MOCK_PROVIDERS: Provider[] = [
  {
    id: "p1",
    name: "ليلى للمكياج",
    specialty: "خبيرة مكياج",
    rating: 4.9,
    avatar: "https://picsum.photos/seed/mua1/100/100",
    city: "الرياض",
    bio: "خبيرة مكياج احترافية مع أكثر من 5 سنوات خبرة في المناسبات والأفراح. أستخدم أفضل ماركات العالم لضمان أجمل إطلالة.",
    coveredNeighborhoods: ["العليا", "الملز", "الروضة", "الورود", "النزهة"],
    isVerified: true,
    subscriptionTier: 'pro',
    reviewCount: 48,
  },
  {
    id: "p2",
    name: "صالون ريم",
    specialty: "مصففة شعر",
    rating: 4.7,
    avatar: "https://picsum.photos/seed/hairdresser1/100/100",
    city: "الرياض",
    bio: "متخصصة في تصفيف الشعر وصباغته بأحدث الأساليب العصرية. أعمل على جميع أنواع الشعر مع الحفاظ على صحته.",
    coveredNeighborhoods: ["الصحافة", "السليمانية", "قرطبة", "حطين", "الربيع"],
    isVerified: false,
    subscriptionTier: 'basic',
    reviewCount: 31,
  },
];

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: "1",
    customerId: "1",
    serviceId: "1",
    providerId: "p1",
    date: "2026-02-27",
    time: "10:00",
    status: BookingStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PAID,
    servicePrice: 350,
    commission: 7,
    totalPrice: 357,
    neighborhood: "الروضة",
    clientConfirmed: false,
    providerConfirmed: false,
  },
  {
    id: "2",
    customerId: "2",
    serviceId: "2",
    providerId: "p2",
    date: "2026-02-28",
    time: "14:00",
    status: BookingStatus.PENDING,
    paymentStatus: PaymentStatus.PAID,
    servicePrice: 200,
    commission: 4,
    totalPrice: 204,
    neighborhood: "السليمانية",
    clientConfirmed: false,
    providerConfirmed: false,
  },
  {
    id: "3",
    customerId: "3",
    serviceId: "3",
    providerId: "p1",
    date: "2026-02-25",
    time: "11:00",
    status: BookingStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
    servicePrice: 1500,
    commission: 30,
    totalPrice: 1530,
    neighborhood: "العليا",
    reviewId: "r1",
    clientConfirmed: true,
    providerConfirmed: true,
  },
];

export const MOCK_REVIEWS: Review[] = [
  { id: "r1", bookingId: "3", customerId: "3", providerId: "p1", rating: 5, comment: "شغل رائع جداً وتعامل راقي، أنصح بها بشدة!", createdAt: "2026-02-26" },
];

export const MOCK_WALLET: Wallet = {
  id: "w1",
  providerId: "p1",
  balance: 1500,
  pendingBalance: 357,
  totalEarned: 4200,
};

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "t1", walletId: "w1", bookingId: "3", type: "CREDIT", amount: 1500, status: "COMPLETED", description: "مكياج عروس — هيا محمد", createdAt: "2026-02-25" },
  { id: "t2", walletId: "w1", bookingId: "1", type: "CREDIT", amount: 357, status: "PENDING", description: "مكياج سهرة — نورة العتيبي (معلّق)", createdAt: "2026-02-27" },
  { id: "t3", walletId: "w1", type: "PAYOUT", amount: -2200, status: "COMPLETED", description: "سحب أرباح — IBAN SA03...1234", createdAt: "2026-02-20" },
];

export const MOCK_DISPUTES: Dispute[] = [
  {
    id: "d1",
    bookingId: "1",
    reason: "العميلة لم تؤكد استلام الخدمة خلال 24 ساعة",
    status: "OPEN",
    clientId: "1",
    providerId: "p1",
    clientName: "نورة العتيبي",
    providerName: "ليلى للمكياج",
    clientPhone: "0582314924",
    providerPhone: "0501234567",
    createdAt: "2026-02-28",
  },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv1",
    clientId: "1",
    clientName: "نورة العتيبي",
    providerId: "p1",
    providerName: "ليلى للمكياج",
    providerAvatar: "https://picsum.photos/seed/mua1/100/100",
    lastMessage: "بالتوفيق! نتشوق لخدمتك 💄",
    lastMessageAt: "2026-02-27T10:30:00Z",
    unreadCount: 0,
  },
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: "m1",
    conversationId: "conv1",
    senderId: "1",
    senderRole: "CLIENT",
    content: "السلام عليكم، هل متاحة يوم 27 فبراير الساعة 10 صباحاً؟",
    isRead: true,
    createdAt: "2026-02-26T09:00:00Z",
  },
  {
    id: "m2",
    conversationId: "conv1",
    senderId: "p1",
    senderRole: "PROVIDER",
    content: "وعليكم السلام! نعم، متاحة. يسعدني خدمتك إن شاء الله 😊",
    isRead: true,
    createdAt: "2026-02-26T09:15:00Z",
  },
  {
    id: "m3",
    conversationId: "conv1",
    senderId: "1",
    senderRole: "CLIENT",
    content: "ممتاز! سأحجز الآن شكراً",
    isRead: true,
    createdAt: "2026-02-26T09:20:00Z",
  },
  {
    id: "m4",
    conversationId: "conv1",
    senderId: "p1",
    senderRole: "PROVIDER",
    content: "بالتوفيق! نتشوق لخدمتك 💄",
    isRead: true,
    createdAt: "2026-02-27T10:30:00Z",
  },
];

export const MOCK_PAYOUT_REQUESTS: PayoutRequest[] = [
  {
    id: "pay1",
    providerId: "p2",
    providerName: "صالون ريم",
    amount: 800,
    iban: "SA0380000000608010167519",
    status: "PENDING",
    createdAt: "2026-02-27",
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "مجانية",
    priceMonthly: 0,
    priceYearly: 0,
    maxBookings: 10,
    maxServices: 5,
    features: ["ملف شخصي أساسي"],
  },
  {
    id: "basic",
    name: "أساسية",
    priceMonthly: 49,
    priceYearly: 470,
    maxBookings: 50,
    maxServices: 20,
    features: ["إحصائيات كاملة", "كوبونات الخصم", "تقارير مالية"],
  },
  {
    id: "pro",
    name: "برو",
    priceMonthly: 99,
    priceYearly: 950,
    maxBookings: null,
    maxServices: null,
    features: ["كل مميزات الأساسية", "أولوية في نتائج البحث", "دعم فني مخصص", "تقارير متقدمة"],
  },
];

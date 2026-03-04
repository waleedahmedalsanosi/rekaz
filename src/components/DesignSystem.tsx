import React from 'react';
import { 
  Star, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Calendar, 
  User, 
  ArrowLeft,
  Search,
  Plus,
  ChevronRight,
  RefreshCw,
  CreditCard
} from 'lucide-react';

/**
 * Design System Tokens
 */
export const tokens = {
  colors: {
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316', // Brand Primary
      600: '#ea580c',
      700: '#c2410c',
    },
    neutral: {
      50: '#F8F9FA',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      900: '#1A1A1A', // Brand Ink
    },
    semantic: {
      success: {
        bg: '#f0fdf4',
        text: '#16a34a',
        border: '#dcfce7',
      },
      warning: {
        bg: '#fff7ed',
        text: '#ea580c',
        border: '#ffedd5',
      },
      error: {
        bg: '#fef2f2',
        text: '#dc2626',
        border: '#fee2e2',
      },
      info: {
        bg: '#eff6ff',
        text: '#2563eb',
        border: '#dbeafe',
      }
    }
  },
  radius: {
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  }
};

/**
 * Reusable UI Components based on the Design System
 */

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '',
  icon: Icon,
  ...props 
}: any) => {
  const variants: any = {
    primary: 'bg-black text-white shadow-lg shadow-black/10 active:scale-95',
    secondary: 'bg-orange-600 text-white shadow-lg shadow-orange-200 active:scale-95',
    outline: 'bg-white border border-gray-100 text-gray-600 active:bg-gray-50',
    ghost: 'bg-transparent text-gray-500 hover:bg-gray-50',
  };

  const sizes: any = {
    sm: 'px-4 py-2 text-xs rounded-xl',
    md: 'px-6 py-4 text-sm rounded-2xl font-bold',
    lg: 'px-8 py-5 text-lg rounded-3xl font-black',
  };

  return (
    <button 
      className={`flex items-center justify-center gap-2 transition-all ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 18} />}
      {children}
    </button>
  );
};

export const Card = ({ children, className = '', padding = 'p-6' }: any) => (
  <div className={`bg-white rounded-[32px] border border-gray-100 shadow-sm ${padding} ${className}`}>
    {children}
  </div>
);

export const Badge = ({ children, variant = 'info' }: any) => {
  const styles: any = {
    success: 'bg-green-50 text-green-600',
    warning: 'bg-orange-50 text-orange-600',
    error: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600',
  };

  return (
    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${styles[variant]}`}>
      {children}
    </span>
  );
};

/**
 * Visual Documentation Component
 */
export default function DesignSystem() {
  return (
    <div className="p-8 space-y-12 bg-[#F8F9FA] min-h-screen" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight">نظام التصميم (Design System)</h1>
        <p className="text-gray-500">الدليل الكامل للهوية البصرية وتجربة المستخدم للمنصة.</p>
      </header>

      {/* Colors */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b pb-2">الألوان (Colors)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-20 bg-[#f97316] rounded-2xl shadow-inner"></div>
            <p className="text-sm font-bold">اللون الأساسي (Primary)</p>
            <p className="text-xs text-gray-400">#f97316</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-[#1A1A1A] rounded-2xl shadow-inner"></div>
            <p className="text-sm font-bold">لون النص (Ink)</p>
            <p className="text-xs text-gray-400">#1A1A1A</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-white border border-gray-200 rounded-2xl shadow-inner"></div>
            <p className="text-sm font-bold">الخلفية (Background)</p>
            <p className="text-xs text-gray-400">#FFFFFF</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-[#F8F9FA] rounded-2xl shadow-inner"></div>
            <p className="text-sm font-bold">خلفية الصفحة (Surface)</p>
            <p className="text-xs text-gray-400">#F8F9FA</p>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b pb-2">الخطوط (Typography)</h2>
        <div className="space-y-6 bg-white p-8 rounded-[32px] border border-gray-100">
          <div className="space-y-1">
            <p className="text-xs text-gray-400 font-mono">Heading 1 / Black / 36px</p>
            <h1 className="text-4xl font-black">أهلاً بك في عالم الجمال</h1>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400 font-mono">Heading 2 / Bold / 24px</p>
            <h2 className="text-2xl font-bold">خدمات المكياج والشعر</h2>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400 font-mono">Body / Medium / 16px</p>
            <p className="text-base font-medium text-gray-600">هذا النص هو مثال لنص يمكن أن يستبدل في نفس المساحة، لقد تم توليد هذا النص من مولد النص العربى.</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400 font-mono">Caption / Bold / 12px</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">آخر التحديثات اليوم</p>
          </div>
        </div>
      </section>

      {/* Spacing System */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b pb-2">نظام المسافات (Spacing System - 8pt Grid)</h2>
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 flex flex-wrap items-end gap-8">
          {[
            { label: 'xs', size: '4px', w: 'w-1' },
            { label: 'sm', size: '8px', w: 'w-2' },
            { label: 'md', size: '16px', w: 'w-4' },
            { label: 'lg', size: '24px', w: 'w-6' },
            { label: 'xl', size: '32px', w: 'w-8' },
            { label: '2xl', size: '48px', w: 'w-12' },
            { label: '3xl', size: '64px', w: 'w-16' },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`${s.w} h-12 bg-orange-200 rounded-md`}></div>
              <p className="text-[10px] font-bold font-mono">{s.label}</p>
              <p className="text-[8px] text-gray-400">{s.size}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Elevation & Shadows */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b pb-2">الظلال والارتفاع (Elevation & Shadows)</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="p-8 bg-white rounded-2xl shadow-sm border border-gray-50 text-center">
            <p className="text-xs font-bold">Shadow Sm</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-md border border-gray-50 text-center">
            <p className="text-xs font-bold">Shadow Md</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-lg border border-gray-50 text-center">
            <p className="text-xs font-bold">Shadow Lg</p>
          </div>
          <div className="p-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 text-center">
            <p className="text-xs font-bold">Glassmorphism</p>
          </div>
        </div>
      </section>

      {/* Interaction States */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b pb-2">حالات التفاعل (Interaction States)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="space-y-6">
            <h3 className="font-bold text-lg">الأزرار (States)</h3>
            <div className="flex flex-wrap gap-6">
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Default</p>
                <Button>تأكيد</Button>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Hover</p>
                <Button className="brightness-90 scale-[1.02]">تأكيد</Button>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Active</p>
                <Button className="scale-95">تأكيد</Button>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Disabled</p>
                <Button className="opacity-40 cursor-not-allowed active:scale-100">تأكيد</Button>
              </div>
            </div>
          </Card>

          <Card className="space-y-6">
            <h3 className="font-bold text-lg">الحقول (States)</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Default</p>
                <input placeholder="اكتبي هنا..." className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm font-medium" />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Focus</p>
                <input placeholder="اكتبي هنا..." className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm font-medium ring-2 ring-orange-500" />
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Components */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b pb-2">المكونات (Components)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Buttons */}
          <Card className="space-y-6">
            <h3 className="font-bold text-lg">الأزرار (Buttons)</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">زر أساسي</Button>
              <Button variant="secondary" icon={Plus}>إضافة جديد</Button>
              <Button variant="outline">زر فرعي</Button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="sm" variant="primary">صغير</Button>
              <Button size="md" variant="primary">متوسط</Button>
              <Button size="lg" variant="primary">كبير جداً</Button>
            </div>
          </Card>

          {/* Badges */}
          <Card className="space-y-6">
            <h3 className="font-bold text-lg">الأوسمة (Badges)</h3>
            <div className="flex flex-wrap gap-4">
              <Badge variant="success">مؤكد</Badge>
              <Badge variant="warning">قيد الانتظار</Badge>
              <Badge variant="error">ملغي</Badge>
              <Badge variant="info">مكتمل</Badge>
            </div>
          </Card>

          {/* Inputs */}
          <Card className="space-y-6">
            <h3 className="font-bold text-lg">الحقول (Inputs)</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400">حقل نصي</label>
                <input placeholder="اكتبي هنا..." className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-orange-500" />
              </div>
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input placeholder="بحث..." className="w-full bg-gray-50 border-none rounded-2xl pr-12 pl-4 py-4 text-sm font-medium focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>
          </Card>

          {/* Interaction */}
          <Card className="space-y-6">
            <h3 className="font-bold text-lg">العناصر التفاعلية</h3>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
                <Calendar size={24} />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                <CheckCircle size={24} />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <RefreshCw size={24} />
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Layout Examples */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b pb-2">أمثلة البطاقات (Card Examples)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Star size={24} fill="currentColor" />
            </div>
            <div>
              <h4 className="font-bold">تقييم ممتاز</h4>
              <p className="text-xs text-gray-400">4.9 من 5 نجوم</p>
            </div>
          </Card>

          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
              <CreditCard size={24} />
            </div>
            <div>
              <h4 className="font-bold">مدفوع بالكامل</h4>
              <p className="text-xs text-gray-400">تمت العملية بنجاح</p>
            </div>
          </Card>

          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Clock size={24} />
            </div>
            <div>
              <h4 className="font-bold">موعد قادم</h4>
              <p className="text-xs text-gray-400">بعد ساعتين من الآن</p>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

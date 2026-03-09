/**
 * Error Handling Utilities
 * Provides consistent error handling across the app
 */

export interface AppError {
  message: string;
  field?: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
}

/**
 * Parse different types of errors into a consistent format
 */
export function parseError(error: any): AppError {
  // Network/fetch errors
  if (error instanceof TypeError) {
    if (error.message.includes('fetch')) {
      return {
        message: 'فشل الاتصال بالخادم. تحقق من اتصالك بالإنترنت.',
        code: 'NETWORK_ERROR',
        statusCode: 0,
      };
    }
    return {
      message: 'حدث خطأ: ' + error.message,
      code: 'TYPE_ERROR',
    };
  }

  // API response errors
  if (error.statusCode) {
    return {
      message: getErrorMessage(error.statusCode, error.message),
      code: error.code || `HTTP_${error.statusCode}`,
      statusCode: error.statusCode,
      field: error.field,
      details: error.details,
    };
  }

  // String messages
  if (typeof error === 'string') {
    return {
      message: error,
    };
  }

  // Error with message property
  if (error?.message) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      field: error.field,
    };
  }

  // Unknown error
  return {
    message: 'حدث خطأ غير متوقع',
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Get user-friendly error message based on status code
 */
function getErrorMessage(statusCode: number, originalMessage?: string): string {
  const messages: Record<number, string> = {
    400: 'البيانات المدخلة غير صحيحة',
    401: 'جلسة انتهت. يرجى تسجيل الدخول مرة أخرى',
    403: 'لا توجد صلاحيات كافية لتنفيذ هذا الإجراء',
    404: 'المورد المطلوب غير موجود',
    409: 'البيانات متعارضة. قد تكون غيّرت من قبل شخص آخر',
    422: 'البيانات غير صالحة. تحقق من إدخالاتك',
    429: 'محاولات كثيرة. يرجى الانتظار قبل المحاولة مرة أخرى',
    500: 'خطأ في الخادم. يرجى المحاولة لاحقاً',
    502: 'الخادم غير متاح حالياً',
    503: 'الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً',
  };

  return messages[statusCode] || originalMessage || 'حدث خطأ. يرجى المحاولة مرة أخرى';
}

/**
 * Extract field-level errors from API response
 */
export function extractFieldErrors(error: any): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  // Handle validation errors
  if (error.details?.errors) {
    Object.entries(error.details.errors).forEach(([field, messages]: any) => {
      if (Array.isArray(messages)) {
        fieldErrors[field] = messages[0];
      } else if (typeof messages === 'string') {
        fieldErrors[field] = messages;
      }
    });
  }

  // Handle single field error
  if (error.field && error.message) {
    fieldErrors[error.field] = error.message;
  }

  return fieldErrors;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  return error.code === 'NETWORK_ERROR' || error.statusCode === 0;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: any): boolean {
  return error.statusCode === 400 || error.statusCode === 422;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: any): boolean {
  return error.statusCode === 401 || error.statusCode === 403;
}

/**
 * Get retry-able status codes
 */
export function isRetryable(statusCode?: number): boolean {
  if (!statusCode) return true; // Network errors are retry-able
  return [408, 429, 500, 502, 503, 504].includes(statusCode);
}

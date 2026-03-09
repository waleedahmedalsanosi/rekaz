/**
 * Form Validation Utilities
 * Provides validation functions for common form fields
 */

export type ValidationRule = {
  required?: boolean | string;
  minLength?: number | string;
  maxLength?: number | string;
  pattern?: RegExp | string;
  custom?: (value: any) => string | null;
};

export type ValidationResult = {
  isValid: boolean;
  error: string | null;
};

/**
 * Validate a single field value against rules
 */
export function validateField(value: any, rules: ValidationRule): ValidationResult {
  // Check required
  if (rules.required) {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return {
        isValid: false,
        error: typeof rules.required === 'string' ? rules.required : 'هذا الحقل مطلوب',
      };
    }
  }

  // Skip other checks if value is empty and not required
  if (!value) return { isValid: true, error: null };

  // Check min length
  if (rules.minLength) {
    const minLen = typeof rules.minLength === 'string' ? parseInt(rules.minLength) : rules.minLength;
    if (String(value).length < minLen) {
      return {
        isValid: false,
        error: `يجب أن يكون الحد الأدنى ${minLen} أحرف`,
      };
    }
  }

  // Check max length
  if (rules.maxLength) {
    const maxLen = typeof rules.maxLength === 'string' ? parseInt(rules.maxLength) : rules.maxLength;
    if (String(value).length > maxLen) {
      return {
        isValid: false,
        error: `يجب ألا يتجاوز ${maxLen} أحرف`,
      };
    }
  }

  // Check pattern
  if (rules.pattern) {
    const pattern = typeof rules.pattern === 'string' ? new RegExp(rules.pattern) : rules.pattern;
    if (!pattern.test(String(value))) {
      return {
        isValid: false,
        error: 'الصيغة غير صحيحة',
      };
    }
  }

  // Check custom validation
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      return { isValid: false, error: customError };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Common validation patterns
 */
export const patterns = {
  // Saudi phone number: +966XXXXXXXXX or 0XXXXXXXXX
  phone: /^(\+966|0)[0-9]{9}$/,
  // Email pattern
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // IBAN pattern
  iban: /^SA\d{22}$/,
  // Card number (basic check)
  cardNumber: /^\d{13,19}$/,
};

/**
 * Common validation rules
 */
export const rules = {
  name: {
    required: 'اسم مطلوب',
    minLength: 2,
    maxLength: 100,
  } as ValidationRule,

  phone: {
    required: 'رقم الهاتف مطلوب',
    pattern: patterns.phone,
  } as ValidationRule,

  email: {
    required: 'البريد الإلكتروني مطلوب',
    pattern: patterns.email,
  } as ValidationRule,

  password: {
    required: 'كلمة المرور مطلوبة',
    minLength: 6,
  } as ValidationRule,

  iban: {
    required: 'رقم الآيبان مطلوب',
    pattern: patterns.iban,
  } as ValidationRule,

  bio: {
    maxLength: 500,
  } as ValidationRule,

  amount: {
    required: 'المبلغ مطلوب',
    custom: (val) => {
      const num = parseFloat(val);
      if (isNaN(num) || num <= 0) return 'المبلغ يجب أن يكون أكبر من صفر';
      return null;
    },
  } as ValidationRule,
};

/**
 * Validate a form object against a schema
 */
export function validateForm(
  formData: Record<string, any>,
  schema: Record<string, ValidationRule>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [field, fieldRules] of Object.entries(schema)) {
    const result = validateField(formData[field], fieldRules);
    if (!result.isValid && result.error) {
      errors[field] = result.error;
    }
  }

  return errors;
}

/**
 * Check if form has any errors
 */
export function hasErrors(errors: Record<string, any>): boolean {
  return Object.values(errors).some(e => e);
}

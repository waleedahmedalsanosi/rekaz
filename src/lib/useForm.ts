/**
 * Custom hook for form management with validation
 */

import React, { useState, useCallback } from 'react';
import { validateField, validateForm, ValidationRule } from './validation';

export interface FormOptions {
  schema?: Record<string, ValidationRule>;
  onSubmit?: (data: any) => Promise<void> | void;
  initialValues?: Record<string, any>;
}

export function useForm(options: FormOptions) {
  const { schema = {}, onSubmit, initialValues = {} } = options;

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle field change with real-time validation
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = e.target as any;
    const fieldValue = type === 'checkbox' ? checked : value;

    setValues(prev => ({ ...prev, [name]: fieldValue }));

    // Real-time validation for touched fields
    if (touched[name] && schema[name]) {
      const result = validateField(fieldValue, schema[name]);
      setErrors(prev => ({
        ...prev,
        [name]: result.error || '',
      }));
    }
  }, [schema, touched]);

  // Mark field as touched
  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    // Validate on blur
    if (schema[name]) {
      const result = validateField(values[name], schema[name]);
      setErrors(prev => ({
        ...prev,
        [name]: result.error || '',
      }));
    }
  }, [schema, values]);

  // Handle form submission
  const handleSubmit = useCallback(async (
    e?: React.FormEvent<HTMLFormElement>
  ) => {
    if (e) {
      e.preventDefault();
    }

    // Mark all fields as touched
    const newTouched: Record<string, boolean> = {};
    Object.keys(schema).forEach(key => {
      newTouched[key] = true;
    });
    setTouched(newTouched);

    // Validate all fields
    const newErrors = validateForm(values, schema);
    setErrors(newErrors);

    // If there are errors, don't submit
    if (Object.values(newErrors).some(err => err)) {
      return;
    }

    // Call onSubmit if no errors
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [schema, values, onSubmit]);

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Set field value programmatically
  const setFieldValue = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  // Set field error programmatically
  const setFieldError = useCallback((name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  // Get field props for input
  const getFieldProps = useCallback((name: string) => ({
    name,
    value: values[name] || '',
    onChange: handleChange,
    onBlur: handleBlur,
  }), [values, handleChange, handleBlur]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
    getFieldProps,
  };
}

'use client';

import { useCallback } from 'react';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    clarity?: (...args: any[]) => void;
  }
}

interface EventProps {
  action: string;
  category: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

/**
 * Provides analytics tracking functions for Google Analytics and Microsoft Clarity.
 *
 * Returns an object with methods to track events, page views, user properties, conversions, custom Clarity events, form submissions, errors, and timing metrics. All methods are safe to use in React components and guard against execution in non-browser environments.
 *
 * @returns An object containing analytics tracking methods for use in React components.
 */
export function useAnalytics() {
  // Google Analytics event tracking
  const trackEvent = useCallback((props: EventProps) => {
    const { action, category, label, value, ...otherProps } = props;
    
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
        ...otherProps,
      });
    }
  }, []);

  // Track page views
  const trackPageView = useCallback((url: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID!, {
        page_path: url,
      });
    }
  }, []);

  // Track custom user properties
  const setUserProperties = useCallback((properties: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('set', 'user_properties', properties);
    }
  }, []);

  // Track conversions
  const trackConversion = useCallback((conversionId: string, value?: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'conversion', {
        send_to: conversionId,
        value: value,
        currency: 'KRW',
      });
    }
  }, []);

  // Microsoft Clarity custom events
  const trackClarityEvent = useCallback((eventName: string, customData?: any) => {
    if (typeof window !== 'undefined' && window.clarity) {
      window.clarity('set', eventName, customData);
    }
  }, []);

  // Track form submissions
  const trackFormSubmission = useCallback((formName: string, success: boolean) => {
    trackEvent({
      action: 'form_submit',
      category: 'Form',
      label: formName,
      value: success ? 1 : 0,
    });
    
    trackClarityEvent('form_submission', {
      form: formName,
      success,
    });
  }, [trackEvent, trackClarityEvent]);

  // Track errors
  const trackError = useCallback((error: string, fatal: boolean = false) => {
    trackEvent({
      action: 'exception',
      category: 'Error',
      label: error,
      value: fatal ? 1 : 0,
    });
    
    trackClarityEvent('error', {
      message: error,
      fatal,
    });
  }, [trackEvent, trackClarityEvent]);

  // Track timing
  const trackTiming = useCallback((category: string, variable: string, value: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: variable,
        value: Math.round(value),
        event_category: category,
      });
    }
  }, []);

  return {
    trackEvent,
    trackPageView,
    setUserProperties,
    trackConversion,
    trackClarityEvent,
    trackFormSubmission,
    trackError,
    trackTiming,
  };
}
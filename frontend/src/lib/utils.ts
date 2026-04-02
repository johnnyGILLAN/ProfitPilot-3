import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
];

export const EXPENSE_CATEGORIES = [
  'Marketing', 'Software', 'Office Supplies', 'Travel', 'Meals',
  'Professional Services', 'Equipment', 'Utilities', 'Rent', 'Insurance',
  'Subscriptions', 'Other'
];

export const INCOME_CATEGORIES = [
  'Freelance', 'Consulting', 'Product Sales', 'Service Revenue',
  'Affiliate Income', 'Investments', 'Refunds', 'Other'
];

export const TAX_RATES: Record<string, { rate: number; name: string }> = {
  US: { rate: 0.22, name: 'United States (22%)' },
  UK: { rate: 0.20, name: 'United Kingdom (20%)' },
  CA: { rate: 0.15, name: 'Canada (15%)' },
  AU: { rate: 0.325, name: 'Australia (32.5%)' },
  DE: { rate: 0.30, name: 'Germany (30%)' },
  FR: { rate: 0.25, name: 'France (25%)' },
  IN: { rate: 0.30, name: 'India (30%)' },
  SG: { rate: 0.17, name: 'Singapore (17%)' },
  AE: { rate: 0.09, name: 'UAE (9%)' },
  JP: { rate: 0.23, name: 'Japan (23%)' },
  NL: { rate: 0.255, name: 'Netherlands (25.5%)' },
};

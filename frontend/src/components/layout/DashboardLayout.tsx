'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your financial health' },
  '/transactions': { title: 'Transactions', subtitle: 'Manage your income and expenses' },
  '/recurring': { title: 'Recurring Transactions', subtitle: 'Automate your regular payments' },
  '/invoices': { title: 'Invoices', subtitle: 'Create and manage client invoices' },
  '/clients': { title: 'Clients', subtitle: 'Manage your client relationships' },
  '/suppliers': { title: 'Suppliers', subtitle: 'Track your suppliers and vendors' },
  '/reports': { title: 'Reports', subtitle: 'Analyze your financial performance' },
  '/export': { title: 'Export Data', subtitle: 'Download your data in various formats' },
  '/tax': { title: 'Tax Calculator', subtitle: 'Estimate your tax obligations' },
  '/insights': { title: 'AI Insights', subtitle: 'AI-powered financial recommendations' },
  '/goals': { title: 'Goal Tracker', subtitle: 'Track progress towards your financial goals' },
  '/budgets': { title: 'Budget Tracker', subtitle: 'Monitor your spending against budgets' },
  '/billing': { title: 'Billing', subtitle: 'Manage your subscription and payments' },
  '/settings': { title: 'Settings', subtitle: 'Customize your account preferences' },
  '/admin': { title: 'Admin Panel', subtitle: 'System administration and user management' },
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const pageInfo = pageTitles[pathname] || { title: 'ProfitPilot' };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64 transition-all duration-300">
        <Header title={pageInfo.title} subtitle={pageInfo.subtitle} />
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

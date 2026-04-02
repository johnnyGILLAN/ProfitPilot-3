'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { paymentsAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Check, Clock, Star, Zap, Shield } from 'lucide-react';

export default function BillingPage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [packagesRes, historyRes] = await Promise.all([
        paymentsAPI.getPackages(),
        paymentsAPI.getHistory(user?.email),
      ]);
      // Handle packages - backend may return different structures
      const packagesData = packagesRes.data?.packages || packagesRes.data?.data || [];
      setPackages(Array.isArray(packagesData) ? packagesData : []);
      // Handle history - backend may return different structures  
      const historyData = historyRes.data?.transactions || historyRes.data?.data || [];
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    }
  };

  const handleCheckout = async (packageId: string) => {
    setIsLoading(packageId);
    try {
      const response = await paymentsAPI.createCheckout({
        package_id: packageId,
        origin_url: window.location.origin,
        user_email: user?.email,
      });
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const planFeatures: Record<string, string[]> = {
    starter: ['Up to 100 transactions/month', 'Basic reports', 'Email support', '1 user'],
    professional: ['Unlimited transactions', 'Advanced reports', 'Priority support', '5 users', 'AI Insights'],
    enterprise: ['Everything in Professional', 'Dedicated support', 'Unlimited users', 'Custom integrations', 'API access'],
  };

  const planIcons: Record<string, React.ReactNode> = {
    starter: <Zap className="w-6 h-6" />,
    professional: <Star className="w-6 h-6" />,
    enterprise: <Shield className="w-6 h-6" />,
  };

  return (
    <DashboardLayout>
      <div data-testid="billing-page" className="space-y-6">
        {/* Plans */}
        <div className="grid gap-6 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} hover className={pkg.id === 'professional' ? 'ring-2 ring-brand-500' : ''}>
              <CardContent className="p-6">
                {pkg.id === 'professional' && (
                  <Badge variant="info" className="mb-4">Most Popular</Badge>
                )}
                <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 mb-4">
                  {planIcons[pkg.id] || <CreditCard className="w-6 h-6" />}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{pkg.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">${pkg.amount}</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {(planFeatures[pkg.id] || []).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full mt-6"
                  variant={pkg.id === 'professional' ? 'primary' : 'outline'}
                  onClick={() => handleCheckout(pkg.id)}
                  isLoading={isLoading === pkg.id}
                  data-testid={`checkout-${pkg.id}`}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {history.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No payment history</div>
              ) : (
                history.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{payment.package_name}</p>
                        <p className="text-sm text-gray-500">{formatDate(payment.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                      <Badge variant={payment.payment_status === 'paid' ? 'success' : payment.payment_status === 'pending' ? 'warning' : 'default'}>
                        {payment.payment_status === 'paid' ? <Check className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                        {payment.payment_status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { paymentsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchStatus();
    } else {
      setIsLoading(false);
    }
  }, [sessionId]);

  const fetchStatus = async () => {
    try {
      const response = await paymentsAPI.getStatus(sessionId!);
      setStatus(response.data);
    } catch (error) {
      console.error('Error fetching payment status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const isPaid = status?.payment_status === 'paid';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${isPaid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
          {isPaid ? (
            <CheckCircle className="w-10 h-10 text-green-500" />
          ) : (
            <XCircle className="w-10 h-10 text-yellow-500" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isPaid ? 'Payment Successful!' : 'Payment Processing'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {isPaid
            ? 'Thank you for your purchase. Your subscription is now active.'
            : 'Your payment is being processed. This may take a few moments.'}
        </p>
        {status?.amount && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl mb-6">
            <p className="text-sm text-gray-500">Amount Paid</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(status.amount)}
            </p>
          </div>
        )}
        <Link href="/dashboard">
          <Button className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

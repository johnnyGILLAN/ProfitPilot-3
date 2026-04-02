'use client';

import React from 'react';
import Link from 'next/link';
import { XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-red-100 dark:bg-red-900/30">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Cancelled</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Your payment was cancelled. No charges have been made to your account.
        </p>
        <div className="flex gap-3">
          <Link href="/billing" className="flex-1">
            <Button variant="outline" className="w-full">Try Again</Button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

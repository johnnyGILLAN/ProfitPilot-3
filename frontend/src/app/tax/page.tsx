'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { formatCurrency, TAX_RATES } from '@/lib/utils';
import { Calculator, DollarSign, Percent, Globe } from 'lucide-react';

export default function TaxPage() {
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState('');
  const [country, setCountry] = useState('US');
  const [result, setResult] = useState<{
    grossIncome: number;
    deductions: number;
    taxableIncome: number;
    estimatedTax: number;
    effectiveRate: number;
    netIncome: number;
  } | null>(null);

  const calculateTax = () => {
    const grossIncome = parseFloat(income) || 0;
    const deductions = parseFloat(expenses) || 0;
    const taxableIncome = Math.max(grossIncome - deductions, 0);
    const taxRate = TAX_RATES[country]?.rate || 0.22;
    const estimatedTax = taxableIncome * taxRate;
    const effectiveRate = grossIncome > 0 ? (estimatedTax / grossIncome) * 100 : 0;
    const netIncome = grossIncome - estimatedTax;

    setResult({
      grossIncome,
      deductions,
      taxableIncome,
      estimatedTax,
      effectiveRate,
      netIncome,
    });
  };

  return (
    <DashboardLayout>
      <div data-testid="tax-page" className="space-y-6 max-w-3xl">
        <Card>
          <CardHeader><CardTitle>Tax Calculator</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Country/Region"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              options={Object.entries(TAX_RATES).map(([code, { name }]) => ({
                value: code,
                label: name,
              }))}
            />
            <Input
              label="Total Income"
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="Enter your total income"
              icon={<DollarSign className="w-5 h-5" />}
            />
            <Input
              label="Business Expenses (Deductions)"
              type="number"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              placeholder="Enter deductible expenses"
              icon={<DollarSign className="w-5 h-5" />}
            />
            <Button onClick={calculateTax} className="w-full" data-testid="calculate-tax-btn">
              <Calculator className="w-4 h-4 mr-2" />
              Calculate Tax
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader><CardTitle>Tax Estimate</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Gross Income</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(result.grossIncome)}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Deductions</p>
                  <p className="text-xl font-bold text-green-600">-{formatCurrency(result.deductions)}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Taxable Income</p>
                  <p className="text-xl font-bold text-brand-600">{formatCurrency(result.taxableIncome)}</p>
                </div>
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
                  <p className="text-sm text-gray-500">Estimated Tax</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(result.estimatedTax)}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-r from-brand-500/10 to-accent-500/10 border border-brand-200 dark:border-brand-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Net Income After Tax</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(result.netIncome)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Effective Tax Rate</p>
                    <p className="text-2xl font-bold text-accent-600">{result.effectiveRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">
                * This is a simplified estimate. Consult a tax professional for accurate calculations.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

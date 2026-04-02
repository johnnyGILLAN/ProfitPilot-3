'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { exportAPI } from '@/lib/api';
import { Download, FileText, Users, BarChart3, Calendar } from 'lucide-react';

export default function ExportPage() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExport = async (type: string) => {
    setIsExporting(type);
    try {
      let response;
      const params = {
        format: 'csv',
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
      };

      switch (type) {
        case 'transactions':
          response = await exportAPI.transactions(params);
          break;
        case 'invoices':
          response = await exportAPI.invoices(params);
          break;
        case 'clients':
          response = await exportAPI.clients(params);
          break;
        case 'report':
          response = await exportAPI.report(params);
          break;
      }

      if (response) {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `profitpilot-${type}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(null);
    }
  };

  const exportOptions = [
    { id: 'transactions', title: 'Transactions', description: 'Export all income and expense transactions', icon: <BarChart3 className="w-6 h-6" /> },
    { id: 'invoices', title: 'Invoices', description: 'Export all invoices with client details', icon: <FileText className="w-6 h-6" /> },
    { id: 'clients', title: 'Clients', description: 'Export your client database', icon: <Users className="w-6 h-6" /> },
    { id: 'report', title: 'Financial Report', description: 'Export a comprehensive financial summary', icon: <Download className="w-6 h-6" /> },
  ];

  return (
    <DashboardLayout>
      <div data-testid="export-page" className="space-y-6">
        {/* Date Filter */}
        <Card>
          <CardHeader><CardTitle>Date Range (Optional)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Options */}
        <div className="grid gap-4 sm:grid-cols-2">
          {exportOptions.map((option) => (
            <Card key={option.id} hover>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 flex-shrink-0">
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{option.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                    <Button
                      size="sm"
                      className="mt-4"
                      onClick={() => handleExport(option.id)}
                      isLoading={isExporting === option.id}
                      data-testid={`export-${option.id}`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

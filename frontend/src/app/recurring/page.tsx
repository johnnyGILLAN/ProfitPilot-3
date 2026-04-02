'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { recurringAPI } from '@/lib/api';
import { RecurringTransaction } from '@/types';
import { formatCurrency, CURRENCIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/utils';
import { Plus, RefreshCw, Play, Pause, Edit2, Trash2, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';

export default function RecurringPage() {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);

  const [formData, setFormData] = useState({
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    category: '',
    amount: '',
    currency: 'USD',
    description: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    nextDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  useEffect(() => {
    fetchRecurring();
  }, []);

  const fetchRecurring = async () => {
    try {
      const response = await recurringAPI.getAll();
      // Handle recurring - backend returns { success, data: [...] }
      const recurringData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || []);
      setRecurring(recurringData);
    } catch (error) {
      console.error('Error fetching recurring:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...formData, amount: parseFloat(formData.amount) };
      if (editingRecurring) {
        await recurringAPI.update(editingRecurring._id, data);
      } else {
        await recurringAPI.create(data);
      }
      setIsModalOpen(false);
      resetForm();
      fetchRecurring();
    } catch (error) {
      console.error('Error saving recurring:', error);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await recurringAPI.toggle(id);
      fetchRecurring();
    } catch (error) {
      console.error('Error toggling recurring:', error);
    }
  };

  const handleProcess = async () => {
    try {
      await recurringAPI.process();
      fetchRecurring();
    } catch (error) {
      console.error('Error processing recurring:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this recurring transaction?')) {
      try {
        await recurringAPI.delete(id);
        fetchRecurring();
      } catch (error) {
        console.error('Error deleting recurring:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingRecurring(null);
    setFormData({
      type: 'EXPENSE',
      category: '',
      amount: '',
      currency: 'USD',
      description: '',
      frequency: 'monthly',
      nextDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
  };

  const categories = formData.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  if (isLoading) {
    return (
      <DashboardLayout>
        <TableSkeleton rows={6} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="recurring-page" className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-recurring-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Recurring
              </Button>
              <Button variant="outline" onClick={handleProcess} data-testid="process-recurring-btn">
                <RefreshCw className="w-4 h-4 mr-2" />
                Process Due Transactions
              </Button>
            </div>
          </CardContent>
        </Card>

        {recurring.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No recurring transactions set up</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recurring.map((item) => (
              <Card key={item._id} hover>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'INCOME' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      {item.type === 'INCOME' ? <ArrowUpRight className="w-5 h-5 text-green-600" /> : <ArrowDownRight className="w-5 h-5 text-red-600" />}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleToggle(item._id)} className={`p-2 rounded-lg ${item.isActive ? 'hover:bg-yellow-50 text-yellow-600' : 'hover:bg-green-50 text-green-600'}`} title={item.isActive ? 'Pause' : 'Resume'}>
                        {item.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(item._id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{item.category}</h3>
                  <p className="text-sm text-gray-500 truncate">{item.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className={`text-lg font-bold ${item.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                      {item.type === 'INCOME' ? '+' : '-'}{formatCurrency(item.amount, item.currency)}
                    </p>
                    <Badge variant={item.isActive ? 'success' : 'default'}>{item.isActive ? 'Active' : 'Paused'}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span className="capitalize">{item.frequency}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Recurring Transaction">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <button type="button" onClick={() => setFormData((prev) => ({ ...prev, type: 'EXPENSE', category: '' }))} className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${formData.type === 'EXPENSE' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 border-2 border-red-500' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'}`}>Expense</button>
              <button type="button" onClick={() => setFormData((prev) => ({ ...prev, type: 'INCOME', category: '' }))} className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${formData.type === 'INCOME' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 border-2 border-green-500' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'}`}>Income</button>
            </div>
            <Select label="Category" value={formData.category} onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))} options={[{ value: '', label: 'Select category' }, ...categories.map((cat) => ({ value: cat, label: cat }))]} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Amount" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))} required />
              <Select label="Currency" value={formData.currency} onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))} options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} (${c.symbol})` }))} />
            </div>
            <Select label="Frequency" value={formData.frequency} onChange={(e) => setFormData((prev) => ({ ...prev, frequency: e.target.value as any }))} options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />
            <Input label="Start Date" type="date" value={formData.nextDate} onChange={(e) => setFormData((prev) => ({ ...prev, nextDate: e.target.value }))} required />
            <Input label="End Date (Optional)" type="date" value={formData.endDate} onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))} />
            <Textarea label="Description" value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} rows={2} />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1">Add Recurring</Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

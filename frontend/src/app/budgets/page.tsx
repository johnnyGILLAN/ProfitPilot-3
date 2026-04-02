'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { budgetsAPI } from '@/lib/api';
import { Budget } from '@/types';
import { formatCurrency, calculateProgress, EXPENSE_CATEGORIES } from '@/lib/utils';
import { Plus, Wallet, Edit2, Trash2, TrendingUp } from 'lucide-react';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    period: 'monthly' as Budget['period'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
  });

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const response = await budgetsAPI.getAll();
      // Handle budgets - backend returns { success, data: [...] }
      const budgetsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || []);
      setBudgets(budgetsData);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...formData, amount: parseFloat(formData.amount), category: formData.name };
      if (editingBudget) {
        await budgetsAPI.update(editingBudget._id, data);
      } else {
        await budgetsAPI.create(data);
      }
      setIsModalOpen(false);
      resetForm();
      fetchBudgets();
    } catch (error) {
      console.error('Error saving budget:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      try {
        await budgetsAPI.delete(id);
        fetchBudgets();
      } catch (error) {
        console.error('Error deleting budget:', error);
      }
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name,
      amount: budget.amount.toString(),
      period: budget.period,
      startDate: budget.startDate.split('T')[0],
      endDate: budget.endDate?.split('T')[0] || '',
      notes: budget.notes || '',
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingBudget(null);
    setFormData({
      name: '',
      amount: '',
      period: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      notes: '',
    });
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);

  if (isLoading) {
    return (
      <DashboardLayout>
        <TableSkeleton rows={6} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="budgets-page" className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Budget</p>
                  <p className="text-lg font-bold">{formatCurrency(totalBudget)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Spent</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(totalSpent)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Remaining</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(totalBudget - totalSpent)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-budget-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Budget
            </Button>
          </CardContent>
        </Card>

        {budgets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No budgets set up yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget) => {
              const spent = budget.spent || 0;
              const progress = calculateProgress(spent, budget.amount);
              const variant = progress > 90 ? 'danger' : progress > 70 ? 'warning' : 'default';

              return (
                <Card key={budget._id} hover>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{budget.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{budget.period}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(budget)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(budget._id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Spent</span>
                        <span className="font-medium">{formatCurrency(spent)} / {formatCurrency(budget.amount)}</span>
                      </div>
                      <Progress value={progress} variant={variant} />
                      <p className="text-xs text-gray-500 text-right">{progress}% used</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingBudget ? 'Edit Budget' : 'Add Budget'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select label="Category" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} options={[{ value: '', label: 'Select category' }, ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))]} required />
            <Input label="Budget Amount" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))} required />
            <Select label="Period" value={formData.period} onChange={(e) => setFormData((prev) => ({ ...prev, period: e.target.value as any }))} options={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />
            <Input label="Start Date" type="date" value={formData.startDate} onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))} required />
            <Textarea label="Notes (Optional)" value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} rows={2} />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1">{editingBudget ? 'Update' : 'Add'} Budget</Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

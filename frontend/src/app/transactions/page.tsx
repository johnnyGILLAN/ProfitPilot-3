'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { transactionsAPI, exchangeAPI } from '@/lib/api';
import { formatCurrency, formatDate, CURRENCIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/utils';
import { Transaction } from '@/types';
import {
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ totalIncome: 0, totalExpenses: 0, netProfit: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    category: '',
    amount: '',
    currency: 'USD',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = transactions;
    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.type === filterType);
    }
    setFilteredTransactions(filtered);
  }, [transactions, searchQuery, filterType]);

  const fetchData = async () => {
    try {
      const [transactionsRes, statsRes, ratesRes] = await Promise.all([
        transactionsAPI.getAll(),
        transactionsAPI.getStats(),
        exchangeAPI.getRates(),
      ]);
      
      // Handle transactions - backend returns { success, data: [...] }
      const transactionsData = Array.isArray(transactionsRes.data) 
        ? transactionsRes.data 
        : (transactionsRes.data?.data || []);
      setTransactions(transactionsData);
      
      // Handle stats - backend returns { success, data: { totalIncome, totalExpense, ... } }
      const statsData = statsRes.data?.data || statsRes.data;
      setStats({
        totalIncome: statsData.totalIncome || 0,
        totalExpenses: statsData.totalExpense || 0,
        netProfit: (statsData.totalIncome || 0) - (statsData.totalExpense || 0),
      });
      
      setExchangeRates(ratesRes.data?.rates || {});
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const convertToUSD = (amount: number, currency: string) => {
    if (currency === 'USD' || !exchangeRates[currency]) return amount;
    return amount / exchangeRates[currency];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (editingTransaction) {
        await transactionsAPI.update(editingTransaction._id, data);
      } else {
        await transactionsAPI.create(data);
      }

      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionsAPI.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      currency: transaction.currency,
      description: transaction.description || '',
      date: transaction.date.split('T')[0],
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setFormData({
      type: 'EXPENSE',
      category: '',
      amount: '',
      currency: 'USD',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const categories = formData.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  if (isLoading) {
    return (
      <DashboardLayout>
        <TableSkeleton rows={8} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="transactions-page" className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Income</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(stats.totalIncome)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Expenses</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(stats.totalExpenses)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Net Profit</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(stats.netProfit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                  <Filter className="w-5 h-5 text-accent-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Transactions</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{transactions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    data-testid="search-transactions"
                  />
                </div>
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full sm:w-[180px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                data-testid="filter-type"
              >
                <option value="all">All Types</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
              <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-transaction-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No transactions found
                </div>
              ) : (
                filteredTransactions.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 gap-3"
                    data-testid={`transaction-${transaction._id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          transaction.type === 'INCOME'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}
                      >
                        {transaction.type === 'INCOME' ? (
                          <ArrowUpRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{transaction.category}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {transaction.description || formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 ml-13 sm:ml-0">
                      <div className="text-right">
                        <p
                          className={`font-semibold ${
                            transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {transaction.type === 'INCOME' ? '+' : '-'}
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </p>
                        {transaction.currency !== 'USD' && (
                          <p className="text-xs text-gray-400">
                            ≈ {formatCurrency(convertToUSD(transaction.amount, transaction.currency))}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                          data-testid={`edit-${transaction._id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction._id)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                          data-testid={`delete-${transaction._id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); resetForm(); }}
          title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, type: 'EXPENSE', category: '' }))}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  formData.type === 'EXPENSE'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 border-2 border-red-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, type: 'INCOME', category: '' }))}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  formData.type === 'INCOME'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 border-2 border-green-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                Income
              </button>
            </div>

            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              options={[
                { value: '', label: 'Select category' },
                ...categories.map((cat) => ({ value: cat, label: cat })),
              ]}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
              <Select
                label="Currency"
                value={formData.currency}
                onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} (${c.symbol})` }))}
              />
            </div>

            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              required
            />

            <Textarea
              label="Description (Optional)"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Add a note..."
              rows={3}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1" data-testid="save-transaction-btn">
                {editingTransaction ? 'Update' : 'Add'} Transaction
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

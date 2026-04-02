'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { transactionsAPI, invoicesAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  RefreshCw,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Stats {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  transactionCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, transactionsRes, invoicesRes] = await Promise.all([
        transactionsAPI.getStats(),
        transactionsAPI.getAll(),
        invoicesAPI.getAll({ status: 'PENDING' }),
      ]);

      // Handle stats - backend returns { success, data: { totalIncome, totalExpense, ... } }
      const statsData = statsRes.data?.data || statsRes.data;
      setStats({
        totalIncome: statsData.totalIncome || 0,
        totalExpenses: statsData.totalExpense || 0,
        netProfit: (statsData.totalIncome || 0) - (statsData.totalExpense || 0),
        transactionCount: statsData.count || 0,
      });
      
      // Handle transactions - backend returns { success, data: [...] }
      const transactions = Array.isArray(transactionsRes.data) 
        ? transactionsRes.data 
        : (transactionsRes.data?.data || []);
      setRecentTransactions(transactions.slice(0, 5));
      
      // Handle invoices - backend returns { success, data: [...] }
      const invoices = Array.isArray(invoicesRes.data) 
        ? invoicesRes.data 
        : (invoicesRes.data?.data || []);
      setPendingInvoices(invoices.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sample chart data - in production, calculate from real transactions
  const monthlyData = [
    { month: 'Jan', income: 4500, expenses: 2400 },
    { month: 'Feb', income: 5200, expenses: 2800 },
    { month: 'Mar', income: 4800, expenses: 2200 },
    { month: 'Apr', income: 6100, expenses: 3100 },
    { month: 'May', income: 5800, expenses: 2900 },
    { month: 'Jun', income: 7200, expenses: 3400 },
  ];

  const expenseCategories = [
    { name: 'Marketing', value: 2400, color: '#0ea5e9' },
    { name: 'Software', value: 1800, color: '#a855f7' },
    { name: 'Office', value: 1200, color: '#22c55e' },
    { name: 'Travel', value: 900, color: '#f59e0b' },
    { name: 'Other', value: 600, color: '#6b7280' },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  const profitMargin = stats?.totalIncome
    ? ((stats.netProfit / stats.totalIncome) * 100).toFixed(1)
    : '0';

  return (
    <DashboardLayout>
      <div data-testid="dashboard-page" className="space-y-8">
        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="stat-gradient-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Income</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(stats?.totalIncome || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-sm">
                <ArrowUpRight className="w-4 h-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400 font-medium">+12.5%</span>
                <span className="text-gray-500 dark:text-gray-400">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-gradient-3">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(stats?.totalExpenses || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-sm">
                <ArrowDownRight className="w-4 h-4 text-red-500" />
                <span className="text-red-600 dark:text-red-400 font-medium">-3.2%</span>
                <span className="text-gray-500 dark:text-gray-400">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-gradient-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Profit</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(stats?.netProfit || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Margin:</span>
                <span className="text-brand-600 dark:text-brand-400 font-medium">{profitMargin}%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-gradient-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transactions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats?.transactionCount || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-accent-600 dark:text-accent-400" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-sm">
                <span className="text-gray-500 dark:text-gray-400">This month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Income vs Expenses Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Income vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#22c55e"
                      fill="url(#incomeGradient)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      fill="url(#expenseGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <Link href="/transactions">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {recentTransactions.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No transactions yet
                  </div>
                ) : (
                  recentTransactions.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            transaction.type === 'INCOME'
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : 'bg-red-100 dark:bg-red-900/30'
                          }`}
                        >
                          {transaction.type === 'INCOME' ? (
                            <ArrowUpRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {transaction.category}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {transaction.description || formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`font-semibold whitespace-nowrap ${
                          transaction.type === 'INCOME'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {transaction.type === 'INCOME' ? '+' : '-'}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending Invoices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pending Invoices</CardTitle>
              <Link href="/invoices">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {pendingInvoices.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No pending invoices
                  </div>
                ) : (
                  pendingInvoices.map((invoice) => (
                    <div
                      key={invoice._id}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {invoice.clientEmail}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(invoice.amount)}
                        </p>
                        <Badge variant="warning" size="sm">
                          Due {formatDate(invoice.dueDate)}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/transactions?action=new">
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Transaction
                </Button>
              </Link>
              <Link href="/invoices?action=new">
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </Link>
              <Link href="/insights">
                <Button variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Get AI Insights
                </Button>
              </Link>
              <Link href="/export">
                <Button variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

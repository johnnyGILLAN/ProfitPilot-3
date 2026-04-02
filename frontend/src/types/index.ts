export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  businessName?: string;
  currency?: string;
  preferences?: {
    emailNotifications?: boolean;
    weeklyReports?: boolean;
    overdueReminders?: boolean;
    transactionAlerts?: boolean;
  };
  createdAt?: string;
}

export interface Transaction {
  _id: string;
  user: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  currency: string;
  description: string;
  tags?: string[];
  isRecurring?: boolean;
  createdAt?: string;
}

export interface Invoice {
  _id: string;
  user: string;
  client?: string;
  clientEmail: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  amount: number;
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  notes?: string;
  createdAt?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Client {
  _id: string;
  user: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
}

export interface Supplier {
  _id: string;
  user: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  category?: string;
  notes?: string;
  createdAt?: string;
}

export interface Budget {
  _id: string;
  user: string;
  name: string;
  amount: number;
  spent?: number;
  period: 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: string;
  endDate?: string;
  categories?: { category: string; amount: number }[];
  notes?: string;
  createdAt?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: 'SAVINGS' | 'BUSINESS' | 'PERSONAL' | 'RETIREMENT' | 'EDUCATION' | 'OTHER';
  createdAt?: string;
}

export interface RecurringTransaction {
  _id: string;
  user: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  currency: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface Category {
  _id: string;
  user: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color?: string;
  icon?: string;
  createdAt?: string;
}

export interface AIInsight {
  type: 'spending' | 'saving' | 'income' | 'warning' | 'opportunity' | 'summary';
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low' | 'info';
}

export interface FinancialSummary {
  total_income: number;
  total_expense: number;
  net_profit: number;
  profit_margin: number;
}

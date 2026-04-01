
export type TransactionType = "Income" | "Expense";

export interface Transaction {
  id: string;
  date: Date | string; // Allow string for backend, Date for frontend
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
  tags: string[];
  receiptUrl?: string;
  receiptImage?: string; // Data URI for uploads
}

export type GoalType = "financial" | "other"; // Frontend representation
export type BackendGoalType = "AUTO" | "MANUAL"; // Backend representation

export type FinancialMetric = "income" | "netProfit" | "expenseReduction";
export type FinancialPeriod = "currentMonth" | "currentYear" | "allTime";

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date | string;
  goalType?: GoalType;        // Frontend specific
  type?: BackendGoalType;     // Backend specific
  financialMetric?: FinancialMetric;
  period?: FinancialPeriod;
  userId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}


export interface MonthlySummaryData {
  month: string;
  income: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
}

export interface KpiCardProps {
  title: string;
  value: string;
  previousValue?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  description: string;
  icon?: React.ElementType;
}

// Types for Financial Insights
export interface CategoryProfitability {
  category: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

export interface TopExpenseCategory {
  category: string;
  totalSpend: number;
}

export interface CashFlowDataPoint {
  month: string; // "MMM yyyy"
  income: number;
  expenses: number;
  netCashFlow: number;
}

export interface FinancialInsightsData {
  categoryProfitability: CategoryProfitability[];
  topExpenseCategories: TopExpenseCategory[];
  cashFlowTrend: CashFlowDataPoint[];
}

// Types for Invoice Generator
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export type DiscountType = "none" | "percentage" | "fixed";

export interface Invoice {
  id: string;
  companyName?: string;
  companyEmail?: string;
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  lineItems: InvoiceLineItem[];
  notes?: string;
  taxRate?: number;
  discountType?: DiscountType;
  discountValue?: number;
  logoDataUrl?: string;
}

export type AdminSimulatedTier = "Free" | "Pro" | "Business" | "Creator";
export const ALL_TIERS: AdminSimulatedTier[] = ["Free", "Pro", "Business", "Creator"];
export const LOCAL_STORAGE_KEY_SIMULATED_TIER = "profitPilotSimulatedTier";

// Types for Authentication
export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: "FREE" | "PRO" | "BUSINESS" | "ADMIN" | "SUPER_ADMIN"; // Added SUPER_ADMIN based on backend example
  profile?: {
    companyName?: string;
    currency?: string;
    dateFormat?: string;
    defaultCountry?: string;
    locale?: string;
  }
  testingSession?: boolean;
  expiresAt?: string; // For testing session expiry, typically ISO string
}

// DTO for frontend auth forms, matching backend AuthDto expected structure
export interface AuthFormData {
  email: string;
  password: string;
  name?: string;
}

// For Admin Page Metrics
export interface AppMetrics {
  totalUsers: number;
  activeUsers: number;
  freeUsers: number;
  proUsers: number;
  businessUsers: number;
  mrr: number;
}

// For Admin Page Users List
export interface AdminUserEntry {
  id: string;
  name: string | null;
  email: string;
  role: AuthenticatedUser['role'] | string;
  isActive: boolean;
  createdAt: string; 
  subscription?: {
    currentPeriodEnd?: string | null;
    status?: string;
  };
}

// For Admin Page Creator Codes List
export interface AdminCreatorCode {
  id: string;
  code: string;
  creator: { id: string; name: string | null; email: string };
  redeemer: { id: string; name: string | null; email: string } | null;
  usesLeft: number | null;
  expiryDate: string | null; 
  createdAt: string;
}

// For Admin Page Feedback List
export interface AdminFeedbackEntry {
  id: string;
  type: string;
  message: string;
  user: { id: string; name: string | null; email: string } | null;
  createdAt: string; 
  status?: string; 
}

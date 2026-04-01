
import type { Transaction, Goal, MonthlySummaryData } from "@/types";
import { parseISO } from "date-fns"; // Added for robust date parsing

// Mock transactions can serve as an initial dataset if localStorage is empty
// or for users who haven't imported data yet.
// However, the application will now primarily rely on localStorage.
export const mockTransactions: Transaction[] = [
  { id: "1", date: parseISO("2024-07-15"), type: "Income", category: "Client Project A", amount: 2500, description: "Web design services", tags: ["client-work", "web-design"] },
  { id: "2", date: parseISO("2024-07-10"), type: "Expense", category: "Software Subscription", amount: 49.99, description: "Figma Pro", tags: ["saas", "design-tools", "recurring"] },
  { id: "3", date: parseISO("2024-07-05"), type: "Income", category: "Coaching Session", amount: 300, description: "Business coaching", tags: ["coaching"] },
  { id: "4", date: parseISO("2024-06-25"), type: "Expense", category: "Marketing", amount: 150, description: "Facebook Ads", tags: ["advertising"] },
  { id: "5", date: parseISO("2024-06-20"), type: "Income", category: "E-commerce Sale", amount: 75.50, description: "Product X", tags: ["e-commerce", "product-sale"] },
  { id: "6", date: parseISO("2024-08-01"), type: "Expense", category: "Office Supplies", amount: 35.20, description: "Pens and Notebooks", tags: ["supplies"] },
  { id: "7", date: parseISO("2024-08-05"), type: "Income", category: "Freelance Writing", amount: 500, description: "Blog Post Series", tags: ["writing", "content-creation"] },
];

export const mockGoals: Goal[] = [
  { id: "1", name: "Earn $10K/month", targetAmount: 10000, currentAmount: 7500, deadline: parseISO("2024-12-31") },
  { id: "2", name: "Cut costs by 15%", targetAmount: 500, currentAmount: 150 }, 
  { id: "3", name: "Save $5K for tax", targetAmount: 5000, currentAmount: 2000 },
];

// mockMonthlySummaries and mockChartData are now less critical as data will be generated dynamically.
// They can be kept for reference or for components that haven't been fully migrated.
export const mockMonthlySummaries: MonthlySummaryData[] = [
  { month: "Jul 2024", income: 5800, expenses: 249.99, netProfit: 5550.01, profitMargin: 95.69 },
  { month: "Jun 2024", income: 6200, expenses: 850, netProfit: 5350, profitMargin: 86.29 },
  { month: "May 2024", income: 5500, expenses: 700, netProfit: 4800, profitMargin: 87.27 },
  { month: "Apr 2024", income: 5900, expenses: 600, netProfit: 5300, profitMargin: 89.83 },
];

export const mockChartData = {
  incomeVsExpense: [
    { name: 'Jan', income: 4000, expenses: 2400 },
    { name: 'Feb', income: 3000, expenses: 1398 },
    { name: 'Mar', income: 2000, expenses: 9800 },
    { name: 'Apr', income: 2780, expenses: 3908 },
    { name: 'May', income: 1890, expenses: 4800 },
    { name: 'Jun', income: 2390, expenses: 3800 },
    { name: 'Jul', income: 3490, expenses: 4300 },
  ],
  netProfitTrend: [
    { name: 'Jan', netProfit: 1600 },
    { name: 'Feb', netProfit: 1602 },
    { name: 'Mar', netProfit: -7800 },
    { name: 'Apr', netProfit: -1128 },
    { name: 'May', netProfit: -2910 },
    { name: 'Jun', netProfit: -1410 },
    { name: 'Jul', netProfit: -810 },
  ],
};

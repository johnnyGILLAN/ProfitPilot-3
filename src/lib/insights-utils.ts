
import type { Transaction, CategoryProfitability, TopExpenseCategory, CashFlowDataPoint } from "@/types";
import { parseISO, format, getMonth, getYear } from "date-fns";

export function analyzeTransactionsForInsights(transactions: Transaction[]): {
  categoryProfitability: CategoryProfitability[];
  topExpenseCategories: TopExpenseCategory[];
} {
  const categories: { [key: string]: { income: number; expenses: number } } = {};
  const expenseCategories: { [key: string]: number } = {};

  transactions.forEach(transaction => {
    const category = transaction.category || "Uncategorized";
    if (!categories[category]) {
      categories[category] = { income: 0, expenses: 0 };
    }

    if (transaction.type === "Income") {
      categories[category].income += transaction.amount;
    } else if (transaction.type === "Expense") {
      categories[category].expenses += transaction.amount;
      expenseCategories[category] = (expenseCategories[category] || 0) + transaction.amount;
    }
  });

  const categoryProfitability: CategoryProfitability[] = Object.entries(categories).map(
    ([category, data]) => {
      const netProfit = data.income - data.expenses;
      const profitMargin = data.income > 0 ? (netProfit / data.income) * 100 : 0;
      return {
        category,
        totalIncome: data.income,
        totalExpenses: data.expenses,
        netProfit,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
      };
    }
  ).sort((a, b) => b.netProfit - a.netProfit);

  const topExpenseCategories: TopExpenseCategory[] = Object.entries(expenseCategories)
    .map(([category, totalSpend]) => ({ category, totalSpend }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 5);

  return { categoryProfitability, topExpenseCategories };
}

export function prepareCashFlowTrend(monthlyBreakdown: { monthNumeric: string; income: number; expenses: number }[]): CashFlowDataPoint[] {
    // Ensure monthlyBreakdown is sorted by monthNumeric ascending for correct chart rendering
    const sortedBreakdown = [...monthlyBreakdown].sort((a, b) => a.monthNumeric.localeCompare(b.monthNumeric));
    
    return sortedBreakdown.map(summary => {
        const dateFromNumeric = parseISO(summary.monthNumeric + "-01"); // Create a date for formatting
        return {
            month: format(dateFromNumeric, "MMM yyyy"),
            income: summary.income,
            expenses: summary.expenses,
            netCashFlow: summary.income - summary.expenses,
        };
    });
}


import type { Transaction } from "@/types";
import { format, getMonth, getYear, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, parseISO } from "date-fns";

export interface MonthlySummary {
  month: string; // e.g., "Jul 2024"
  monthNumeric: string; // e.g., "2024-07" for sorting
  income: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
}

export interface FinancialSummaries {
  ytd: { income: number; expenses: number; netProfit: number };
  mtd: { income: number; expenses: number; netProfit: number };
  monthlyBreakdown: MonthlySummary[];
  chartData: {
    incomeVsExpense: Array<{ name: string; income: number; expenses: number }>; // For last 6 months
    netProfitTrend: Array<{ name: string; netProfit: number }>; // For last 6 months
  };
  allTimeIncome: number;
  allTimeExpenses: number;
  allTimeNetProfit: number;
}

export function generateFinancialSummaries(transactions: Transaction[]): FinancialSummaries {
  const now = new Date();
  const currentYear = getYear(now);
  const currentMonth = getMonth(now); // 0-indexed

  let ytdIncome = 0;
  let ytdExpenses = 0;
  let mtdIncome = 0;
  let mtdExpenses = 0;
  let allTimeIncomeTotal = 0;
  let allTimeExpensesTotal = 0;

  const monthlyData: { [key: string]: { income: number; expenses: number, monthLabel: string } } = {};

  transactions.forEach(transaction => {
    const transactionDate = typeof transaction.date === 'string' ? parseISO(transaction.date) : transaction.date;
    if (!(transactionDate instanceof Date) || isNaN(transactionDate.getTime())) {
        console.warn('Invalid date for transaction:', transaction);
        return; 
    }

    const year = getYear(transactionDate);
    const month = getMonth(transactionDate); 
    const monthYearKey = format(transactionDate, "yyyy-MM"); 
    const monthLabel = format(transactionDate, "MMM yyyy"); 

    if (!monthlyData[monthYearKey]) {
      monthlyData[monthYearKey] = { income: 0, expenses: 0, monthLabel };
    }

    if (transaction.type === "Income") {
      allTimeIncomeTotal += transaction.amount;
      monthlyData[monthYearKey].income += transaction.amount;
      if (year === currentYear) {
        ytdIncome += transaction.amount;
        if (month === currentMonth) {
          mtdIncome += transaction.amount;
        }
      }
    } else if (transaction.type === "Expense") {
      allTimeExpensesTotal += transaction.amount;
      monthlyData[monthYearKey].expenses += transaction.amount;
      if (year === currentYear) {
        ytdExpenses += transaction.amount;
        if (month === currentMonth) {
          mtdExpenses += transaction.amount;
        }
      }
    }
  });

  const monthlyBreakdown: MonthlySummary[] = Object.entries(monthlyData)
    .map(([monthNumeric, data]) => {
      const netProfit = data.income - data.expenses;
      const profitMargin = data.income > 0 ? (netProfit / data.income) * 100 : 0;
      return {
        month: data.monthLabel,
        monthNumeric,
        income: data.income,
        expenses: data.expenses,
        netProfit,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
      };
    })
    .sort((a, b) => b.monthNumeric.localeCompare(a.monthNumeric)); 

  const last6Months = eachMonthOfInterval({
    start: subMonths(startOfMonth(now), 5),
    end: startOfMonth(now),
  }).map(date => ({
    key: format(date, "yyyy-MM"),
    name: format(date, "MMM"), 
  })).reverse(); 

  const incomeVsExpenseChartData = last6Months.map(monthInfo => {
    const data = monthlyData[monthInfo.key] || { income: 0, expenses: 0 };
    return {
      name: monthInfo.name,
      income: data.income,
      expenses: data.expenses,
    };
  }).reverse(); 

  const netProfitTrendChartData = last6Months.map(monthInfo => {
    const data = monthlyData[monthInfo.key] || { income: 0, expenses: 0 };
    return {
      name: monthInfo.name,
      netProfit: data.income - data.expenses,
    };
  }).reverse(); 


  return {
    ytd: {
      income: ytdIncome,
      expenses: ytdExpenses,
      netProfit: ytdIncome - ytdExpenses,
    },
    mtd: {
      income: mtdIncome,
      expenses: mtdExpenses,
      netProfit: mtdIncome - mtdExpenses,
    },
    monthlyBreakdown,
    chartData: {
      incomeVsExpense: incomeVsExpenseChartData,
      netProfitTrend: netProfitTrendChartData,
    },
    allTimeIncome: allTimeIncomeTotal,
    allTimeExpenses: allTimeExpensesTotal,
    allTimeNetProfit: allTimeIncomeTotal - allTimeExpensesTotal,
  };
}

export function getChartRange(data: number[]): [number, number] {
    if (!data || data.length === 0) return [0, 1000];
    let min = Math.min(...data);
    let max = Math.max(...data);

    if (min === max) {
        min = min > 0 ? 0 : min - 500;
        max = max < 0 ? 0 : max + 500;
    }
    if (min === 0 && max === 0) {
        max = 1000; 
    }
    
    const padding = Math.abs(max - min) * 0.1 || Math.abs(max) * 0.1 || 100;
    min = Math.floor((min - padding) / 100) * 100; 
    max = Math.ceil((max + padding) / 100) * 100; 
    
    return [min, max];
}

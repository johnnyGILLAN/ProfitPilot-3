'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { aiAPI } from '@/lib/api';
import { AIInsight, FinancialSummary, Goal } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Target, Sparkles, RefreshCw, Wallet } from 'lucide-react';

export default function InsightsPage() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingGoals, setIsGeneratingGoals] = useState(false);
  const [generatedGoals, setGeneratedGoals] = useState<Goal[]>([]);
  const [generatedBudgets, setGeneratedBudgets] = useState<any[]>([]);

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const response = await aiAPI.generateInsights();
      setInsights(response.data.insights || []);
      setSummary(response.data.summary || null);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateGoalsAndBudgets = async () => {
    if (insights.length === 0) return;
    setIsGeneratingGoals(true);
    try {
      const response = await aiAPI.generateGoals({ insights, summary: summary || {} });
      setGeneratedGoals(response.data.goals || []);
      setGeneratedBudgets(response.data.budgets || []);
    } catch (error) {
      console.error('Error generating goals:', error);
    } finally {
      setIsGeneratingGoals(false);
    }
  };

  const saveGoalsToLocalStorage = () => {
    const existingGoals = JSON.parse(localStorage.getItem('profitpilot_goals') || '[]');
    const newGoals = generatedGoals.map((g, i) => ({
      ...g,
      id: `ai-${Date.now()}-${i}`,
      currentAmount: 0,
      createdAt: new Date().toISOString(),
    }));
    localStorage.setItem('profitpilot_goals', JSON.stringify([...existingGoals, ...newGoals]));
    alert('Goals saved to Goal Tracker!');
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'income': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'spending': return <TrendingDown className="w-5 h-5 text-red-500" />;
      case 'saving': return <Wallet className="w-5 h-5 text-brand-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'opportunity': return <Sparkles className="w-5 h-5 text-accent-500" />;
      default: return <Lightbulb className="w-5 h-5 text-brand-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="danger">High</Badge>;
      case 'medium': return <Badge variant="warning">Medium</Badge>;
      case 'low': return <Badge variant="info">Low</Badge>;
      default: return <Badge>Info</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div data-testid="insights-page" className="space-y-6">
        {/* Header Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={generateInsights} isLoading={isLoading} data-testid="generate-insights-btn">
                <Lightbulb className="w-4 h-4 mr-2" />
                Generate Insights
              </Button>
              {insights.length > 0 && (
                <Button variant="secondary" onClick={generateGoalsAndBudgets} isLoading={isGeneratingGoals} data-testid="generate-goals-btn">
                  <Target className="w-4 h-4 mr-2" />
                  Create Goals & Budgets
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Total Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_income)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_expense)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Net Profit</p>
                <p className="text-2xl font-bold text-brand-600">{formatCurrency(summary.net_profit)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Profit Margin</p>
                <p className="text-2xl font-bold text-accent-600">{summary.profit_margin.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Insights */}
        {insights.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {insights.map((insight, index) => (
              <Card key={index} hover>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{insight.title}</h3>
                        {getPriorityBadge(insight.priority)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{insight.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Get AI-Powered Insights</h3>
              <p className="text-gray-500 mb-4">Click the button above to analyze your financial data and get personalized recommendations.</p>
            </CardContent>
          </Card>
        )}

        {/* Generated Goals */}
        {generatedGoals.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>AI-Generated Goals</CardTitle>
              <Button size="sm" onClick={saveGoalsToLocalStorage}>
                Save to Goal Tracker
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {generatedGoals.map((goal, index) => (
                  <div key={index} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                        <Target className="w-5 h-5 text-brand-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{goal.title}</h4>
                        <p className="text-sm text-gray-500">{goal.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-brand-600">{formatCurrency(goal.targetAmount)}</p>
                        <p className="text-xs text-gray-500">by {goal.deadline}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated Budgets */}
        {generatedBudgets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>AI-Suggested Budgets</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {generatedBudgets.map((budget, index) => (
                  <div key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-accent-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{budget.category}</h4>
                          <p className="text-sm text-gray-500">{budget.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-accent-600">{formatCurrency(budget.amount)}</p>
                        <p className="text-xs text-gray-500 capitalize">{budget.period}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

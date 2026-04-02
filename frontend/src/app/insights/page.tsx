'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { aiAPI, budgetsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Sparkles,
  Wallet,
  CheckCircle,
  Save,
  RefreshCw,
} from 'lucide-react';

interface AIInsight {
  type: string;
  title: string;
  content: string;
  priority: string;
}

interface FinancialSummary {
  total_income: number;
  total_expense: number;
  net_profit: number;
  profit_margin: number;
}

interface GeneratedGoal {
  title: string;
  description: string;
  targetAmount: number;
  deadline: string;
  category: string;
}

interface GeneratedBudget {
  category: string;
  amount: number;
  period: string;
  reason: string;
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingGoals, setIsGeneratingGoals] = useState(false);
  const [generatedGoals, setGeneratedGoals] = useState<GeneratedGoal[]>([]);
  const [generatedBudgets, setGeneratedBudgets] = useState<GeneratedBudget[]>([]);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [isSavingBudgets, setIsSavingBudgets] = useState(false);
  const [savedMessage, setSavedMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const generateInsights = async () => {
    setIsLoading(true);
    setSavedMessage(null);
    try {
      const response = await aiAPI.generateInsights();
      setInsights(response.data.insights || []);
      setSummary(response.data.summary || null);
      // Clear any previous generated goals/budgets
      setGeneratedGoals([]);
      setGeneratedBudgets([]);
    } catch (error) {
      console.error('Error generating insights:', error);
      setSavedMessage({ type: 'error', text: 'Failed to generate insights. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const generateGoalsAndBudgets = async () => {
    if (insights.length === 0 || !summary) {
      setSavedMessage({ type: 'error', text: 'Please generate insights first.' });
      return;
    }
    
    setIsGeneratingGoals(true);
    setSavedMessage(null);
    
    try {
      const response = await aiAPI.generateGoals({ insights, summary });
      setGeneratedGoals(response.data.goals || []);
      setGeneratedBudgets(response.data.budgets || []);
    } catch (error) {
      console.error('Error generating goals:', error);
      setSavedMessage({ type: 'error', text: 'Failed to generate goals and budgets.' });
    } finally {
      setIsGeneratingGoals(false);
    }
  };

  const saveGoalsToLocalStorage = async () => {
    setIsSavingGoals(true);
    try {
      const existingGoals = JSON.parse(localStorage.getItem('profitpilot_goals') || '[]');
      const newGoals = generatedGoals.map((g, i) => ({
        id: `ai-${Date.now()}-${i}`,
        title: g.title,
        description: g.description,
        targetAmount: g.targetAmount,
        currentAmount: 0,
        deadline: g.deadline,
        category: g.category,
        createdAt: new Date().toISOString(),
      }));
      localStorage.setItem('profitpilot_goals', JSON.stringify([...existingGoals, ...newGoals]));
      setSavedMessage({ type: 'success', text: `${newGoals.length} goals saved to Goal Tracker!` });
      setGeneratedGoals([]); // Clear after saving
    } catch (error) {
      setSavedMessage({ type: 'error', text: 'Failed to save goals.' });
    } finally {
      setIsSavingGoals(false);
    }
  };

  const saveBudgetsToDatabase = async () => {
    setIsSavingBudgets(true);
    try {
      const response = await aiAPI.saveBudgets(generatedBudgets);
      if (response.data.success) {
        setSavedMessage({ type: 'success', text: `${response.data.count} budgets saved to Budget Tracker!` });
        setGeneratedBudgets([]); // Clear after saving
      }
    } catch (error) {
      console.error('Error saving budgets:', error);
      setSavedMessage({ type: 'error', text: 'Failed to save budgets.' });
    } finally {
      setIsSavingBudgets(false);
    }
  };

  const saveAll = async () => {
    if (generatedGoals.length > 0) {
      await saveGoalsToLocalStorage();
    }
    if (generatedBudgets.length > 0) {
      await saveBudgetsToDatabase();
    }
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
      case 'high': return <Badge variant="danger">High Priority</Badge>;
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
                Generate AI Insights
              </Button>
              {insights.length > 0 && (
                <Button 
                  variant="secondary" 
                  onClick={generateGoalsAndBudgets} 
                  isLoading={isGeneratingGoals} 
                  data-testid="generate-goals-btn"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Generate Goals & Budgets
                </Button>
              )}
              {(generatedGoals.length > 0 || generatedBudgets.length > 0) && (
                <Button 
                  variant="primary" 
                  onClick={saveAll} 
                  isLoading={isSavingGoals || isSavingBudgets}
                  data-testid="save-all-btn"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save All to Trackers
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Message */}
        {savedMessage && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            savedMessage.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            {savedMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            <p className={savedMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {savedMessage.text}
            </p>
          </div>
        )}

        {/* Financial Summary */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Total Income (6 mo)</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_income)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Total Expenses (6 mo)</p>
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
              <p className="text-gray-500 mb-4">
                Click "Generate AI Insights" to analyze your financial data and get personalized recommendations.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Generated Goals */}
        {generatedGoals.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-500" />
                AI-Generated Goals
              </CardTitle>
              <Button 
                size="sm" 
                onClick={saveGoalsToLocalStorage} 
                isLoading={isSavingGoals}
                data-testid="save-goals-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Goals
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {generatedGoals.map((goal, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                        <Target className="w-5 h-5 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 dark:text-white">{goal.title}</h4>
                          <Badge variant="info">{goal.category}</Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{goal.description}</p>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-accent-500" />
                AI-Suggested Budgets
              </CardTitle>
              <Button 
                size="sm" 
                onClick={saveBudgetsToDatabase} 
                isLoading={isSavingBudgets}
                data-testid="save-budgets-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Budgets
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {generatedBudgets.map((budget, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
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

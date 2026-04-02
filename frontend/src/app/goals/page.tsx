'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Goal } from '@/types';
import { formatCurrency, calculateProgress, formatDate } from '@/lib/utils';
import { Plus, Target, Edit2, Trash2, TrendingUp, Calendar, DollarSign } from 'lucide-react';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    category: 'SAVINGS' as Goal['category'],
  });

  useEffect(() => {
    const savedGoals = localStorage.getItem('profitpilot_goals');
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    }
  }, []);

  const saveGoals = (newGoals: Goal[]) => {
    localStorage.setItem('profitpilot_goals', JSON.stringify(newGoals));
    setGoals(newGoals);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGoal: Goal = {
      id: editingGoal?.id || Date.now().toString(),
      title: formData.title,
      description: formData.description,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount) || 0,
      deadline: formData.deadline,
      category: formData.category,
      createdAt: editingGoal?.createdAt || new Date().toISOString(),
    };

    if (editingGoal) {
      saveGoals(goals.map((g) => (g.id === editingGoal.id ? newGoal : g)));
    } else {
      saveGoals([...goals, newGoal]);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      deadline: goal.deadline,
      category: goal.category,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      saveGoals(goals.filter((g) => g.id !== id));
    }
  };

  const handleUpdateProgress = (id: string, amount: number) => {
    saveGoals(goals.map((g) => (g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g)));
  };

  const resetForm = () => {
    setEditingGoal(null);
    setFormData({
      title: '',
      description: '',
      targetAmount: '',
      currentAmount: '',
      deadline: '',
      category: 'SAVINGS',
    });
  };

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalProgress = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const completedGoals = goals.filter((g) => g.currentAmount >= g.targetAmount).length;

  const categoryColors: Record<string, string> = {
    SAVINGS: 'bg-green-100 text-green-600',
    BUSINESS: 'bg-brand-100 text-brand-600',
    PERSONAL: 'bg-accent-100 text-accent-600',
    RETIREMENT: 'bg-yellow-100 text-yellow-600',
    EDUCATION: 'bg-blue-100 text-blue-600',
    OTHER: 'bg-gray-100 text-gray-600',
  };

  return (
    <DashboardLayout>
      <div data-testid="goals-page" className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <Target className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Goals</p>
                  <p className="text-lg font-bold">{goals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-lg font-bold text-green-600">{completedGoals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-accent-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Target</p>
                  <p className="text-lg font-bold">{formatCurrency(totalTarget)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Progress</p>
                  <p className="text-lg font-bold">{formatCurrency(totalProgress)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-goal-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Goal
            </Button>
          </CardContent>
        </Card>

        {goals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No goals set yet. Create your first financial goal!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => {
              const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
              const isCompleted = goal.currentAmount >= goal.targetAmount;
              const isOverdue = new Date(goal.deadline) < new Date() && !isCompleted;

              return (
                <Card key={goal.id} hover>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryColors[goal.category]}`}>
                        {goal.category}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(goal)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(goal.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{goal.title}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{goal.description}</p>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{formatCurrency(goal.currentAmount)}</span>
                        <span className="font-medium">{formatCurrency(goal.targetAmount)}</span>
                      </div>
                      <Progress value={progress} variant={isCompleted ? 'success' : isOverdue ? 'danger' : 'default'} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {formatDate(goal.deadline)}
                      </div>
                      {isCompleted ? (
                        <Badge variant="success">Completed</Badge>
                      ) : isOverdue ? (
                        <Badge variant="danger">Overdue</Badge>
                      ) : (
                        <Badge variant="info">{progress}%</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGoal ? 'Edit Goal' : 'Add Goal'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Goal Title" value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} placeholder="e.g., Emergency Fund" required />
            <Textarea label="Description" value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} placeholder="Why is this goal important?" rows={2} />
            <Select label="Category" value={formData.category} onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value as any }))} options={[{ value: 'SAVINGS', label: 'Savings' }, { value: 'BUSINESS', label: 'Business' }, { value: 'PERSONAL', label: 'Personal' }, { value: 'RETIREMENT', label: 'Retirement' }, { value: 'EDUCATION', label: 'Education' }, { value: 'OTHER', label: 'Other' }]} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Target Amount" type="number" step="0.01" value={formData.targetAmount} onChange={(e) => setFormData((prev) => ({ ...prev, targetAmount: e.target.value }))} required />
              <Input label="Current Amount" type="number" step="0.01" value={formData.currentAmount} onChange={(e) => setFormData((prev) => ({ ...prev, currentAmount: e.target.value }))} />
            </div>
            <Input label="Target Date" type="date" value={formData.deadline} onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))} required />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1">{editingGoal ? 'Update' : 'Add'} Goal</Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { invoicesAPI, clientsAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice, Client } from '@/types';
import {
  Plus,
  Search,
  FileText,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit2,
  Trash2,
  DollarSign,
} from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    clientEmail: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    notes: '',
    status: 'PENDING' as Invoice['status'],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, clientsRes] = await Promise.all([
        invoicesAPI.getAll(),
        clientsAPI.getAll(),
      ]);
      
      // Handle invoices - backend returns { success, data: [...] }
      const invoicesData = Array.isArray(invoicesRes.data) 
        ? invoicesRes.data 
        : (invoicesRes.data?.data || []);
      setInvoices(invoicesData);
      
      // Handle clients - backend returns { success, data: [...] }
      const clientsData = Array.isArray(clientsRes.data) 
        ? clientsRes.data 
        : (clientsRes.data?.data || []);
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.clientEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    paid: invoices.filter((inv) => inv.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0),
    pending: invoices.filter((inv) => inv.status === 'PENDING').reduce((sum, inv) => sum + inv.amount, 0),
    overdue: invoices.filter((inv) => inv.status === 'OVERDUE').reduce((sum, inv) => sum + inv.amount, 0),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount = formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const data = { ...formData, amount };

      if (editingInvoice) {
        await invoicesAPI.update(editingInvoice._id, data);
      } else {
        await invoicesAPI.create(data);
      }

      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving invoice:', error);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await invoicesAPI.markAsPaid(id);
      fetchData();
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  };

  const handleDownloadPDF = async (id: string) => {
    try {
      const response = await invoicesAPI.getPDF(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      a.click();
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      try {
        await invoicesAPI.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting invoice:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingInvoice(null);
    setFormData({
      clientEmail: '',
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      notes: '',
      status: 'PENDING',
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const statusConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'default'; icon: React.ReactNode }> = {
    PAID: { variant: 'success', icon: <CheckCircle className="w-4 h-4" /> },
    PENDING: { variant: 'warning', icon: <Clock className="w-4 h-4" /> },
    OVERDUE: { variant: 'danger', icon: <AlertCircle className="w-4 h-4" /> },
    DRAFT: { variant: 'default', icon: <FileText className="w-4 h-4" /> },
    CANCELLED: { variant: 'default', icon: <AlertCircle className="w-4 h-4" /> },
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <TableSkeleton rows={6} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="invoices-page" className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Invoiced</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Paid</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(stats.paid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-lg font-bold text-yellow-600">{formatCurrency(stats.pending)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(stats.overdue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  data-testid="search-invoices"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-[180px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                data-testid="filter-status"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="DRAFT">Draft</option>
              </select>
              <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="create-invoice-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredInvoices.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No invoices found</div>
              ) : (
                filteredInvoices.map((invoice) => (
                  <div
                    key={invoice._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-brand-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-500 truncate">{invoice.clientEmail}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 ml-13 sm:ml-0">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(invoice.amount)}</p>
                        <p className="text-xs text-gray-500">Due {formatDate(invoice.dueDate)}</p>
                      </div>
                      <Badge variant={statusConfig[invoice.status].variant}>
                        {statusConfig[invoice.status].icon}
                        <span className="ml-1">{invoice.status}</span>
                      </Badge>
                      <div className="flex items-center gap-1">
                        {invoice.status === 'PENDING' && (
                          <button
                            onClick={() => handleMarkAsPaid(invoice._id)}
                            className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
                            title="Mark as Paid"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadPDF(invoice._id)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(invoice._id)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
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

        {/* Create Invoice Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Invoice" size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Invoice Number"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                required
              />
              <Select
                label="Client Email"
                value={formData.clientEmail}
                onChange={(e) => setFormData((prev) => ({ ...prev, clientEmail: e.target.value }))}
                options={[
                  { value: '', label: 'Select client' },
                  ...clients.map((c) => ({ value: c.email, label: `${c.name} (${c.email})` })),
                ]}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Invoice Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                required
              />
              <Input
                label="Due Date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Items</label>
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      required
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      required
                      min="1"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      required
                      step="0.01"
                    />
                  </div>
                  {formData.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            </div>

            <div className="text-right p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))}
              </p>
            </div>

            <Textarea
              label="Notes (Optional)"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Payment terms, thank you note, etc."
              rows={3}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1" data-testid="save-invoice-btn">
                Create Invoice
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

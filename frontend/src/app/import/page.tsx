'use client';

import React, { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { importAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowRight,
  RefreshCw,
  X,
} from 'lucide-react';

interface PreviewData {
  preview: any[];
  totalRows: number;
  skippedRows: number;
  skippedRowDetails: any[];
}

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [module, setModule] = useState('transactions');
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const modules = [
    { value: 'transactions', label: 'Transactions', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { value: 'clients', label: 'Clients', icon: <FileText className="w-4 h-4" /> },
    { value: 'invoices', label: 'Invoices', icon: <FileText className="w-4 h-4" /> },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setPreviewData(null);
      setImportResult(null);
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) return;
    
    setIsPreviewing(true);
    setError(null);
    
    try {
      const response = await importAPI.preview(selectedFile, module);
      setPreviewData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error previewing file');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      const response = await importAPI.uploadFile(selectedFile, module);
      setImportResult(response.data);
      setPreviewData(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error importing file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await importAPI.getTemplate(module);
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${module}_template.xlsx`;
      a.click();
    } catch (err: any) {
      setError('Error downloading template');
    }
  };

  const resetImport = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderPreviewTable = () => {
    if (!previewData?.preview || previewData.preview.length === 0) return null;

    const columns = Object.keys(previewData.preview[0]);

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {columns.map((col) => (
                <th key={col} className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400 capitalize">
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewData.preview.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                {columns.map((col) => (
                  <td key={col} className="py-3 px-4 text-gray-900 dark:text-white">
                    {col === 'amount' ? formatCurrency(row[col]) : 
                     col === 'date' ? formatDate(row[col]) : 
                     String(row[col] || '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div data-testid="import-page" className="space-y-6 max-w-4xl">
        {/* Import Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Financial Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Upload your existing financial data from Excel or CSV files. We support transactions, clients, and invoices.
            </p>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Data Type"
                value={module}
                onChange={(e) => {
                  setModule(e.target.value);
                  resetImport();
                }}
                options={modules.map(m => ({ value: m.value, label: m.label }))}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Download Template
                </label>
                <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Get {module} Template
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                selectedFile 
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' 
                  : 'border-gray-300 dark:border-gray-700 hover:border-brand-400'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  setSelectedFile(file);
                  setError(null);
                  setPreviewData(null);
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                data-testid="file-input"
              />
              
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-8 h-8 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" size="sm" onClick={resetImport}>
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                    <Button size="sm" onClick={handlePreview} isLoading={isPreviewing} data-testid="preview-btn">
                      Preview Data
                    </Button>
                  </div>
                </div>
              ) : (
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports CSV, XLSX, and XLS files (max 10MB)
                  </p>
                </label>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {previewData && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Preview</CardTitle>
              <div className="flex items-center gap-3">
                <Badge variant="info">{previewData.totalRows} rows found</Badge>
                {previewData.skippedRows > 0 && (
                  <Badge variant="warning">{previewData.skippedRows} will be skipped</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderPreviewTable()}
              
              {previewData.totalRows > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  Showing first 5 of {previewData.totalRows} rows
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" onClick={resetImport}>
                  Cancel
                </Button>
                <Button onClick={handleImport} isLoading={isUploading} data-testid="import-btn">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Import {previewData.totalRows} {module}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Result */}
        {importResult && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Import Successful!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {importResult.count} {module} have been imported successfully.
              </p>
              {importResult.skipped > 0 && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
                  {importResult.skipped} rows were skipped due to invalid data.
                </p>
              )}
              <Button onClick={resetImport}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Import More Data
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Import Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Transactions</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Required columns: Date, Type (INCOME/EXPENSE), Category, Amount. Optional: Description, Currency.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Clients</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Required columns: Name, Email. Optional: Phone, Company, Address, Notes.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Invoices</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Required columns: Invoice Number, Client Email, Date, Due Date, Amount. Optional: Status, Notes.
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Tip: Download our template for the correct format, fill in your data, and upload it back.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// Export Button Component for QualityStudio
// Provides buttons to export data as PDF or Excel

import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../components/ui/dropdown-menu';
import { exports } from '../api/localBackendClient';

const FileText = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const FileSpreadsheet = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="8" y1="13" x2="16" y2="13"></line>
    <line x1="8" y1="17" x2="16" y2="17"></line>
    <line x1="12" y1="9" x2="12" y2="21"></line>
  </svg>
);

const Download = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const Loader = () => (
  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
  </svg>
);

export function ExportButton({ type = 'defects', variant = 'outline', size = 'sm' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async (format) => {
    setLoading(true);
    setError(null);
    
    try {
      await exports.download(type, format);
    } catch (e) {
      setError(e.message);
      console.error('Export failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const labels = {
    defects: 'Defects',
    complaints: 'Complaints',
    kpis: 'KPIs',
    full: 'Full Report',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={loading} data-testid={`export-${type}-btn`}>
          {loading ? <Loader /> : <Download />}
          <span className="ml-2">Export {labels[type]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('pdf')} data-testid={`export-${type}-pdf`}>
          <FileText />
          <span className="ml-2">PDF Report</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')} data-testid={`export-${type}-excel`}>
          <FileSpreadsheet />
          <span className="ml-2">Excel Spreadsheet</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </DropdownMenu>
  );
}

export function ExportAllButton({ variant = 'outline', size = 'sm' }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await exports.download('full', 'excel');
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleExport} disabled={loading} data-testid="export-all-btn">
      {loading ? <Loader /> : <Download />}
      <span className="ml-2">Export All Data</span>
    </Button>
  );
}

export default ExportButton;

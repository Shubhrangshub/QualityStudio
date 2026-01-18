import React, { useState } from "react";
import { api } from '@/api/apiClient';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Download, Database, Loader2, CheckCircle2, 
  FileJson, FileSpreadsheet, AlertCircle 
} from "lucide-react";

const ENTITIES = [
  { name: "CustomerComplaint", label: "Customer Complaints", icon: "📋" },
  { name: "DefectTicket", label: "Defect Tickets", icon: "⚠️" },
  { name: "RCARecord", label: "RCA Records", icon: "🔍" },
  { name: "CAPAPlan", label: "CAPA Plans", icon: "📝" },
  { name: "ProcessRun", label: "Process Runs", icon: "⚙️" },
  { name: "GoldenBatch", label: "Golden Batches", icon: "⭐" },
  { name: "SOP", label: "SOPs", icon: "📖" },
  { name: "DoE", label: "Design of Experiments", icon: "🧪" },
  { name: "KnowledgeDocument", label: "Knowledge Documents", icon: "📚" },
  { name: "Equipment", label: "Equipment", icon: "🔧" },
  { name: "FileUploadHistory", label: "Upload History", icon: "📤" },
];

export default function DatabaseExport() {
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [exportFormat, setExportFormat] = useState("json");
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => api.auth.me(),
  });

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const toggleEntity = (entityName) => {
    setSelectedEntities(prev => 
      prev.includes(entityName) 
        ? prev.filter(e => e !== entityName)
        : [...prev, entityName]
    );
  };

  const selectAll = () => {
    setSelectedEntities(ENTITIES.map(e => e.name));
  };

  const deselectAll = () => {
    setSelectedEntities([]);
  };

  const exportToJSON = async () => {
    setExporting(true);
    setExportStatus({ type: "info", message: "Fetching data from database..." });

    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        entities: {}
      };
      let totalRecords = 0;
      
      for (const entityName of selectedEntities) {
        try {
          setExportStatus({ type: "info", message: `Fetching ${entityName}...` });
          const data = await api.entities[entityName].list("-created_date", 1000);
          exportData.entities[entityName] = data || [];
          totalRecords += (data || []).length;
        } catch (err) {
          console.error(`Error fetching ${entityName}:`, err);
          exportData.entities[entityName] = { error: err.message, data: [] };
        }
      }

      setExportStatus({ type: "info", message: "Preparing download..." });

      // Create download
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Create download link
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `database-export-${new Date().toISOString().split('T')[0]}.json`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }, 100);

      setExportStatus({ 
        type: "success", 
        message: `✅ Downloaded! Exported ${selectedEntities.length} entities with ${totalRecords} total records.`
      });
    } catch (error) {
      console.error("Export error:", error);
      setExportStatus({ 
        type: "error", 
        message: "Export failed: " + error.message 
      });
    }

    setExporting(false);
  };

  const exportToCSV = async () => {
    setExporting(true);
    setExportStatus({ type: "info", message: "Exporting data..." });

    try {
      let filesExported = 0;
      
      for (const entityName of selectedEntities) {
        try {
          const data = await api.entities[entityName].list("-created_date", 1000);
          
          if (!data || data.length === 0) continue;

          // Convert to CSV
          const headers = Object.keys(data[0]);
          const csvRows = [headers.join(',')];
          
          data.forEach(row => {
            const values = headers.map(header => {
              const value = row[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'object') return JSON.stringify(value).replace(/,/g, ';');
              return `"${String(value).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
          });

          const csvContent = csvRows.join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${entityName}-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 100);
          filesExported++;
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`Error exporting ${entityName}:`, err);
        }
      }

      setExportStatus({ 
        type: "success", 
        message: `Successfully exported ${filesExported} CSV files.`
      });
    } catch (error) {
      console.error("Export error:", error);
      setExportStatus({ 
        type: "error", 
        message: "Export failed: " + error.message 
      });
    }

    setExporting(false);
  };

  const handleExport = () => {
    if (exportFormat === "json") {
      exportToJSON();
    } else {
      exportToCSV();
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Access Denied:</strong> Only administrators can export database data.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            Database Export
          </h1>
          <p className="text-gray-600 mt-1">Export application data for backup, analysis, or migration</p>
        </div>

        {/* Export Status */}
        {exportStatus && (
          <Alert className={`mb-6 ${
            exportStatus.type === 'success' ? 'bg-green-50 border-green-200' :
            exportStatus.type === 'error' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            {exportStatus.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            {exportStatus.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
            {exportStatus.type === 'info' && <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />}
            <AlertDescription className={
              exportStatus.type === 'success' ? 'text-green-800' :
              exportStatus.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }>
              {exportStatus.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Entity Selection */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Select Entities to Export</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Deselect All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {ENTITIES.map((entity) => (
                  <div 
                    key={entity.name}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedEntities.includes(entity.name)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleEntity(entity.name)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={selectedEntities.includes(entity.name)}
                        onCheckedChange={() => toggleEntity(entity.name)}
                      />
                      <span className="text-2xl">{entity.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{entity.label}</p>
                        <p className="text-xs text-gray-500">{entity.name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Format</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    exportFormat === 'json' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setExportFormat('json')}
                >
                  <div className="flex items-center gap-3">
                    <FileJson className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">JSON</p>
                      <p className="text-xs text-gray-500">Single file, nested data</p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    exportFormat === 'csv' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setExportFormat('csv')}
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">CSV</p>
                      <p className="text-xs text-gray-500">Multiple files, flat data</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Selected Entities:</span>
                    <Badge>{selectedEntities.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Format:</span>
                    <Badge variant="outline">{exportFormat.toUpperCase()}</Badge>
                  </div>
                </div>

                <Button 
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                  disabled={selectedEntities.length === 0 || exporting}
                  onClick={handleExport}
                >
                  {exporting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" />Export Data</>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <p className="text-xs text-amber-800">
                  <strong>⚠️ Note:</strong> Large datasets may take time to export. 
                  The export is limited to 1000 records per entity.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
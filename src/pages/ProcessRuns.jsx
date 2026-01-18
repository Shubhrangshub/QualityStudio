import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Database, Plus, Trash2, Upload, Loader2, Eye, Edit2, 
  BarChart3, AlertTriangle, CheckCircle2, TrendingUp, 
  GitCompare, Download, Save, X, FileSpreadsheet, Sparkles, CheckSquare
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import ProcessRunEditor from "@/components/processruns/ProcessRunEditor";
import ProcessRunComparison from "@/components/processruns/ProcessRunComparison";
import SampleDataLoader from "@/components/processruns/SampleDataLoader";

export default function ProcessRuns() {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedRun, setSelectedRun] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editMode, setEditMode] = useState("create"); // "create" or "edit"
  const [currentUser, setCurrentUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [showSampleData, setShowSampleData] = useState(false);
  const [selectedRunIds, setSelectedRunIds] = useState([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const { data: allProcessRuns = [], isLoading } = useQuery({
    queryKey: ['process-runs'],
    queryFn: () => base44.entities.ProcessRun.list("-dateTimeStart", 200),
  });
  
  const processRuns = showSampleData 
    ? allProcessRuns 
    : allProcessRuns.filter(r => !r.isSampleData);

  const { data: allDefects = [] } = useQuery({
    queryKey: ['defects-for-runs'],
    queryFn: () => base44.entities.DefectTicket.list("-created_date", 500),
  });
  
  const defects = showSampleData 
    ? allDefects 
    : allDefects.filter(d => !d.isSampleData);

  const { data: allGoldenBatches = [] } = useQuery({
    queryKey: ['golden-batches-for-runs'],
    queryFn: () => base44.entities.GoldenBatch.filter({ status: "active" }, "-created_date", 50),
  });
  
  const goldenBatches = showSampleData 
    ? allGoldenBatches 
    : allGoldenBatches.filter(b => !b.isSampleData);

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const result = await base44.entities.ProcessRun.delete(id);
      console.log('Delete result:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-runs'] });
      alert("Process run deleted successfully");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      alert("Failed to delete: " + (error.message || "Unknown error"));
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      console.log('Attempting to delete:', ids.length, 'runs');
      let deleted = 0;
      let failed = 0;
      
      for (const id of ids) {
        try {
          await base44.entities.ProcessRun.delete(id);
          deleted++;
          console.log(`Deleted ${id}`);
        } catch (error) {
          failed++;
          console.error(`Failed to delete ${id}:`, error);
        }
      }
      
      return { deleted, failed, total: ids.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['process-runs'] });
      setSelectedRunIds([]);
      alert(`Deleted ${result.deleted} of ${result.total} runs. ${result.failed > 0 ? `Failed: ${result.failed}` : ''}`);
    },
    onError: (error) => {
      console.error("Bulk delete error:", error);
      alert("Bulk delete failed: " + (error.message || "Unknown error"));
    }
  });

  const handleDelete = (run) => {
    if (!isAdmin) {
      alert("Only admins can delete Process Runs");
      return;
    }
    if (window.confirm(`Delete Process Run from ${new Date(run.dateTimeStart).toLocaleString()}? This cannot be undone.`)) {
      deleteMutation.mutate(run.id);
    }
  };

  const handleBulkDelete = async () => {
    if (!isAdmin) {
      alert("Only admins can delete Process Runs");
      return;
    }
    if (selectedRunIds.length === 0) {
      alert("Please select runs to delete");
      return;
    }
    if (window.confirm(`Delete ${selectedRunIds.length} selected process runs? This cannot be undone.`)) {
      console.log('🗑️ Starting bulk delete of:', selectedRunIds);
      await bulkDeleteMutation.mutateAsync(selectedRunIds);
    }
  };

  const toggleSelectRun = (runId) => {
    setSelectedRunIds(prev => 
      prev.includes(runId) 
        ? prev.filter(id => id !== runId) 
        : [...prev, runId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRunIds.length === processRuns.length) {
      setSelectedRunIds([]);
    } else {
      setSelectedRunIds(processRuns.map(r => r.id));
    }
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    setUploadResult(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            records: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true
              }
            }
          }
        }
      });

      if (extractResult.status === "success") {
        let runs = extractResult.output?.records || 
                   extractResult.output?.data ||
                   (Array.isArray(extractResult.output) ? extractResult.output : []);
        
        if (!Array.isArray(runs) && typeof extractResult.output === 'object') {
          const keys = Object.keys(extractResult.output);
          for (const key of keys) {
            if (Array.isArray(extractResult.output[key])) {
              runs = extractResult.output[key];
              break;
            }
          }
        }

        // Create process runs
        for (const run of runs) {
          await base44.entities.ProcessRun.create({
            ...run,
            dateTimeStart: run.dateTimeStart || run.timestamp || run.date || new Date().toISOString(),
            dateTimeEnd: run.dateTimeEnd || new Date().toISOString(),
            shift: run.shift || "A",
            sensorsRaw: { originalRow: run }
          });
        }

        queryClient.invalidateQueries({ queryKey: ['process-runs'] });
        setUploadResult({
          success: true,
          count: runs.length,
          message: `Successfully imported ${runs.length} process runs`
        });
      } else {
        setUploadResult({
          success: false,
          message: extractResult.details || "Failed to extract data"
        });
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: error.message || "Upload failed"
      });
    }

    setUploading(false);
  };

  const handleEditorComplete = () => {
    setShowEditor(false);
    setSelectedRun(null);
    queryClient.invalidateQueries({ queryKey: ['process-runs'] });
  };

  // Get defects for a specific run based on line and date range
  const getDefectsForRun = (run) => {
    if (!run) return [];
    const runStart = new Date(run.dateTimeStart);
    const runEnd = run.dateTimeEnd ? new Date(run.dateTimeEnd) : new Date(runStart.getTime() + 8 * 60 * 60 * 1000); // default 8 hours
    
    return defects.filter(d => {
      const defectDate = new Date(d.dateTime || d.created_date);
      return d.line === run.line && 
             defectDate >= runStart && 
             defectDate <= runEnd;
    });
  };

  // Stats
  const uniqueLines = [...new Set(processRuns.map(r => r.line).filter(Boolean))];
  const uniqueProducts = [...new Set(processRuns.map(r => r.productCode).filter(Boolean))];
  const runsWithFPY = processRuns.filter(r => r.qualityMetrics?.firstPassYield);
  const avgFPY = runsWithFPY.length > 0 
    ? (runsWithFPY.reduce((sum, r) => sum + r.qualityMetrics.firstPassYield, 0) / runsWithFPY.length).toFixed(1)
    : 0;

  const sampleDataCount = allProcessRuns.filter(r => r.isSampleData).length;

  const handleSampleDataSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['process-runs'] });
    queryClient.invalidateQueries({ queryKey: ['defects-for-runs'] });
    queryClient.invalidateQueries({ queryKey: ['golden-batches-for-runs'] });
    setShowSampleData(true);
    setUploadResult({
      success: true,
      message: "✅ Sample data loaded! 5 process runs (varying quality 85-98% FPY), 1 golden batch, 2 linked defects created."
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              Process Runs Management
            </h1>
            <p className="text-gray-600 mt-1">Upload, manage, and compare production process runs</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button 
                onClick={() => {
                  setEditMode("create");
                  setSelectedRun(null);
                  setShowEditor(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Process Run
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Runs</p>
                  <p className="text-2xl font-bold text-gray-900">{processRuns.length}</p>
                </div>
                <Database className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Lines</p>
                  <p className="text-2xl font-bold text-green-600">{uniqueLines.length}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Products</p>
                  <p className="text-2xl font-bold text-purple-600">{uniqueProducts.length}</p>
                </div>
                <FileSpreadsheet className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Avg FPY</p>
                  <p className="text-2xl font-bold text-orange-600">{avgFPY}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <SampleDataLoader
          onSuccess={handleSampleDataSuccess}
          sampleDataCount={sampleDataCount}
          showSampleData={showSampleData}
          onToggleShow={() => setShowSampleData(!showSampleData)}
        />

        {uploadResult && (
          <Alert className={`mb-6 ${uploadResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {uploadResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={uploadResult.success ? 'text-green-800' : 'text-red-800'}>
              {uploadResult.message}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="list">Process Runs</TabsTrigger>
            <TabsTrigger value="upload">Upload Data</TabsTrigger>
            <TabsTrigger value="compare">Compare Runs</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : processRuns.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Process Runs Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Upload process data or manually add runs to get started
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setActiveTab("upload")} variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Data
                    </Button>
                    {isAdmin && (
                      <Button onClick={() => { setEditMode("create"); setShowEditor(true); }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Manually
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Bulk Actions */}
                {isAdmin && processRuns.length > 0 && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedRunIds.length === processRuns.length && processRuns.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {selectedRunIds.length === 0 
                              ? 'Select runs for bulk actions' 
                              : `${selectedRunIds.length} run(s) selected`}
                          </span>
                        </div>
                        {selectedRunIds.length > 0 && (
                          <Button
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {bulkDeleteMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Selected ({selectedRunIds.length})
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {processRuns.map((run) => {
                  const runDefects = getDefectsForRun(run);
                  const matchingGoldenBatch = goldenBatches.find(
                    b => b.productCode === run.productCode || b.line === run.line
                  );
                  
                  return (
                    <Card key={run.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {isAdmin && (
                            <Checkbox
                              checked={selectedRunIds.includes(run.id)}
                              onCheckedChange={() => toggleSelectRun(run.id)}
                            />
                          )}
                          <div className="flex-1 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-lg">{run.productCode || 'Unknown Product'}</span>
                              <Badge variant="outline">{run.line}</Badge>
                              {run.shift && <Badge className="bg-gray-100 text-gray-700">Shift {run.shift}</Badge>}
                              {run.isSampleData && (
                                <Badge className="bg-purple-100 text-purple-800 border-purple-300 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  Sample
                                </Badge>
                              )}
                              {matchingGoldenBatch && (
                                <Badge className="bg-yellow-100 text-yellow-800">Has Golden Batch</Badge>
                              )}
                            </div>
                            
                            <div className="grid md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                              <div>
                                <span className="font-medium">Date:</span>{" "}
                                {new Date(run.dateTimeStart).toLocaleString()}
                              </div>
                              <div>
                                <span className="font-medium">Speed:</span>{" "}
                                {run.lineSpeed || 'N/A'} m/min
                              </div>
                              <div>
                                <span className="font-medium">Operator:</span>{" "}
                                {run.operator || 'N/A'}
                              </div>
                              {run.qualityMetrics?.firstPassYield && (
                                <div className="text-green-600">
                                  <span className="font-medium">FPY:</span>{" "}
                                  {run.qualityMetrics.firstPassYield}%
                                </div>
                              )}
                            </div>

                            {/* Defects Alert */}
                            {runDefects.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                                <span className="text-sm text-orange-700">
                                  {runDefects.length} defect(s) during this run: {" "}
                                  {[...new Set(runDefects.map(d => d.defectType?.replace(/_/g, ' ')))].slice(0, 3).join(', ')}
                                  {runDefects.length > 3 && '...'}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRun(run);
                                setActiveTab("compare");
                              }}
                            >
                              <GitCompare className="w-4 h-4 mr-1" />
                              Compare
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRun(run);
                                setEditMode("view");
                                setShowEditor(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRun(run);
                                    setEditMode("edit");
                                    setShowEditor(true);
                                  }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(run)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-600" />
                    Upload Process Run Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                      onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                      className="hidden"
                      id="process-run-upload"
                      disabled={uploading}
                    />
                    <label htmlFor="process-run-upload">
                      <Button asChild disabled={uploading}>
                        <span>
                          {uploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Select CSV/Excel File
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-gray-500 mt-2">Supports CSV and Excel files</p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">Expected Columns:</p>
                    <div className="text-xs text-blue-700 grid grid-cols-2 gap-1">
                      <span>• dateTimeStart</span>
                      <span>• line</span>
                      <span>• productCode</span>
                      <span>• operator</span>
                      <span>• lineSpeed</span>
                      <span>• nipPressure</span>
                      <span>• webTensionIn/Out</span>
                      <span>• rollTempChill/Top/Bottom</span>
                      <span>• humidity</span>
                      <span>• roomTemp</span>
                      <span>• coronaDyne</span>
                      <span>• uvDose</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5 text-green-600" />
                      Add Manually
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      Manually enter process run parameters one at a time.
                    </p>
                    <Button 
                      onClick={() => {
                        setEditMode("create");
                        setSelectedRun(null);
                        setShowEditor(true);
                      }}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Process Run
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="compare">
            <ProcessRunComparison
              processRuns={processRuns}
              goldenBatches={goldenBatches}
              defects={defects}
              selectedRun={selectedRun}
              onSelectRun={setSelectedRun}
            />
          </TabsContent>
        </Tabs>

        {/* Editor Dialog */}
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editMode === "create" ? (
                  <>
                    <Plus className="w-5 h-5 text-blue-600" />
                    Add Process Run
                  </>
                ) : editMode === "edit" ? (
                  <>
                    <Edit2 className="w-5 h-5 text-blue-600" />
                    Edit Process Run
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5 text-blue-600" />
                    View Process Run
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            <ProcessRunEditor
              run={selectedRun}
              mode={editMode}
              isAdmin={isAdmin}
              defects={selectedRun ? getDefectsForRun(selectedRun) : []}
              onComplete={handleEditorComplete}
              onCancel={() => setShowEditor(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
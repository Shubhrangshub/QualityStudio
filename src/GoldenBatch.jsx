import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Award, Plus, Trash2, CheckCircle2, Loader2, ArrowRight, 
  TrendingUp, AlertTriangle, Settings, Eye, BarChart3, Upload
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import GoldenBatchWizard from "../components/goldenbatch/GoldenBatchWizard";
import GoldenBatchComparison from "../components/goldenbatch/GoldenBatchComparison";
import GoldenBatchCard from "../components/goldenbatch/GoldenBatchCard";

export default function GoldenBatch() {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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

  const { data: goldenBatches = [], isLoading } = useQuery({
    queryKey: ['golden-batches'],
    queryFn: () => base44.entities.GoldenBatch.filter({ status: "active" }, "-created_date", 50),
  });

  const { data: processRuns = [] } = useQuery({
    queryKey: ['process-runs-for-golden'],
    queryFn: () => base44.entities.ProcessRun.list("-dateTimeStart", 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GoldenBatch.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['golden-batches'] });
    }
  });

  const deleteProcessRunMutation = useMutation({
    mutationFn: (id) => base44.entities.ProcessRun.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-runs-for-golden'] });
    }
  });

  const handleDeleteProcessRun = (run) => {
    if (!isAdmin) {
      alert("Only admins can delete Process Runs");
      return;
    }
    if (window.confirm(`Delete Process Run from ${new Date(run.dateTimeStart).toLocaleString()}? This cannot be undone.`)) {
      deleteProcessRunMutation.mutate(run.id);
    }
  };

  const handleDelete = (batch) => {
    if (!isAdmin) {
      alert("Only admins can delete Golden Batch records");
      return;
    }
    if (window.confirm(`Delete Golden Batch "${batch.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(batch.id);
    }
  };

  const handleWizardComplete = () => {
    setShowWizard(false);
    queryClient.invalidateQueries({ queryKey: ['golden-batches'] });
  };

  // Get unique products and lines
  const uniqueProducts = [...new Set(processRuns.map(r => r.productCode).filter(Boolean))];
  const uniqueLines = [...new Set(processRuns.map(r => r.line).filter(Boolean))];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Award className="w-8 h-8 text-yellow-500" />
              Golden Batch Management
            </h1>
            <p className="text-gray-600 mt-1">Define and compare against optimal production parameters</p>
          </div>
          <Button 
            onClick={() => setShowWizard(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Golden Batch
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Golden Batches</p>
                  <p className="text-2xl font-bold text-gray-900">{goldenBatches.length}</p>
                </div>
                <Award className="w-8 h-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Products Covered</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {[...new Set(goldenBatches.map(b => b.productCode))].length}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Lines Covered</p>
                  <p className="text-2xl font-bold text-green-600">
                    {[...new Set(goldenBatches.map(b => b.line))].length}
                  </p>
                </div>
                <Settings className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Avg First Pass Yield</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {goldenBatches.length > 0 
                      ? (goldenBatches.reduce((sum, b) => sum + (b.qualityMetrics?.firstPassYield || 0), 0) / goldenBatches.length).toFixed(1)
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="list">Golden Batches</TabsTrigger>
            <TabsTrigger value="compare">Compare & Analyze</TabsTrigger>
            <TabsTrigger value="process-runs">Process Runs ({processRuns.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : goldenBatches.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Golden Batches Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first Golden Batch to define optimal production parameters
                  </p>
                  <Button 
                    onClick={() => setShowWizard(true)}
                    className="bg-yellow-500 hover:bg-yellow-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Golden Batch
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {goldenBatches.map((batch) => (
                  <GoldenBatchCard
                    key={batch.id}
                    batch={batch}
                    isAdmin={isAdmin}
                    onDelete={() => handleDelete(batch)}
                    onSelect={() => {
                      setSelectedBatch(batch);
                      setActiveTab("compare");
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="compare">
            {processRuns.length === 0 ? (
              <Alert className="bg-yellow-50 border-yellow-300">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-900">
                  <strong>No Process Run Data Available</strong>
                  <p className="mt-2">Upload process run data via <strong>Data Upload</strong> page first to enable Golden Batch comparison.</p>
                </AlertDescription>
              </Alert>
            ) : (
              <GoldenBatchComparison
                goldenBatches={goldenBatches}
                processRuns={processRuns}
                selectedBatch={selectedBatch}
                onSelectBatch={setSelectedBatch}
              />
            )}
          </TabsContent>

          <TabsContent value="process-runs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Uploaded Process Runs</CardTitle>
                  <Badge variant="outline">{processRuns.length} runs</Badge>
                </div>
                <p className="text-sm text-gray-500">
                  Process runs uploaded via Data Upload appear here and can be compared against Golden Batches.
                  {!isAdmin && " Only admins can delete process runs."}
                </p>
              </CardHeader>
              <CardContent>
                {processRuns.length === 0 ? (
                  <div className="text-center py-8">
                    <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No process runs uploaded yet.</p>
                    <p className="text-sm text-gray-500">Go to Data Upload to import process data.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {processRuns.map((run) => (
                      <div 
                        key={run.id} 
                        className="p-3 border rounded-lg bg-white hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{run.productCode}</span>
                            <Badge variant="outline">{run.line}</Badge>
                            {run.shift && <Badge className="bg-gray-100 text-gray-700">Shift {run.shift}</Badge>}
                          </div>
                          <p className="text-xs text-gray-600">
                            {new Date(run.dateTimeStart).toLocaleString()} • 
                            Speed: {run.lineSpeed || 'N/A'}m/min • 
                            Operator: {run.operator || 'N/A'}
                          </p>
                          {run.qualityMetrics?.firstPassYield && (
                            <p className="text-xs text-green-600 mt-1">
                              FPY: {run.qualityMetrics.firstPassYield}%
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBatch(goldenBatches.find(b => b.productCode === run.productCode || b.line === run.line) || goldenBatches[0]);
                              setActiveTab("compare");
                            }}
                            disabled={goldenBatches.length === 0}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Compare
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProcessRun(run)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Wizard Dialog */}
        <Dialog open={showWizard} onOpenChange={setShowWizard}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Create Golden Batch
              </DialogTitle>
            </DialogHeader>
            <GoldenBatchWizard
              processRuns={processRuns}
              uniqueProducts={uniqueProducts}
              uniqueLines={uniqueLines}
              onComplete={handleWizardComplete}
              onCancel={() => setShowWizard(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
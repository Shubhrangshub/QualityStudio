import React, { useState } from "react";
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowRight, ArrowLeft, CheckCircle2, Loader2, Upload, 
  FileSpreadsheet, Settings, Award, Info
} from "lucide-react";

const DEFAULT_PARAMETER_FIELDS = [
  { key: "lineSpeed", label: "Line Speed", unit: "m/min" },
  { key: "webTensionIn", label: "Web Tension In", unit: "N/m" },
  { key: "webTensionOut", label: "Web Tension Out", unit: "N/m" },
  { key: "nipPressure", label: "Nip Pressure", unit: "bar" },
  { key: "rollTempChill", label: "Chill Roll Temp", unit: "°C" },
  { key: "rollTempTop", label: "Top Roll Temp", unit: "°C" },
  { key: "rollTempBottom", label: "Bottom Roll Temp", unit: "°C" },
  { key: "humidity", label: "Humidity", unit: "%" },
  { key: "roomTemp", label: "Room Temp", unit: "°C" },
  { key: "coronaDyne", label: "Corona Dyne", unit: "dyne/cm" },
  { key: "uvDose", label: "UV Dose", unit: "mJ/cm²" },
  { key: "coatWeight", label: "Coat Weight", unit: "g/m²" },
  { key: "unwindTorque", label: "Unwind Torque", unit: "Nm" },
  { key: "rewindTorque", label: "Rewind Torque", unit: "Nm" },
];

export default function GoldenBatchWizard({ processRuns, uniqueProducts, uniqueLines, onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [inputMethod, setInputMethod] = useState(null); // 'process_run' or 'manual'
  const [customParameters, setCustomParameters] = useState([]); // NEW: Custom parameters added by user
  const [newParamKey, setNewParamKey] = useState("");
  const [newParamLabel, setNewParamLabel] = useState("");
  const [newParamUnit, setNewParamUnit] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    productCode: "",
    line: "",
    description: "",
    sourceProcessRunId: "",
    parameters: {},
    tolerances: {},
    qualityMetrics: {
      firstPassYield: 99,
      defectRate: 0,
      wastePercent: 0
    }
  });

  // Combine default and custom parameters
  const PARAMETER_FIELDS = [...DEFAULT_PARAMETER_FIELDS, ...customParameters];

  const handleProcessRunSelect = (runId) => {
    const run = processRuns.find(r => r.id === runId);
    if (run) {
      // Only copy parameters that exist in the run
      const params = {};
      ['lineSpeed', 'webTensionIn', 'webTensionOut', 'nipPressure', 'rollTempChill', 
       'rollTempTop', 'rollTempBottom', 'humidity', 'roomTemp', 'coronaDyne', 
       'uvDose', 'coatWeight', 'unwindTorque', 'rewindTorque'].forEach(key => {
        if (run[key] !== undefined && run[key] !== null) {
          params[key] = run[key];
        }
      });

      setFormData({
        ...formData,
        sourceProcessRunId: runId,
        productCode: run.productCode || "",
        line: run.line || "",
        parameters: params,
        qualityMetrics: run.qualityMetrics || formData.qualityMetrics
      });
    }
  };

  const handleParameterChange = (key, value) => {
    setFormData({
      ...formData,
      parameters: {
        ...formData.parameters,
        [key]: value === "" ? undefined : parseFloat(value)
      }
    });
  };

  const handleToleranceChange = (key, value) => {
    setFormData({
      ...formData,
      tolerances: {
        ...formData.tolerances,
        [key]: value === "" ? 5 : parseFloat(value)
      }
    });
  };

  const addCustomParameter = () => {
    if (!newParamKey || !newParamLabel) {
      alert("Please enter both parameter key and label");
      return;
    }
    
    // Check for duplicates
    if (PARAMETER_FIELDS.some(p => p.key === newParamKey)) {
      alert("This parameter already exists");
      return;
    }
    
    setCustomParameters([
      ...customParameters,
      { key: newParamKey, label: newParamLabel, unit: newParamUnit || "" }
    ]);
    
    // Reset form
    setNewParamKey("");
    setNewParamLabel("");
    setNewParamUnit("");
  };

  const removeCustomParameter = (key) => {
    setCustomParameters(customParameters.filter(p => p.key !== key));
    // Remove from formData if it was set
    const newParams = {...formData.parameters};
    delete newParams[key];
    const newTolerances = {...formData.tolerances};
    delete newTolerances[key];
    setFormData({
      ...formData,
      parameters: newParams,
      tolerances: newTolerances
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const user = await api.auth.me();
      
      // Check for duplicates
      const existingBatches = await api.entities.GoldenBatch.filter({
        productCode: formData.productCode,
        line: formData.line,
        status: "active"
      });
      
      if (existingBatches.length > 0) {
        const proceed = window.confirm(
          `⚠️ A Golden Batch already exists for ${formData.productCode} on ${formData.line}:\n"${existingBatches[0].name}"\n\n` +
          `Creating another may cause confusion. Consider:\n` +
          `• Using a different name to distinguish (e.g., add "v2" or date)\n` +
          `• Updating the existing Golden Batch instead\n\n` +
          `Continue creating new Golden Batch?`
        );
        if (!proceed) {
          setSaving(false);
          return;
        }
      }
      
      // Set default tolerances for any missing
      const finalTolerances = {};
      PARAMETER_FIELDS.forEach(field => {
        finalTolerances[field.key] = formData.tolerances[field.key] || 5;
      });

      await api.entities.GoldenBatch.create({
        ...formData,
        tolerances: finalTolerances,
        status: "active",
        approvedBy: user.email,
        approvedDate: new Date().toISOString()
      });
      
      onComplete();
    } catch (error) {
      console.error("Error creating golden batch:", error);
      alert("Failed to create golden batch: " + error.message);
    }
    setSaving(false);
  };

  const canProceed = () => {
    switch(step) {
      case 1: return inputMethod !== null;
      case 2: return formData.name && formData.productCode && formData.line;
      case 3: return Object.keys(formData.parameters).some(k => formData.parameters[k] !== undefined);
      case 4: return true;
      default: return false;
    }
  };

  const filteredRuns = processRuns.filter(run => {
    if (formData.productCode && run.productCode !== formData.productCode) return false;
    if (formData.line && run.line !== formData.line) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= s ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
            </div>
            {s < 4 && (
              <div className={`w-16 h-1 mx-2 ${step > s ? 'bg-yellow-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Input Method */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 1: Choose How to Create Golden Batch</h3>
          <p className="text-gray-600 text-sm">
            Select how you want to define your golden batch parameters
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                inputMethod === 'process_run' ? 'border-2 border-yellow-500 bg-yellow-50' : ''
              }`}
              onClick={() => setInputMethod('process_run')}
            >
              <CardContent className="p-6 text-center">
                <FileSpreadsheet className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h4 className="font-bold text-lg mb-2">From Process Run</h4>
                <p className="text-sm text-gray-600">
                  Select an existing successful process run and use its parameters as the golden standard
                </p>
                <Badge className="mt-3 bg-blue-100 text-blue-800">Recommended</Badge>
              </CardContent>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                inputMethod === 'manual' ? 'border-2 border-yellow-500 bg-yellow-50' : ''
              }`}
              onClick={() => setInputMethod('manual')}
            >
              <CardContent className="p-6 text-center">
                <Settings className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h4 className="font-bold text-lg mb-2">Manual Entry</h4>
                <p className="text-sm text-gray-600">
                  Manually enter all parameters based on your engineering knowledge
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 2: Basic Info */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 2: Basic Information</h3>
          <p className="text-gray-600 text-sm">
            Provide details about this golden batch
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Golden Batch Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Premium Clear 35% - Line A Optimal"
              />
            </div>
            
            <div>
              <Label>Product Code *</Label>
              <Input
                value={formData.productCode}
                onChange={(e) => setFormData({...formData, productCode: e.target.value})}
                placeholder="Enter or type new product code"
                list="product-codes-list"
              />
              <datalist id="product-codes-list">
                {uniqueProducts.map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              <p className="text-xs text-gray-500 mt-1">Type a new code or select from existing</p>
            </div>
            
            <div>
              <Label>Production Line *</Label>
              <Input
                value={formData.line}
                onChange={(e) => setFormData({...formData, line: e.target.value})}
                placeholder="Enter or type new line"
                list="lines-list"
              />
              <datalist id="lines-list">
                {uniqueLines.map(l => (
                  <option key={l} value={l} />
                ))}
              </datalist>
              <p className="text-xs text-gray-500 mt-1">Type a new line or select from existing</p>
            </div>
            
            {inputMethod === 'process_run' && (
              <div>
                <Label>Source Process Run</Label>
                <Select
                  value={formData.sourceProcessRunId}
                  onValueChange={handleProcessRunSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a successful run" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRuns.slice(0, 20).map(run => (
                      <SelectItem key={run.id} value={run.id}>
                        {run.productCode} - {new Date(run.dateTimeStart).toLocaleDateString()} 
                        {run.qualityMetrics?.firstPassYield && ` (FPY: ${run.qualityMetrics.firstPassYield}%)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe why this batch represents optimal parameters..."
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Step 3: Parameters */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 3: Process Parameters</h3>
          <p className="text-gray-600 text-sm">
            {inputMethod === 'process_run' 
              ? 'Review and adjust the parameters from the selected process run'
              : 'Enter the optimal process parameters'
            }
          </p>
          
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Leave fields blank if they don't apply to your process. Only filled parameters will be tracked.
            </AlertDescription>
          </Alert>
          
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {PARAMETER_FIELDS.map(field => (
              <div key={field.key} className="relative">
                <Label className="text-xs">{field.label} ({field.unit})</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.parameters[field.key] ?? ""}
                    onChange={(e) => handleParameterChange(field.key, e.target.value)}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                  {customParameters.some(p => p.key === field.key) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomParameter(field.key)}
                      className="text-red-600 hover:bg-red-50 px-2"
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Custom Parameter Section */}
          <Card className="mt-6 bg-green-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-green-600" />
                Add Custom Parameter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Parameter Key *</Label>
                  <Input
                    value={newParamKey}
                    onChange={(e) => setNewParamKey(e.target.value)}
                    placeholder="e.g., adhesiveTemp"
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs">Display Label *</Label>
                  <Input
                    value={newParamLabel}
                    onChange={(e) => setNewParamLabel(e.target.value)}
                    placeholder="e.g., Adhesive Temperature"
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs">Unit</Label>
                  <Input
                    value={newParamUnit}
                    onChange={(e) => setNewParamUnit(e.target.value)}
                    placeholder="e.g., °C, bar, m/min"
                    className="bg-white"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={addCustomParameter}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    Add Parameter
                  </Button>
                </div>
              </div>
              {customParameters.length > 0 && (
                <div className="mt-3 p-2 bg-white rounded border">
                  <p className="text-xs font-medium text-gray-700 mb-2">Custom Parameters Added:</p>
                  <div className="flex flex-wrap gap-1">
                    {customParameters.map(p => (
                      <Badge key={p.key} className="bg-green-100 text-green-800">
                        {p.label} ({p.unit || 'no unit'})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6">
            <h4 className="font-semibold mb-2">Quality Metrics (Optional)</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">First Pass Yield (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.qualityMetrics.firstPassYield}
                  onChange={(e) => setFormData({
                    ...formData,
                    qualityMetrics: {...formData.qualityMetrics, firstPassYield: parseFloat(e.target.value) || 0}
                  })}
                />
              </div>
              <div>
                <Label className="text-xs">Defect Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.qualityMetrics.defectRate}
                  onChange={(e) => setFormData({
                    ...formData,
                    qualityMetrics: {...formData.qualityMetrics, defectRate: parseFloat(e.target.value) || 0}
                  })}
                />
              </div>
              <div>
                <Label className="text-xs">Waste (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.qualityMetrics.wastePercent}
                  onChange={(e) => setFormData({
                    ...formData,
                    qualityMetrics: {...formData.qualityMetrics, wastePercent: parseFloat(e.target.value) || 0}
                  })}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Tolerances */}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 4: Set Tolerances</h3>
          <p className="text-gray-600 text-sm">
            Define acceptable deviation (%) from golden values. Default is ±5%.
          </p>
          
          <Alert className="bg-yellow-50 border-yellow-200">
            <Award className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Parameters within tolerance will show as ✓, outside tolerance will trigger alerts.
            </AlertDescription>
          </Alert>
          
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {PARAMETER_FIELDS.filter(f => formData.parameters[f.key] !== undefined).map(field => (
              <div key={field.key} className="p-3 border rounded-lg bg-gray-50">
                <Label className="text-xs font-medium">{field.label}</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Golden: {formData.parameters[field.key]} {field.unit}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs">±</span>
                  <Input
                    type="number"
                    step="0.5"
                    className="w-20"
                    value={formData.tolerances[field.key] ?? 5}
                    onChange={(e) => handleToleranceChange(field.key, e.target.value)}
                  />
                  <span className="text-xs">%</span>
                </div>
              </div>
            ))}
          </div>

          {Object.keys(formData.parameters).filter(k => formData.parameters[k] !== undefined).length === 0 && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                No parameters defined. Please go back and enter at least one parameter.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => step === 1 ? onCancel() : setStep(step - 1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        
        {step < 4 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={saving || !canProceed()}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Create Golden Batch
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
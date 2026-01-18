import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, X, FileText, XCircle, Sparkles, Loader2 } from "lucide-react";

const initialConfig = {
  reportName: "",
  template: "detailed_analysis",
  filters: {
    dateRange: "30d",
    customStartDate: null,
    customEndDate: null,
    lines: [],
    products: [],
    defectTypes: [],
    severities: []
  },
  metrics: [],
  actionTriggers: {
    enabled: false,
    conditions: []
  }
};

export default function CustomReportBuilder({ 
  onGenerate, 
  loading,
  lines = [],
  products = [],
  defectTypes = [],
  capaPlans = [],
  onReset
}) {
  const [config, setConfig] = useState(initialConfig);
  
  // Fetch saved SPC analyses for comparative study
  const { data: spcAnalyses = [] } = useQuery({
    queryKey: ['spc-analyses-for-reports'],
    queryFn: () => api.entities.SPCAnalysis.list("-analysisDate", 100),
  });

  // Local state for Calendar component, which prefers undefined for unselected dates
  const [customDates, setCustomDates] = useState({ from: undefined, to: undefined });

  // NEW: Action trigger configuration UI visibility
  const [showActionTriggers, setShowActionTriggers] = useState(false);

  // Available metrics (unchanged)
  const availableMetrics = [
    { id: "firstPassYield", label: "First Pass Yield", category: "quality" },
    { id: "defectRate", label: "Defect Rate", category: "quality" },
    { id: "defectPPM", label: "Defects PPM", category: "quality" },
    { id: "cpk", label: "Process Capability (Cpk)", category: "quality" },
    { id: "capaClosureRate", label: "CAPA Closure Rate", category: "capa" },
    { id: "topDefects", label: "Top 10 Defects", category: "analysis" }
  ];

  const templates = [
    { id: "executive_summary", name: "Executive Summary", defaultMetrics: ["firstPassYield", "defectRate"] },
    { id: "detailed_analysis", name: "Detailed Analysis", defaultMetrics: ["firstPassYield", "defectPPM", "cpk", "topDefects"] },
    { id: "custom", name: "Custom Report", defaultMetrics: [] }
  ];

  // Effect to update metrics when template changes
  useEffect(() => {
    const selectedTemplate = templates.find(t => t.id === config.template);
    if (selectedTemplate && config.metrics.length === 0) {
      setConfig(prevConfig => ({
        ...prevConfig,
        metrics: selectedTemplate.defaultMetrics
      }));
    }
  }, [config.template]);

  // Effect to update customStartDate/EndDate in config when customDates change
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        customStartDate: customDates.from ? format(customDates.from, 'yyyy-MM-dd') : null,
        customEndDate: customDates.to ? format(customDates.to, 'yyyy-MM-dd') : null,
      }
    }));
  }, [customDates]);


  const handleFilterSelection = (filterType, value) => {
    setConfig(prevConfig => {
      const currentSelection = prevConfig.filters[filterType];
      const newSelection = currentSelection.includes(value)
        ? currentSelection.filter(item => item !== value)
        : [...currentSelection, value];
      return {
        ...prevConfig,
        filters: {
          ...prevConfig.filters,
          [filterType]: newSelection
        }
      };
    });
  };

  const toggleMetric = (metricId) => {
    setConfig(prevConfig => {
      const currentMetrics = prevConfig.metrics;
      const newMetrics = currentMetrics.includes(metricId)
        ? currentMetrics.filter(id => id !== metricId)
        : [...currentMetrics, metricId];

      // If template is not "custom", switching metric should set template to "custom"
      let newTemplate = prevConfig.template;
      if (prevConfig.template !== "custom") {
        newTemplate = "custom";
      }

      return {
        ...prevConfig,
        template: newTemplate,
        metrics: newMetrics
      };
    });
  };

  const addActionTrigger = () => {
    setConfig(prev => ({
      ...prev,
      actionTriggers: {
        ...prev.actionTriggers,
        conditions: [
          ...prev.actionTriggers.conditions,
          {
            metric: "defectRate",
            threshold: "",
            operator: "greater_than",
            action: "email_alert",
            recipients: []
          }
        ]
      }
    }));
  };

  const updateActionTrigger = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      actionTriggers: {
        ...prev.actionTriggers,
        conditions: prev.actionTriggers.conditions.map((cond, idx) => 
          idx === index ? { ...cond, [field]: value } : cond
        )
      }
    }));
  };

  const removeActionTrigger = (index) => {
    setConfig(prev => ({
      ...prev,
      actionTriggers: {
        ...prev.actionTriggers,
        conditions: prev.actionTriggers.conditions.filter((_, idx) => idx !== index)
      }
    }));
  };

  const resetForm = () => {
    setConfig({
      ...initialConfig,
      metrics: [] // Ensure metrics are cleared
    });
    setCustomDates({ from: undefined, to: undefined });
    setShowActionTriggers(false);
  };

  // Expose reset function via prop callback
  React.useEffect(() => {
    if (onReset) {
      onReset(resetForm);
    }
  }, [onReset]);

  const handleGenerate = () => {
    // If a custom date range is selected but dates are not picked, set them to null in config
    const finalConfig = {
      ...config,
      reportName: config.reportName || `Quality Report ${format(new Date(), 'yyyy-MM-dd')}`,
      filters: {
        ...config.filters,
        customStartDate: config.filters.dateRange === 'custom' && !config.filters.customStartDate ? null : config.filters.customStartDate,
        customEndDate: config.filters.dateRange === 'custom' && !config.filters.customEndDate ? null : config.filters.customEndDate,
      }
    };
    onGenerate(finalConfig, resetForm);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" />
          Custom Report Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Name & Template */}
        <Card className="shadow-none border-0 p-0">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg">Report Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <div>
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                placeholder="e.g., Weekly Quality Summary"
                value={config.reportName}
                onChange={(e) => setConfig(prev => ({ ...prev, reportName: e.target.value }))}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="report-template">Template</Label>
              <Select 
                value={config.template} 
                onValueChange={(value) => setConfig(prev => ({ ...prev, template: value }))}
              >
                <SelectTrigger id="report-template" className="mt-2">
                  <SelectValue placeholder="Select a report template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Date Range */}
        <Card className="shadow-none border-0 p-0">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg">Date Range</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preset-range">Preset Range</Label>
                <Select 
                  value={config.filters.dateRange} 
                  onValueChange={(value) => {
                    setConfig(prev => ({ 
                      ...prev, 
                      filters: { ...prev.filters, dateRange: value } 
                    }));
                    // Clear custom dates if switching away from custom
                    if (value !== "custom") {
                      setCustomDates({ from: undefined, to: undefined });
                    }
                  }}
                >
                  <SelectTrigger id="preset-range" className="mt-2">
                    <SelectValue placeholder="Select a date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.filters.dateRange === "custom" && (
                <div>
                  <Label>Custom Dates</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full mt-2 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDates.from && customDates.to ? (
                          `${format(customDates.from, 'MMM d')} - ${format(customDates.to, 'MMM d, yyyy')}`
                        ) : (
                          "Pick dates"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="range"
                        selected={customDates}
                        onSelect={setCustomDates}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="shadow-none border-0 p-0">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            {/* Lines */}
            <div>
              <Label>Production Lines</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {lines.length > 0 ? (
                  <>
                    <Badge
                      variant={config.filters.lines.length === 0 ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setConfig(prev => ({ ...prev, filters: { ...prev.filters, lines: [] } }))}
                    >
                      All Lines
                    </Badge>
                    {lines.map(line => (
                      <Badge
                        key={line}
                        variant={config.filters.lines.includes(line) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleFilterSelection('lines', line)}
                      >
                        {line}
                      </Badge>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No lines available</p>
                )}
              </div>
            </div>

            {/* Products */}
            <div>
              <Label>Products</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {products.length > 0 ? (
                  <>
                    <Badge
                      variant={config.filters.products.length === 0 ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setConfig(prev => ({ ...prev, filters: { ...prev.filters, products: [] } }))}
                    >
                      All Products
                    </Badge>
                    {products.map(product => (
                      <Badge
                        key={product}
                        variant={config.filters.products.includes(product) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleFilterSelection('products', product)}
                      >
                        {product}
                      </Badge>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No products available</p>
                )}
              </div>
            </div>

            {/* Defect Types */}
            <div>
              <Label>Defect Types</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge
                  variant={config.filters.defectTypes.length === 0 ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setConfig(prev => ({ ...prev, filters: { ...prev.filters, defectTypes: [] } }))}
                >
                  All Types
                </Badge>
                {defectTypes.map(type => (
                  <Badge
                    key={type}
                    variant={config.filters.defectTypes.includes(type) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleFilterSelection('defectTypes', type)}
                  >
                    {type.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Severities */}
            <div>
              <Label>Severity Levels</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge
                  variant={config.filters.severities.length === 0 ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setConfig(prev => ({ ...prev, filters: { ...prev.filters, severities: [] } }))}
                >
                  All Severities
                </Badge>
                {["critical", "major", "minor"].map(sev => (
                  <Badge
                    key={sev}
                    variant={config.filters.severities.includes(sev) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleFilterSelection('severities', sev)}
                  >
                    {sev}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* SPC Analyses Available for Comparative Study */}
        {spcAnalyses.length > 0 && (
          <Card className="shadow-none border-0 p-0 mt-4">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg">📊 Available SPC Analyses ({spcAnalyses.length})</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Saved SPC analyses available for comparative line-wise, product-wise study
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2 bg-gray-50">
                {spcAnalyses.map((analysis) => (
                  <div key={analysis.id} className="p-2 bg-white rounded border text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{analysis.fileName || `Analysis ${analysis.id.slice(0, 8)}`}</span>
                      <Badge variant="outline">{analysis.parameter}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>Line: {analysis.line || 'N/A'}</span>
                      <span>•</span>
                      <span>Product: {analysis.productCode || 'N/A'}</span>
                      <span>•</span>
                      <span>Cpk: {analysis.capabilityMetrics?.cpk?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <p className="text-gray-500 mt-1">
                      {new Date(analysis.analysisDate).toLocaleDateString()} by {analysis.analyst}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                💡 These analyses are automatically included in comparative reports when filtering by Line/Product
              </p>
            </CardContent>
          </Card>
        )}

        {/* Metrics Selection */}
        <Card className="shadow-none border-0 p-0">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg">Metrics to Include</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-4">
              {["quality", "capa", "rca", "analysis"].map(category => {
                const categoryMetrics = availableMetrics.filter(m => m.category === category);
                if (categoryMetrics.length === 0) return null;
                
                return (
                  <div key={category}>
                    <h4 className="font-medium text-sm text-gray-700 mb-2 capitalize">
                      {category === "rca" ? "RCA" : category === "capa" ? "CAPA" : category} Metrics
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {categoryMetrics.map(metric => (
                        <div key={metric.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={metric.id}
                            checked={config.metrics.includes(metric.id)}
                            onCheckedChange={() => toggleMetric(metric.id)}
                          />
                          <label
                            htmlFor={metric.id}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {metric.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>{config.metrics.length}</strong> metrics selected
              </p>
            </div>
          </CardContent>
        </Card>

        {/* NEW: Automated Action Triggers */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900">Automated Action Triggers</h4>
              <p className="text-xs text-gray-600 mt-1">
                Automatically trigger actions when report identifies risks
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActionTriggers(!showActionTriggers)}
            >
              {showActionTriggers ? 'Hide' : 'Configure'}
            </Button>
          </div>

          {showActionTriggers && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="enable-action-triggers"
                  checked={config.actionTriggers.enabled}
                  onCheckedChange={(checked) => setConfig(prev => ({
                    ...prev,
                    actionTriggers: { ...prev.actionTriggers, enabled: checked }
                  }))}
                />
                <Label htmlFor="enable-action-triggers" className="text-sm">
                  Enable automated actions based on report findings
                </Label>
              </div>

              {config.actionTriggers.enabled && (
                <div className="space-y-3">
                  {config.actionTriggers.conditions.map((trigger, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Trigger {idx + 1}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeActionTrigger(idx)}
                          className="p-0 h-auto"
                        >
                          <XCircle className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">If Metric</Label>
                          <Select
                            value={trigger.metric}
                            onValueChange={(val) => updateActionTrigger(idx, 'metric', val)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Filter available metrics to those selected, or all if none selected initially */}
                              {availableMetrics
                                .filter(m => config.metrics.includes(m.id))
                                .map(m => (
                                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                                ))
                              }
                              {/* Add some common ones if no metrics are selected, or to make it simpler */}
                              {!config.metrics.length && (
                                <>
                                  <SelectItem value="defectRate">Defect Rate</SelectItem>
                                  <SelectItem value="cpk">Cpk</SelectItem>
                                  <SelectItem value="firstPassYield">First Pass Yield</SelectItem>
                                  {/* Example of adding another metric not necessarily tied to report selection */}
                                  <SelectItem value="equipmentHealth">Equipment Health</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Operator</Label>
                          <Select
                            value={trigger.operator}
                            onValueChange={(val) => updateActionTrigger(idx, 'operator', val)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="greater_than">Greater Than</SelectItem>
                              <SelectItem value="less_than">Less Than</SelectItem>
                              <SelectItem value="equals">Equals</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Threshold</Label>
                          <Input
                            type="number"
                            value={trigger.threshold}
                            onChange={(e) => updateActionTrigger(idx, 'threshold', e.target.value)}
                            placeholder="e.g., 5, 1.33, 95"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Then Action</Label>
                        <Select
                          value={trigger.action}
                          onValueChange={(val) => updateActionTrigger(idx, 'action', val)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email_alert">Send Email Alert</SelectItem>
                            <SelectItem value="create_rca">Auto-Create RCA</SelectItem>
                            <SelectItem value="create_work_order">Create Work Order</SelectItem>
                            <SelectItem value="escalate">Escalate to Management</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(trigger.action === 'email_alert' || trigger.action === 'escalate') && (
                        <div>
                          <Label className="text-xs">Recipients (comma-separated emails)</Label>
                          <Input
                            value={trigger.recipients?.join(', ')}
                            onChange={(e) => updateActionTrigger(idx, 'recipients', e.target.value.split(',').map(r => r.trim()))}
                            placeholder="email1@company.com, email2@company.com"
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addActionTrigger}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Action Trigger
                  </Button>

                  <div className="p-3 bg-blue-100 rounded-lg">
                    <p className="text-xs text-blue-900">
                      <strong>Example:</strong> If Cpk &lt; 1.33, auto-create RCA and send email to quality team
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={loading || !config.reportName.trim() || config.metrics.length === 0}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Custom Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
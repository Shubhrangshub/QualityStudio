import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Eye } from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import CorrelationHeatmap from "./CorrelationHeatmap";
import ParameterInsights from "./ParameterInsights";
import AnalysisPDFExporter from "./AnalysisPDFExporter";

export default function FilePreviewModal({ upload, open, onClose }) {
  if (!upload) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = upload.fileUrl;
    link.download = upload.fileName;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {upload.fileName}
            </DialogTitle>
            {upload.keyMetrics?.aiSummary ? (
              <AnalysisPDFExporter
                uploadSummary={upload.keyMetrics.aiSummary}
                analysis={upload.keyMetrics.analysis || {}}
                fileName={upload.fileName}
                uploadedAt={upload.created_date}
              />
            ) : (
              <Button onClick={handleDownload} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <Badge className={
              upload.fileType === 'process_run' ? 'bg-blue-100 text-blue-800' :
              upload.fileType === 'defect' ? 'bg-orange-100 text-orange-800' :
              'bg-purple-100 text-purple-800'
            }>
              {upload.fileType?.replace('_', ' ')}
            </Badge>
            <Badge variant="outline">{upload.recordCount} records</Badge>
            <span className="text-xs text-gray-500">
              {new Date(upload.created_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4">
          {/* AI Summary Sections */}
          {upload.keyMetrics?.aiSummary ? (
            <>
              {/* Data Overview */}
              {upload.keyMetrics.aiSummary.dataOverview && (
                <div className="p-4 bg-white rounded-lg border">
                  <h3 className="font-semibold text-gray-900 mb-3">📊 Data Overview</h3>
                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Records</p>
                      <p className="font-bold text-lg">{upload.keyMetrics.aiSummary.dataOverview.recordCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Quality Score</p>
                      <p className="font-bold text-lg">{upload.keyMetrics.aiSummary.dataOverview.qualityScore}/10</p>
                    </div>
                    {upload.keyMetrics.aiSummary.dataOverview.dateRange && (
                      <div>
                        <p className="text-gray-600">Date Range</p>
                        <p className="font-semibold text-xs">{upload.keyMetrics.aiSummary.dataOverview.dateRange}</p>
                      </div>
                    )}
                  </div>
                  {upload.keyMetrics.aiSummary.dataOverview.columns && (
                    <div className="mt-3">
                      <p className="text-gray-600 text-xs mb-2">Columns ({upload.keyMetrics.aiSummary.dataOverview.columns.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {upload.keyMetrics.aiSummary.dataOverview.columns.map((col, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{col}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Statistical Summary Table - Expandable */}
              {upload.keyMetrics.analysis?.statistics && (
                <ExpandableSection title="📈 Statistical Summary" defaultExpanded={false} className="bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-3 py-2 text-left border font-semibold">Parameter</th>
                          <th className="px-3 py-2 text-right border font-semibold">Count</th>
                          <th className="px-3 py-2 text-right border font-semibold">Mean</th>
                          <th className="px-3 py-2 text-right border font-semibold">Std Dev</th>
                          <th className="px-3 py-2 text-right border font-semibold">Min</th>
                          <th className="px-3 py-2 text-right border font-semibold">Median</th>
                          <th className="px-3 py-2 text-right border font-semibold">Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(upload.keyMetrics.analysis.statistics).map(([param, stats]) => (
                          <tr key={param} className="hover:bg-blue-50">
                            <td className="px-3 py-2 border font-medium">{param}</td>
                            <td className="px-3 py-2 border text-right">{stats.count}</td>
                            <td className="px-3 py-2 border text-right">{stats.mean}</td>
                            <td className="px-3 py-2 border text-right">{stats.stdDev}</td>
                            <td className="px-3 py-2 border text-right">{stats.min}</td>
                            <td className="px-3 py-2 border text-right">{stats.median}</td>
                            <td className="px-3 py-2 border text-right">{stats.max}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ExpandableSection>
              )}

              {/* Correlation Heatmap - Expandable */}
              {upload.keyMetrics.correlationMatrix && upload.keyMetrics.analysis?.numericColumns && (
                <ExpandableSection title="🔥 Correlation Heatmap" defaultExpanded={false} className="bg-white">
                  <CorrelationHeatmap 
                    correlationMatrix={upload.keyMetrics.correlationMatrix}
                    parameters={upload.keyMetrics.analysis.numericColumns}
                  />
                </ExpandableSection>
              )}

              {/* Trends - Expandable */}
              {upload.keyMetrics.aiSummary?.trendsAndPatterns?.length > 0 && (
                <ExpandableSection title="📊 Trends & Patterns" defaultExpanded={false} className="bg-green-50 border-green-200">
                  <ul className="space-y-1">
                    {upload.keyMetrics.aiSummary.trendsAndPatterns.map((trend, idx) => (
                      <li key={idx} className="text-sm text-gray-700">• {trend}</li>
                    ))}
                  </ul>
                </ExpandableSection>
              )}

              {/* Anomalies - Expandable */}
              {upload.keyMetrics.aiSummary?.anomaliesDetected?.length > 0 && (
                <ExpandableSection title="⚠️ Anomalies Detected" defaultExpanded={false} className="bg-orange-50 border-orange-200">
                  <ul className="space-y-1">
                    {upload.keyMetrics.aiSummary.anomaliesDetected.map((anomaly, idx) => (
                      <li key={idx} className="text-sm text-gray-700">• {anomaly}</li>
                    ))}
                  </ul>
                </ExpandableSection>
              )}

              {/* Actionable Insights - Expandable */}
              {upload.keyMetrics.aiSummary?.actionableInsights && (
                <ExpandableSection title="✅ Actionable Insights" defaultExpanded={true} className="bg-blue-50 border-blue-200">
                  {upload.keyMetrics.aiSummary.actionableInsights.immediateActions?.length > 0 && (
                    <div className="mb-3">
                      <p className="font-semibold text-sm text-blue-900 mb-1">1. Immediate Actions:</p>
                      <ul className="space-y-1 ml-4">
                        {upload.keyMetrics.aiSummary.actionableInsights.immediateActions.map((action, idx) => (
                          <li key={idx} className="text-sm text-gray-700">• {action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {upload.keyMetrics.aiSummary.actionableInsights.qualityMonitoring?.length > 0 && (
                    <div className="mb-3">
                      <p className="font-semibold text-sm text-blue-900 mb-1">2. Quality Monitoring (SPC):</p>
                      <ul className="space-y-1 ml-4">
                        {upload.keyMetrics.aiSummary.actionableInsights.qualityMonitoring.map((item, idx) => (
                          <li key={idx} className="text-sm text-gray-700">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {upload.keyMetrics.aiSummary.actionableInsights.processOptimization?.length > 0 && (
                    <div className="mb-3">
                      <p className="font-semibold text-sm text-blue-900 mb-1">3. Process Optimization (DoE):</p>
                      <ul className="space-y-1 ml-4">
                        {upload.keyMetrics.aiSummary.actionableInsights.processOptimization.map((item, idx) => (
                          <li key={idx} className="text-sm text-gray-700">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {upload.keyMetrics.aiSummary.actionableInsights.dataRecommendations?.length > 0 && (
                    <div>
                      <p className="font-semibold text-sm text-blue-900 mb-1">4. Data Quality:</p>
                      <ul className="space-y-1 ml-4">
                        {upload.keyMetrics.aiSummary.actionableInsights.dataRecommendations.map((item, idx) => (
                          <li key={idx} className="text-sm text-gray-700">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </ExpandableSection>
              )}

              {/* Parameter-Specific Insights */}
              {upload.keyMetrics.analysis && upload.keyMetrics.aiSummary && (
                <ParameterInsights 
                  uploadSummary={upload.keyMetrics.aiSummary}
                  analysis={upload.keyMetrics.analysis}
                />
              )}
            </>
          ) : (
            <>
              {/* Legacy format - Simple summary */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
                <p className="text-sm text-blue-800">{upload.summary}</p>
              </div>

              {/* Key Metrics */}
              {upload.keyMetrics && (
                <div className="grid md:grid-cols-3 gap-3">
                  {upload.keyMetrics.totalRecords && (
                    <div className="p-3 bg-white rounded-lg border">
                      <p className="text-xs text-gray-600">Total Records</p>
                      <p className="text-xl font-bold">{upload.keyMetrics.totalRecords}</p>
                    </div>
                  )}
                  {upload.keyMetrics.dateRange && (
                    <div className="p-3 bg-white rounded-lg border md:col-span-2">
                      <p className="text-xs text-gray-600">Date Range</p>
                      <p className="text-sm font-semibold">{upload.keyMetrics.dateRange}</p>
                    </div>
                  )}
                  {upload.keyMetrics.keyColumns && (
                    <div className="p-3 bg-white rounded-lg border md:col-span-3">
                      <p className="text-xs text-gray-600 mb-2">Key Columns ({upload.keyMetrics.keyColumns.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {upload.keyMetrics.keyColumns.map((col, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{col}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {upload.keyMetrics.notableFindings && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 md:col-span-3">
                      <p className="text-xs text-gray-600 mb-1">Notable Findings</p>
                      <p className="text-sm text-gray-800">{upload.keyMetrics.notableFindings}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Uploader Info */}
          <div className="text-xs text-gray-500 text-center pt-4 border-t">
            Uploaded by {upload.uploadedBy} on {new Date(upload.created_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
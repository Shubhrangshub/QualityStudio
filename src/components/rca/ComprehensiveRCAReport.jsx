import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, FileText } from "lucide-react";
import { format } from 'date-fns';

export default function ComprehensiveRCAReport({ rca, defect, onExport }) {
  const handleExport = () => {
    let content = `ROOT CAUSE ANALYSIS REPORT\n`;
    content += `${'='.repeat(60)}\n\n`;
    
    // Header
    content += `RCA ID: ${rca.id.slice(0, 8)}\n`;
    content += `Analyst: ${rca.analyst}\n`;
    content += `Status: ${rca.status}\n`;
    content += `Date: ${format(new Date(rca.created_date), 'MMMM d, yyyy')}\n`;
    if (rca.completedDate) {
      content += `Completed: ${format(new Date(rca.completedDate), 'MMMM d, yyyy')}\n`;
    }
    content += `\n${'-'.repeat(60)}\n\n`;
    
    // Defect Information
    if (defect) {
      content += `DEFECT INFORMATION\n`;
      content += `${'='.repeat(60)}\n`;
      content += `Type: ${defect.defectType?.replace(/_/g, ' ')}\n`;
      content += `Severity: ${defect.severity}\n`;
      content += `Line: ${defect.line}\n`;
      content += `Product: ${defect.productCode}\n`;
      content += `Date/Time: ${format(new Date(defect.dateTime || defect.created_date), 'MMM d, yyyy HH:mm')}\n`;
      if (defect.operator) content += `Operator: ${defect.operator}\n`;
      if (defect.filmStack) content += `Film Stack: ${defect.filmStack}\n`;
      if (defect.adhesiveType) content += `Adhesive: ${defect.adhesiveType}\n`;
      if (defect.immediateAction) content += `Immediate Action: ${defect.immediateAction}\n`;
      content += `\n`;
    }
    
    // AI Recommendations
    if (rca.aiRecommendations && rca.aiRecommendations.length > 0) {
      content += `AI-GENERATED ROOT CAUSE SUGGESTIONS\n`;
      content += `${'='.repeat(60)}\n`;
      rca.aiRecommendations.forEach((rec, idx) => {
        content += `\n${idx + 1}. ${rec.cause}\n`;
        content += `   Likelihood: ${(rec.likelihood * 100).toFixed(0)}%\n`;
        if (rec.category) content += `   Category: ${rec.category}\n`;
        if (rec.historicalEvidence) content += `   Evidence: ${rec.historicalEvidence}\n`;
        if (rec.suggestedTests && rec.suggestedTests.length > 0) {
          content += `   Suggested Tests:\n`;
          rec.suggestedTests.forEach(test => {
            content += `     • ${test}\n`;
          });
        }
      });
      content += `\n`;
    }
    
    // 5-Why Analysis
    if (rca.fiveWhyTree && rca.fiveWhyTree.length > 0) {
      content += `5-WHY ANALYSIS\n`;
      content += `${'='.repeat(60)}\n`;
      rca.fiveWhyTree.forEach((why, idx) => {
        content += `\nLevel ${why.level}: ${why.question}\n`;
        content += `Answer: ${why.answer || 'Not answered'}\n`;
        if (why.evidence) content += `Evidence: ${why.evidence}\n`;
      });
      content += `\n`;
    }
    
    // Ishikawa Diagram
    if (rca.ishikawa) {
      const categories = ['man', 'machine', 'material', 'method', 'environment', 'measurement'];
      const hasData = categories.some(cat => rca.ishikawa[cat]?.length > 0);
      
      if (hasData) {
        content += `ISHIKAWA (FISHBONE) DIAGRAM ANALYSIS\n`;
        content += `${'='.repeat(60)}\n`;
        categories.forEach(category => {
          const causes = rca.ishikawa[category];
          if (causes && causes.length > 0) {
            content += `\n${category.toUpperCase()}:\n`;
            causes.forEach(cause => {
              content += `  • ${cause}\n`;
            });
          }
        });
        content += `\n`;
      }
    }
    
    // Hypothesis Testing
    if (rca.hypothesisList && rca.hypothesisList.length > 0) {
      content += `HYPOTHESIS TESTING\n`;
      content += `${'='.repeat(60)}\n`;
      rca.hypothesisList.forEach((hyp, idx) => {
        content += `\n${idx + 1}. Hypothesis: ${hyp.hypothesis}\n`;
        if (hyp.testMethod) content += `   Test Method: ${hyp.testMethod}\n`;
        if (hyp.result) content += `   Result: ${hyp.result}\n`;
        content += `   Status: ${hyp.validated ? '✓ VALIDATED' : '○ Pending'}\n`;
      });
      content += `\n`;
    }
    
    // Identified Root Causes
    if (rca.rootCauses && rca.rootCauses.length > 0) {
      content += `IDENTIFIED ROOT CAUSES\n`;
      content += `${'='.repeat(60)}\n`;
      rca.rootCauses.forEach((cause, idx) => {
        const causeText = typeof cause === 'object' ? cause.cause : cause;
        content += `\n${idx + 1}. ${causeText}\n`;
        if (typeof cause === 'object') {
          if (cause.causalScore) content += `   Causal Score: ${cause.causalScore}/10\n`;
          if (cause.confidence) content += `   Confidence: ${(cause.confidence * 100).toFixed(0)}%\n`;
          if (cause.category) content += `   Category: ${cause.category}\n`;
        }
      });
      content += `\n`;
    }
    
    // Evidence Links
    if (rca.evidenceLinks && rca.evidenceLinks.length > 0) {
      content += `SUPPORTING EVIDENCE\n`;
      content += `${'='.repeat(60)}\n`;
      rca.evidenceLinks.forEach((link, idx) => {
        content += `${idx + 1}. ${link}\n`;
      });
      content += `\n`;
    }
    
    // Attachments
    if (rca.attachments && rca.attachments.length > 0) {
      content += `ATTACHMENTS\n`;
      content += `${'='.repeat(60)}\n`;
      rca.attachments.forEach((attachment, idx) => {
        content += `${idx + 1}. ${attachment}\n`;
      });
      content += `\n`;
    }
    
    content += `\n${'-'.repeat(60)}\n`;
    content += `End of Root Cause Analysis Report\n`;
    content += `Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}\n`;
    
    // Download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RCA-Report-${rca.id.slice(0, 8)}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    if (onExport) onExport();
  };

  const categories = ['man', 'machine', 'material', 'method', 'environment', 'measurement'];
  const categoryLabels = {
    man: 'Man (People)',
    machine: 'Machine (Equipment)',
    material: 'Material',
    method: 'Method (Process)',
    environment: 'Environment',
    measurement: 'Measurement'
  };

  return (
    <Card className="border-2 border-blue-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Comprehensive RCA Report
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Complete analysis document with all findings and evidence
            </p>
          </div>
          <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Header Info */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-blue-700 font-medium">RCA ID</p>
              <p className="text-sm font-mono text-blue-900">{rca.id.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-xs text-blue-700 font-medium">Analyst</p>
              <p className="text-sm text-blue-900">{rca.analyst}</p>
            </div>
            <div>
              <p className="text-xs text-blue-700 font-medium">Status</p>
              <Badge className={
                rca.status === 'completed' ? 'bg-green-100 text-green-800' :
                rca.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }>
                {rca.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Defect Information */}
        {defect && (
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-3">Defect Information</h3>
            <div className="p-4 border rounded-lg bg-gray-50 space-y-2">
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 font-medium">{defect.defectType?.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-600">Severity:</span>
                  <Badge className="ml-2">{defect.severity}</Badge>
                </div>
                <div>
                  <span className="text-gray-600">Line:</span>
                  <span className="ml-2 font-medium">{defect.line}</span>
                </div>
                <div>
                  <span className="text-gray-600">Product:</span>
                  <span className="ml-2 font-medium">{defect.productCode}</span>
                </div>
                {defect.filmStack && (
                  <div className="md:col-span-2">
                    <span className="text-gray-600">Film Stack:</span>
                    <span className="ml-2 font-medium">{defect.filmStack}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Recommendations */}
        {rca.aiRecommendations && rca.aiRecommendations.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-3">AI-Generated Root Cause Suggestions</h3>
            <div className="space-y-3">
              {rca.aiRecommendations.map((rec, idx) => (
                <div key={idx} className="p-4 border-l-4 border-purple-500 bg-purple-50 rounded-r-lg">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-gray-900">{rec.cause}</p>
                    <Badge className="bg-purple-100 text-purple-800">
                      {(rec.likelihood * 100).toFixed(0)}% likely
                    </Badge>
                  </div>
                  {rec.category && (
                    <p className="text-xs text-gray-600 mb-2">Category: {rec.category}</p>
                  )}
                  {rec.historicalEvidence && (
                    <p className="text-sm text-gray-700 italic">{rec.historicalEvidence}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5-Why Analysis */}
        {rca.fiveWhyTree && rca.fiveWhyTree.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-3">5-Why Analysis</h3>
            <div className="space-y-3">
              {rca.fiveWhyTree.map((why, idx) => (
                <div key={idx} className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    Level {why.level}: {why.question}
                  </p>
                  <p className="text-sm text-gray-800">
                    <strong>Answer:</strong> {why.answer || 'Not answered'}
                  </p>
                  {why.evidence && (
                    <p className="text-xs text-gray-600 mt-2">
                      <strong>Evidence:</strong> {why.evidence}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ishikawa Diagram */}
        {rca.ishikawa && categories.some(cat => rca.ishikawa[cat]?.length > 0) && (
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-3">Ishikawa (Fishbone) Analysis</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {categories.map(category => {
                const causes = rca.ishikawa[category];
                if (!causes || causes.length === 0) return null;
                
                return (
                  <div key={category} className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold text-sm text-gray-900 mb-2">
                      {categoryLabels[category]}
                    </h4>
                    <ul className="space-y-1">
                      {causes.map((cause, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          <span>{cause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hypothesis Testing */}
        {rca.hypothesisList && rca.hypothesisList.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-3">Hypothesis Testing</h3>
            <div className="space-y-3">
              {rca.hypothesisList.map((hyp, idx) => (
                <div key={idx} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-gray-900">{hyp.hypothesis}</p>
                    {hyp.validated ? (
                      <Badge className="bg-green-100 text-green-800">✓ Validated</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
                    )}
                  </div>
                  {hyp.testMethod && (
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Test Method:</strong> {hyp.testMethod}
                    </p>
                  )}
                  {hyp.result && (
                    <p className="text-sm text-gray-700">
                      <strong>Result:</strong> {hyp.result}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Identified Root Causes */}
        {rca.rootCauses && rca.rootCauses.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-3">Identified Root Causes</h3>
            <div className="space-y-3">
              {rca.rootCauses.map((cause, idx) => {
                const causeText = typeof cause === 'object' ? cause.cause : cause;
                const causeData = typeof cause === 'object' ? cause : {};
                
                return (
                  <div key={idx} className="p-4 border-l-4 border-red-500 bg-red-50 rounded-r-lg">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-gray-900 flex-1">{causeText}</p>
                      <div className="flex gap-2">
                        {causeData.causalScore && (
                          <Badge className="bg-orange-100 text-orange-800">
                            Score: {causeData.causalScore}/10
                          </Badge>
                        )}
                        {causeData.confidence && (
                          <Badge className="bg-blue-100 text-blue-800">
                            {(causeData.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                        )}
                      </div>
                    </div>
                    {causeData.category && (
                      <p className="text-xs text-gray-600 mt-2">Category: {causeData.category}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Evidence & Attachments */}
        {((rca.evidenceLinks && rca.evidenceLinks.length > 0) || 
          (rca.attachments && rca.attachments.length > 0)) && (
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-3">Supporting Evidence</h3>
            <div className="p-4 border rounded-lg bg-gray-50">
              {rca.evidenceLinks && rca.evidenceLinks.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Evidence Links:</p>
                  <ul className="space-y-1">
                    {rca.evidenceLinks.map((link, idx) => (
                      <li key={idx} className="text-sm text-blue-600 hover:underline">
                        <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {rca.attachments && rca.attachments.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                  <ul className="space-y-1">
                    {rca.attachments.map((attachment, idx) => (
                      <li key={idx} className="text-sm text-blue-600 hover:underline">
                        <a href={attachment} target="_blank" rel="noopener noreferrer">
                          Attachment {idx + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t">
          <p className="text-xs text-gray-500 text-center">
            Report generated on {format(new Date(), 'MMMM d, yyyy')} at {format(new Date(), 'HH:mm')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
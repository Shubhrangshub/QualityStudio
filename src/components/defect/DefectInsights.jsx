import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Sparkles, TrendingUp, AlertTriangle, FileText, 
  GitBranch, ClipboardList, FlaskConical, Lightbulb,
  ExternalLink, ChevronRight, Loader2, Rocket
} from "lucide-react";
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DefectInsights({ insights, defect, historicalData }) {
  const [creatingRCA, setCreatingRCA] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!insights) return null;

  const { similarDefects = [], relatedRCAs = [], relatedCAPAs = [], relatedDoEs = [] } = historicalData || {};

  // NEW: Create pre-populated RCA from AI insights
  const handleCreatePrefilledRCA = async () => {
    setCreatingRCA(true);
    
    try {
      const user = await base44.auth.me();
      
      // Pre-populate Ishikawa diagram from AI suggestions
      const ishikawaDiagram = {
        man: [],
        machine: [],
        material: [],
        method: [],
        environment: [],
        measurement: []
      };

      insights.suggestedRootCauses?.forEach(cause => {
        const category = cause.category?.toLowerCase() || 'machine';
        if (ishikawaDiagram[category]) {
          ishikawaDiagram[category].push(cause.cause);
        }
      });

      // Create hypotheses from suggested investigations
      const hypothesisList = insights.suggestedInvestigations?.slice(0, 5).map(inv => ({
        hypothesis: inv,
        testMethod: "To be determined",
        result: "",
        validated: false
      })) || [];

      // Create AI recommendations array
      const aiRecommendations = insights.suggestedRootCauses?.map(cause => ({
        cause: cause.cause,
        likelihood: cause.likelihood,
        suggestedTests: [cause.historicalEvidence || "Verify through inspection"],
        historicalEvidence: cause.historicalEvidence
      })) || [];

      // Create the RCA record
      const newRCA = await base44.entities.RCARecord.create({
        defectTicketId: defect.id,
        analyst: user.email,
        status: "in_progress",
        fiveWhyTree: [],
        ishikawa: ishikawaDiagram,
        hypothesisList: hypothesisList,
        rootCauses: [],
        aiRecommendations: aiRecommendations,
        linkedDocumentIds: []
      });

      // Update defect status
      await base44.entities.DefectTicket.update(defect.id, {
        status: "rca_in_progress",
        linkedRCAId: newRCA.id
      });

      queryClient.invalidateQueries({ queryKey: ['rcas'] });
      queryClient.invalidateQueries({ queryKey: ['defects'] });

      // Navigate to RCA Studio with the new RCA
      navigate(createPageUrl("RCAStudio"));
      
    } catch (error) {
      console.error("Error creating RCA:", error);
    }
    
    setCreatingRCA(false);
  };

  return (
    <div className="space-y-6">
      {/* AI Root Cause Suggestions */}
      <Card className="border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI-Suggested Root Causes
            <Badge className="ml-2 bg-purple-100 text-purple-800">
              Auto-Generated
            </Badge>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Based on defect type, severity, and historical patterns
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.suggestedRootCauses?.map((cause, idx) => (
            <div key={idx} className="p-4 bg-white rounded-lg border border-purple-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{cause.cause}</h4>
                  <Badge variant="outline" className="text-xs">
                    {cause.category}
                  </Badge>
                </div>
                <Badge className={
                  cause.likelihood > 0.7 ? 'bg-red-100 text-red-800' :
                  cause.likelihood > 0.4 ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }>
                  {(cause.likelihood * 100).toFixed(0)}% likely
                </Badge>
              </div>
              {cause.historicalEvidence && (
                <p className="text-sm text-gray-600 mt-2 p-2 bg-blue-50 rounded">
                  📊 {cause.historicalEvidence}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Suggested Investigations */}
      {insights.suggestedInvestigations && insights.suggestedInvestigations.length > 0 && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              Suggested Investigation Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.suggestedInvestigations.map((step, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-blue-200 flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-gray-700 flex-1">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parameter Anomalies */}
      {insights.parameterAnomalies && insights.parameterAnomalies.length > 0 && (
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Suspected Parameter Anomalies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.parameterAnomalies.map((anomaly, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{anomaly.parameter}</span>
                    <Badge variant="outline" className="text-xs">
                      Expected: {anomaly.expectedRange}
                    </Badge>
                  </div>
                  <p className="text-sm text-orange-700 bg-orange-50 p-2 rounded">
                    ⚠️ {anomaly.suspectedIssue}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Data Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Similar Defects */}
        {similarDefects.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Similar Defects ({similarDefects.length})
              </CardTitle>
              <p className="text-xs text-gray-600 mt-1">
                Historical defects with matching characteristics
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {similarDefects.slice(0, 5).map((def) => (
                  <div key={def.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm font-medium">{def.defectType?.replace(/_/g, ' ')}</span>
                      <Badge className="bg-orange-100 text-orange-800">
                        {def.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      Line {def.line} • {def.productCode}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(def.dateTime || def.created_date).toLocaleDateString()}
                    </p>
                    {def.status === 'closed' && (
                      <Badge className="mt-2 bg-green-100 text-green-800 text-xs">
                        Resolved
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <Link to={createPageUrl("DefectIntake") + "#list"}>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View All Similar Defects
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Related RCAs */}
        {relatedRCAs.length > 0 && (
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitBranch className="w-5 h-5 text-blue-600" />
                Related RCAs ({relatedRCAs.length})
              </CardTitle>
              <p className="text-xs text-gray-600 mt-1">
                Past investigations of similar issues
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {relatedRCAs.slice(0, 5).map((rca) => (
                  <div key={rca.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="font-mono text-xs text-gray-600 mb-1">
                      RCA #{rca.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-700">
                      Analyst: {rca.analyst}
                    </p>
                    {rca.rootCauses && rca.rootCauses.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-blue-900 mb-1">
                          Root Causes Found:
                        </p>
                        <ul className="space-y-1">
                          {rca.rootCauses.slice(0, 2).map((rc, idx) => (
                            <li key={idx} className="text-xs text-gray-600 pl-3">
                              • {rc.cause || rc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Link to={createPageUrl("RCAStudio")}>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  <GitBranch className="w-4 h-4 mr-1" />
                  View in RCA Studio
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Related CAPAs */}
        {relatedCAPAs.length > 0 && (
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="w-5 h-5 text-purple-600" />
                Related CAPAs ({relatedCAPAs.length})
              </CardTitle>
              <p className="text-xs text-gray-600 mt-1">
                Previous corrective actions for similar defects
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {relatedCAPAs.slice(0, 5).map((capa) => (
                  <div key={capa.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-mono text-xs text-gray-600">
                        CAPA #{capa.id.slice(0, 8)}
                      </p>
                      <Badge className={
                        capa.approvalState === 'closed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {capa.approvalState?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        {capa.correctiveActions?.length || 0} CAs • {capa.preventiveActions?.length || 0} PAs
                      </p>
                      {capa.effectivenessCheck?.effective && (
                        <Badge className="bg-green-100 text-green-800 text-xs mt-1">
                          Proven Effective
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Link to={createPageUrl("CAPAWorkspace")}>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  <ClipboardList className="w-4 h-4 mr-1" />
                  View in CAPA Workspace
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Related DoEs */}
        {relatedDoEs.length > 0 && (
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FlaskConical className="w-5 h-5 text-green-600" />
                Related DoE Studies ({relatedDoEs.length})
              </CardTitle>
              <p className="text-xs text-gray-600 mt-1">
                Experiments that studied relevant parameters
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {relatedDoEs.slice(0, 5).map((doe) => (
                  <div key={doe.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-medium text-sm text-gray-900 mb-1">
                      {doe.objective}
                    </p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>Status: {doe.executionStatus?.replace(/_/g, ' ')}</p>
                      {doe.factors && doe.factors.length > 0 && (
                        <p>Factors studied: {doe.factors.map(f => f.name).join(', ')}</p>
                      )}
                      {doe.recommendedSetpoints && (
                        <Badge className="bg-green-100 text-green-800 text-xs mt-1">
                          Has Recommended Settings
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Link to={createPageUrl("DoEDesigner")}>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  <FlaskConical className="w-4 h-4 mr-1" />
                  View DoE Studies
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* NEW: Quick Action Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Create Pre-filled RCA */}
        <Card className="border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-blue-900 mb-2">
                  Create Pre-filled RCA
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  Start RCA investigation with all AI insights automatically populated
                </p>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>✓ {insights.suggestedRootCauses?.length || 0} root causes pre-loaded</p>
                  <p>✓ Ishikawa diagram categorized</p>
                  <p>✓ {insights.suggestedInvestigations?.length || 0} investigation steps ready</p>
                  <p>✓ {relatedRCAs.length + relatedCAPAs.length} historical references linked</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleCreatePrefilledRCA}
              disabled={creatingRCA}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {creatingRCA ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating RCA...
                </>
              ) : (
                <>
                  <GitBranch className="w-4 h-4 mr-2" />
                  Create AI-Powered RCA
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Manual RCA Start */}
        <Card className="border-2 border-gray-300 bg-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <GitBranch className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  Or Start Manual RCA
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Start from scratch if you prefer your own investigation approach
                </p>
                <div className="space-y-1 text-xs text-gray-500">
                  <p>• Empty RCA template</p>
                  <p>• AI suggestions available as reference</p>
                  <p>• Full control over analysis</p>
                </div>
              </div>
            </div>
            <Link to={createPageUrl("RCAStudio")}>
              <Button variant="outline" className="w-full">
                <GitBranch className="w-4 h-4 mr-2" />
                Start Manual RCA
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-900 mb-1">
                📊 AI Analysis Summary
              </p>
              <div className="flex gap-3 text-xs text-gray-700">
                <span>✓ {insights.suggestedRootCauses?.length || 0} root causes</span>
                <span>✓ {similarDefects.length} similar cases</span>
                <span>✓ {relatedRCAs.length} related RCAs</span>
                <span>✓ {relatedCAPAs.length} proven solutions</span>
              </div>
            </div>
            <Badge className="bg-green-600 text-white">
              Ready for Investigation
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
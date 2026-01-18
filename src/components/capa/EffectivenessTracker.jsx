import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, XCircle, TrendingUp, Loader2, AlertTriangle,
  Clock, BarChart3, Target
} from "lucide-react";

export default function EffectivenessTracker({ capa, onUpdate }) {
  const [effectiveness, setEffectiveness] = useState(capa.effectivenessCheck || {
    checkDate: '',
    windowDays: 30,
    metricsBefore: {
      defectRate: '',
      fpy: '',
      customerComplaints: ''
    },
    metricsAfter: {
      defectRate: '',
      fpy: '',
      customerComplaints: ''
    },
    effective: null,
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (capa.effectivenessCheck) {
      setEffectiveness(capa.effectivenessCheck);
    }
  }, [capa.id, capa.effectivenessCheck, capa.approvalState]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Also push to history
      const historyEntry = {
        ...effectiveness,
        recordedAt: new Date().toISOString()
      };
      const currentHistory = capa.effectivenessHistory || [];
      
      await onUpdate({ 
        effectivenessCheck: effectiveness,
        effectivenessHistory: [...currentHistory, historyEntry]
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
    }
    setSaving(false);
  };

  const markEffective = async (isEffective) => {
    if (!hasMetricsData()) return;
    const updatedEffectiveness = {
      ...effectiveness,
      effective: isEffective,
      checkDate: effectiveness.checkDate || new Date().toISOString().split('T')[0],
      verifiedAt: new Date().toISOString()
    };
    setEffectiveness(updatedEffectiveness);
    
    // Auto-save when marking effectiveness
    setSaving(true);
    try {
      // Also push to history
      const historyEntry = {
        ...updatedEffectiveness,
        recordedAt: new Date().toISOString()
      };
      const currentHistory = capa.effectivenessHistory || [];

      await onUpdate({ 
        effectivenessCheck: updatedEffectiveness, 
        effectivenessHistory: [...currentHistory, historyEntry]
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
    }
    setSaving(false);
  };

  const updateMetric = (period, field, value) => {
    setEffectiveness({
      ...effectiveness,
      [period]: {
        ...effectiveness[period],
        [field]: value
      }
    });
  };

  // Determine if CAPA is ready for effectiveness check
  // Use prop directly, not local state
  const capaStatus = capa.approvalState || 'draft';
  const allActionsCompleted = () => {
    const allCA = capa.correctiveActions || [];
    const allPA = capa.preventiveActions || [];
    const allActions = [...allCA, ...allPA];
    if (allActions.length === 0) return false;
    return allActions.every(a => a.status === 'verified' || a.status === 'completed');
  };
  
  const getActionsCompletedCount = () => {
    const allCA = capa.correctiveActions || [];
    const allPA = capa.preventiveActions || [];
    const allActions = [...allCA, ...allPA];
    const verified = allActions.filter(a => a.status === 'verified' || a.status === 'completed').length;
    return { verified, total: allActions.length };
  };

  const canDoEffectivenessCheck = capaStatus === 'approved' && allActionsCompleted();
  const isReadyToClose = effectiveness.effective === true && capaStatus === 'approved';

  // Validation: Require at least one metric pair to be filled
  const hasMetricsData = () => {
    const mB = effectiveness.metricsBefore || {};
    const mA = effectiveness.metricsAfter || {};
    
    const isValid = (val) => val !== '' && val !== null && val !== undefined;
    
    // Check if any metric pair has both Before and After values
    const hasDefectRate = isValid(mB.defectRate) && isValid(mA.defectRate);
    const hasFPY = isValid(mB.fpy) && isValid(mA.fpy);
    const hasComplaints = isValid(mB.customerComplaints) && isValid(mA.customerComplaints);
    
    return hasDefectRate || hasFPY || hasComplaints;
  };

  const getStatusMessage = () => {
    if (capaStatus === 'draft') {
      return {
        type: 'warning',
        icon: Clock,
        title: 'CAPA in Draft',
        message: 'Submit CAPA for review and get it approved before checking effectiveness.'
      };
    }
    if (capaStatus === 'pending_review') {
      return {
        type: 'info',
        icon: Clock,
        title: 'Pending Approval',
        message: 'CAPA is awaiting approval. Effectiveness check available after approval.'
      };
    }
    if (capaStatus === 'approved' && !allActionsCompleted()) {
      const { verified, total } = getActionsCompletedCount();
      return {
        type: 'warning',
        icon: AlertTriangle,
        title: 'Actions Incomplete',
        message: `All actions must be completed or verified. ${verified}/${total} actions ready.`
      };
    }
    if (capaStatus === 'closed') {
      return {
        type: 'success',
        icon: CheckCircle2,
        title: 'CAPA Closed',
        message: 'This CAPA has been verified effective and closed.'
      };
    }
    return null;
  };

  const statusMessage = getStatusMessage();

  return (
    <Card className="border-green-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Effectiveness Check
          </CardTitle>
          <Badge className={
            capaStatus === 'closed' ? 'bg-green-100 text-green-800' :
            capaStatus === 'approved' ? 'bg-blue-100 text-blue-800' :
            capaStatus === 'pending_review' ? 'bg-orange-100 text-orange-800' :
            'bg-gray-100 text-gray-800'
          }>
            CAPA: {capaStatus.replace(/_/g, ' ')}
          </Badge>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Verify CAPA effectiveness after all actions are implemented
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {saveSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Effectiveness check saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Status Message */}
        {statusMessage && capaStatus !== 'approved' && (
          <Alert className={
            statusMessage.type === 'success' ? 'bg-green-50 border-green-200' :
            statusMessage.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
            'bg-blue-50 border-blue-200'
          }>
            <statusMessage.icon className={`h-4 w-4 ${
              statusMessage.type === 'success' ? 'text-green-600' :
              statusMessage.type === 'warning' ? 'text-yellow-600' :
              'text-blue-600'
            }`} />
            <AlertDescription>
              <strong>{statusMessage.title}:</strong> {statusMessage.message}
            </AlertDescription>
          </Alert>
        )}

        {statusMessage && capaStatus === 'approved' && !allActionsCompleted() && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <strong>{statusMessage.title}:</strong> {statusMessage.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Completion Summary */}
        {capaStatus === 'approved' && (
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Action Completion Status
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Corrective Actions</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(capa.correctiveActions || []).map((a, idx) => (
                    <Badge key={idx} className={
                      a.status === 'verified' ? 'bg-purple-100 text-purple-800' :
                      a.status === 'completed' ? 'bg-green-100 text-green-800' :
                      a.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      CA{idx + 1}: {a.status?.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                  {(capa.correctiveActions || []).length === 0 && (
                    <span className="text-sm text-gray-500">No actions</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Preventive Actions</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(capa.preventiveActions || []).map((a, idx) => (
                    <Badge key={idx} className={
                      a.status === 'verified' ? 'bg-purple-100 text-purple-800' :
                      a.status === 'completed' ? 'bg-green-100 text-green-800' :
                      a.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      PA{idx + 1}: {a.status?.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                  {(capa.preventiveActions || []).length === 0 && (
                    <span className="text-sm text-gray-500">No actions</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Effectiveness Check Form - Only show when ready */}
        {(canDoEffectivenessCheck || capaStatus === 'closed') && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Check Date</Label>
                <Input
                  type="date"
                  value={effectiveness.checkDate}
                  onChange={(e) => setEffectiveness({ ...effectiveness, checkDate: e.target.value })}
                  className="mt-1"
                  disabled={capaStatus === 'closed'}
                />
              </div>
              <div>
                <Label>Evaluation Window (days)</Label>
                <Input
                  type="number"
                  value={effectiveness.windowDays}
                  onChange={(e) => setEffectiveness({ ...effectiveness, windowDays: parseInt(e.target.value) || 30 })}
                  className="mt-1"
                  disabled={capaStatus === 'closed'}
                />
              </div>
            </div>

            {/* Metrics Comparison */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Metrics Comparison
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-lg border">
                  <p className="font-medium text-gray-900 mb-2">Before CAPA</p>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Defect Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={effectiveness.metricsBefore?.defectRate || ''}
                        onChange={(e) => updateMetric('metricsBefore', 'defectRate', e.target.value)}
                        placeholder="e.g., 2.5"
                        disabled={capaStatus === 'closed'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">First Pass Yield (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={effectiveness.metricsBefore?.fpy || ''}
                        onChange={(e) => updateMetric('metricsBefore', 'fpy', e.target.value)}
                        placeholder="e.g., 95.5"
                        disabled={capaStatus === 'closed'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Customer Complaints</Label>
                      <Input
                        type="number"
                        value={effectiveness.metricsBefore?.customerComplaints || ''}
                        onChange={(e) => updateMetric('metricsBefore', 'customerComplaints', e.target.value)}
                        placeholder="e.g., 3"
                        disabled={capaStatus === 'closed'}
                      />
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-green-200">
                  <p className="font-medium text-green-900 mb-2">After CAPA</p>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Defect Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={effectiveness.metricsAfter?.defectRate || ''}
                        onChange={(e) => updateMetric('metricsAfter', 'defectRate', e.target.value)}
                        placeholder="e.g., 0.8"
                        disabled={capaStatus === 'closed'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">First Pass Yield (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={effectiveness.metricsAfter?.fpy || ''}
                        onChange={(e) => updateMetric('metricsAfter', 'fpy', e.target.value)}
                        placeholder="e.g., 98.2"
                        disabled={capaStatus === 'closed'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Customer Complaints</Label>
                      <Input
                        type="number"
                        value={effectiveness.metricsAfter?.customerComplaints || ''}
                        onChange={(e) => updateMetric('metricsAfter', 'customerComplaints', e.target.value)}
                        placeholder="e.g., 0"
                        disabled={capaStatus === 'closed'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Evaluation Notes</Label>
              <Textarea
                value={effectiveness.notes}
                onChange={(e) => setEffectiveness({ ...effectiveness, notes: e.target.value })}
                placeholder="Document KPI improvements, defect reductions, process stability observations..."
                rows={4}
                className="mt-1"
                disabled={capaStatus === 'closed'}
              />
            </div>

            {/* Effectiveness Decision Buttons */}
            {capaStatus !== 'closed' && (
              <div className="space-y-2">
                {!hasMetricsData() && (
                  <Alert className="bg-orange-50 border-orange-200 py-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 text-xs">
                      Please enter at least one "Before" and "After" metric comparison to verify effectiveness.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => markEffective(true)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={saving || !hasMetricsData()}
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Mark as Effective
                  </Button>
                  <Button
                    onClick={() => markEffective(false)}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                    disabled={saving || !hasMetricsData()}
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Not Effective
                  </Button>
                </div>
              </div>
            )}

            {/* Effectiveness Result */}
            {effectiveness.effective !== null && effectiveness.effective !== undefined && hasMetricsData() && (
              <div className={`p-4 rounded-lg border-2 ${
                effectiveness.effective 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {effectiveness.effective ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-semibold ${
                      effectiveness.effective ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {effectiveness.effective ? 'Status Recorded: Verified Effective' : 'Status Recorded: Not Effective'}
                    </span>
                  </div>
                  {effectiveness.verifiedAt && (
                    <Badge variant="outline" className="bg-white text-xs">
                      Last Updated: {new Date(effectiveness.verifiedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                    </Badge>
                  )}
                </div>
                <p className={`text-sm ${
                  effectiveness.effective ? 'text-green-700' : 'text-red-700'
                }`}>
                  {effectiveness.effective 
                    ? '✓ The system has recorded this CAPA as effective. You can now proceed to close the CAPA.'
                    : '⚠ The system has recorded this CAPA as NOT effective. Please review actions and effectiveness criteria.'}
                </p>
                {effectiveness.effective && capaStatus === 'approved' && (
                  <div className="mt-3 p-2 bg-green-100 rounded border border-green-300">
                    <p className="text-sm font-medium text-green-900">
                      Ready to close! Scroll up to "Actions Plan" → "Change CAPA Status" → Click "Close CAPA"
                    </p>
                  </div>
                )}
              </div>
            )}

            {capaStatus !== 'closed' && (
              <Button 
                onClick={handleSave} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={saving || !hasMetricsData()}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Effectiveness Check
                  </>
                )}
              </Button>
            )}
          </>
        )}

        {/* Show message when not ready for effectiveness check */}
        {!canDoEffectivenessCheck && capaStatus !== 'closed' && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Effectiveness Check Not Available Yet</p>
            <p className="text-sm text-gray-500 mt-1">
              {capaStatus === 'draft' && "Submit CAPA for review first"}
              {capaStatus === 'pending_review' && "Wait for CAPA approval"}
              {capaStatus === 'approved' && !allActionsCompleted() && "Complete or verify all actions first"}
            </p>
          </div>
        )}

        {/* Trend History */}
        {capa.effectivenessHistory && capa.effectivenessHistory.length > 0 && (
          <div className="pt-6 border-t mt-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Evaluation History & Trends
            </h4>
            <div className="space-y-3">
              {[...capa.effectivenessHistory]
                .reverse()
                .filter(entry => {
                   const mB = entry.metricsBefore || {};
                   const mA = entry.metricsAfter || {};
                   const isValid = (v) => v !== '' && v !== null && v !== undefined;
                   const hasData = isValid(mB.defectRate) || isValid(mB.fpy) || isValid(mB.customerComplaints) ||
                                   isValid(mA.defectRate) || isValid(mA.fpy) || isValid(mA.customerComplaints);
                   return hasData;
                })
                .map((entry, idx) => {
                  const isValid = (v) => v !== '' && v !== null && v !== undefined;
                  
                  const hasBefore = entry.metricsBefore && (
                    isValid(entry.metricsBefore.defectRate) || 
                    isValid(entry.metricsBefore.fpy) || 
                    isValid(entry.metricsBefore.customerComplaints)
                  );
                  
                  const hasAfter = entry.metricsAfter && (
                    isValid(entry.metricsAfter.defectRate) || 
                    isValid(entry.metricsAfter.fpy) || 
                    isValid(entry.metricsAfter.customerComplaints)
                  );

                  return (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border text-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {new Date(entry.recordedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                          </span>
                          {entry.effective !== null && entry.effective !== undefined && (
                            <Badge className={entry.effective ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {entry.effective ? 'Effective' : 'Not Effective'}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {entry.windowDays ? `Evaluation Window: ${entry.windowDays}d` : 'Evaluation Window: N/A'}
                        </span>
                      </div>
                      
                      {(hasBefore || hasAfter) && (
                        <div className="grid grid-cols-2 gap-4 mb-2 text-xs">
                          {hasBefore ? (
                            <div>
                              <span className="text-gray-500 block mb-1">Before CAPA:</span>
                              <div className="pl-2 border-l-2 border-gray-200">
                                {isValid(entry.metricsBefore?.defectRate) && <div>Defect Rate: {entry.metricsBefore.defectRate}%</div>}
                                {isValid(entry.metricsBefore?.fpy) && <div>FPY: {entry.metricsBefore.fpy}%</div>}
                                {isValid(entry.metricsBefore?.customerComplaints) && <div>Complaints: {entry.metricsBefore.customerComplaints}</div>}
                              </div>
                            </div>
                          ) : <div></div>}
                          
                          {hasAfter ? (
                            <div>
                              <span className="text-gray-500 block mb-1">After CAPA:</span>
                              <div className="pl-2 border-l-2 border-blue-200">
                                {isValid(entry.metricsAfter?.defectRate) && <div>Defect Rate: {entry.metricsAfter.defectRate}%</div>}
                                {isValid(entry.metricsAfter?.fpy) && <div>FPY: {entry.metricsAfter.fpy}%</div>}
                                {isValid(entry.metricsAfter?.customerComplaints) && <div>Complaints: {entry.metricsAfter.customerComplaints}</div>}
                              </div>
                            </div>
                          ) : <div></div>}
                        </div>
                      )}
                      
                      {entry.notes && (
                        <div className="text-gray-600 italic border-t pt-2 mt-2">
                          "{entry.notes}"
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
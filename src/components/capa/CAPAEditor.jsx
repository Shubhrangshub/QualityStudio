import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check, X, Sparkles, CheckCircle2, FileText, Loader2, Unlock } from "lucide-react";
import { format } from 'date-fns';
import RelatedDocuments from "../knowledge/RelatedDocuments";
import { base44 } from "@/api/base44Client";

export default function CAPAEditor({ capa, onUpdate }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [localApprovalState, setLocalApprovalState] = useState(capa.approvalState || 'draft');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {}
    };
    loadUser();
  }, []);

  useEffect(() => {
    setLocalApprovalState(capa.approvalState || 'draft');
  }, [capa.approvalState]);

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const [ca, setCA] = useState(capa.correctiveActions || []);
  const [pa, setPA] = useState(capa.preventiveActions || []);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // {type: 'success'|'error', text: string}

  // Sync with capa prop when it changes
  useEffect(() => {
    if (capa.correctiveActions) {
      setCA(capa.correctiveActions);
    }
    if (capa.preventiveActions) {
      setPA(capa.preventiveActions);
    }
  }, [capa.id]);

  const addAction = (type) => {
    const newAction = {
      action: '',
      owner: '',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'not_started'
    };

    if (type === 'ca') {
      setCA([...ca, newAction]);
    } else {
      setPA([...pa, newAction]);
    }
  };

  const updateAction = (type, index, field, value) => {
    if (type === 'ca') {
      const updated = [...ca];
      updated[index][field] = value;
      setCA(updated);
    } else {
      const updated = [...pa];
      updated[index][field] = value;
      setPA(updated);
    }
  };

  const removeAction = (type, index) => {
    if (type === 'ca') {
      setCA(ca.filter((_, i) => i !== index));
    } else {
      setPA(pa.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setStatusMessage(null);
    
    try {
      await onUpdate({
        correctiveActions: ca,
        preventiveActions: pa
      });
      setSaveSuccess(true);
      setStatusMessage({ type: 'success', text: 'Actions saved successfully!' });
      setTimeout(() => {
        setSaveSuccess(false);
        setStatusMessage(null);
      }, 4000);
    } catch (error) {
      console.error("Save error:", error);
      setStatusMessage({ type: 'error', text: 'Failed to save. Please try again.' });
    }
    
    setSaving(false);
  };

  const handleStatusChange = async (newStatus, successMessage) => {
    setSaving(true);
    setStatusMessage(null);
    try {
      await onUpdate({ approvalState: newStatus });
      setLocalApprovalState(newStatus); // Update local state immediately

      // NEW: Auto-close linked Defect and Complaint if CAPA is closed
      if (newStatus === 'closed' && capa.defectTicketId) {
        try {
            const defects = await base44.entities.DefectTicket.filter({ id: capa.defectTicketId });
            if (defects.length > 0) {
                const defect = defects[0];
                // Update Defect status
                await base44.entities.DefectTicket.update(defect.id, { status: 'closed' });
                
                // Update Complaint status if linked
                if (defect.linkedComplaintId) {
                    await base44.entities.CustomerComplaint.update(defect.linkedComplaintId, { 
                        status: 'closed',
                        closedDate: new Date().toISOString(),
                        closureNotes: `Auto-closed via CAPA ${capa.id} closure.`
                    });
                }
            }
        } catch (err) {
            console.error("Error auto-closing linked records:", err);
        }
      }

      setStatusMessage({ type: 'success', text: successMessage });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (error) {
      console.error("Status change error:", error);
      setStatusMessage({ type: 'error', text: 'Failed to update status. Please try again.' });
    }
    setSaving(false);
  };

  const statusColors = {
    not_started: "bg-gray-100 text-gray-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    verified: "bg-purple-100 text-purple-800"
  };

  const ActionCard = ({ action, index, type, label }) => (
    <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-gray-700">{label} {index + 1}</span>
            {action.complexity && (
              <Badge variant="outline" className={
                action.complexity === 'simple' ? 'border-green-400 text-green-700' :
                action.complexity === 'moderate' ? 'border-yellow-400 text-yellow-700' :
                'border-red-400 text-red-700'
              }>
                {action.complexity}
              </Badge>
            )}
            {action.ownerRole && (
              <Badge variant="outline" className="border-blue-400 text-blue-700">
                {action.ownerRole}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[action.status]}>
            {action.status?.replace(/_/g, ' ')}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeAction(type, index)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>

      <Textarea
        value={action.action}
        onChange={(e) => updateAction(type, index, 'action', e.target.value)}
        placeholder="Describe the action..."
        rows={2}
      />

      {/* Additional AI-generated fields */}
      {action.verificationMethod && (
        <div className="p-2 bg-blue-50 rounded text-xs">
          <p className="font-medium text-blue-900">Verification Method:</p>
          <p className="text-blue-700">{action.verificationMethod}</p>
        </div>
      )}

      {action.linkedRootCause && (
        <div className="p-2 bg-purple-50 rounded text-xs">
          <p className="font-medium text-purple-900">Addresses Root Cause:</p>
          <p className="text-purple-700">{action.linkedRootCause}</p>
        </div>
      )}

      {action.systemImpact && (
        <div className="p-2 bg-yellow-50 rounded text-xs">
          <p className="font-medium text-yellow-900">System Impact:</p>
          <p className="text-yellow-700">{action.systemImpact}</p>
        </div>
      )}

      {action.estimatedCost && (
        <div className="p-2 bg-green-50 rounded text-xs">
          <p className="font-medium text-green-900">Estimated Cost:</p>
          <p className="text-green-700">{action.estimatedCost}</p>
        </div>
      )}

      {action.trainingRequired && (
        <Badge className="bg-orange-100 text-orange-800">
          Training Required
        </Badge>
      )}

      {action.documentationUpdate && (
        <div className="p-2 bg-indigo-50 rounded text-xs">
          <p className="font-medium text-indigo-900">Documentation Update:</p>
          <p className="text-indigo-700">{action.documentationUpdate}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600">Owner</label>
          <Input
            value={action.owner}
            onChange={(e) => updateAction(type, index, 'owner', e.target.value)}
            placeholder="Email or name"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Due Date</label>
          <Input
            type="date"
            value={action.dueDate}
            onChange={(e) => updateAction(type, index, 'dueDate', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-600">Status {!isAdmin && action.status !== 'verified' && <span className="text-gray-400">(Admin verifies)</span>}</label>
        <Select 
          value={action.status} 
          onValueChange={(val) => updateAction(type, index, 'status', val)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            {isAdmin && <SelectItem value="verified">Verified (Admin Only)</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {action.completionDate && (
        <p className="text-xs text-gray-500">
          Completed: {format(new Date(action.completionDate), 'MMM d, yyyy')}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Actions Plan</CardTitle>
            {capa.aiGeneratedDraft && (
              <Badge className="bg-purple-100 text-purple-800">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Generated
              </Badge>
            )}
          </div>
          {capa.implementationStrategy && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-medium text-blue-900 mb-1">Implementation Strategy:</p>
              <p className="text-xs text-blue-700">{capa.implementationStrategy}</p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {saveSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                CAPA actions saved successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Corrective Actions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Corrective Actions</h3>
              <Button onClick={() => addAction('ca')} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add CA
              </Button>
            </div>
            <div className="space-y-3">
              {ca.map((action, idx) => (
                <ActionCard
                  key={idx}
                  action={action}
                  index={idx}
                  type="ca"
                  label="CA"
                />
              ))}
              {ca.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No corrective actions yet
                </p>
              )}
            </div>
          </div>

          {/* Preventive Actions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Preventive Actions</h3>
              <Button onClick={() => addAction('pa')} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add PA
              </Button>
            </div>
            <div className="space-y-3">
              {pa.map((action, idx) => (
                <ActionCard
                  key={idx}
                  action={action}
                  index={idx}
                  type="pa"
                  label="PA"
                />
              ))}
              {pa.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No preventive actions yet
                </p>
              )}
            </div>
          </div>

          {capa.successCriteria && capa.successCriteria.length > 0 && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-900 mb-2">Success Criteria:</p>
              <ul className="space-y-1">
                {capa.successCriteria.map((criterion, idx) => (
                  <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button 
            onClick={handleSave} 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Actions
              </>
            )}
          </Button>

          {/* Status Change Buttons */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium text-gray-700 mb-3">Change CAPA Status:</p>
            
            {/* Status Message */}
            {statusMessage && (
              <Alert className={`mb-3 ${statusMessage.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={statusMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {statusMessage.text}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Status Flow Indicator */}
            <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
              <Badge className={localApprovalState === 'draft' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-600'}>1. Draft</Badge>
              <span>→</span>
              <Badge className={localApprovalState === 'pending_review' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'}>2. Review</Badge>
              <span>→</span>
              <Badge className={localApprovalState === 'approved' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}>3. Approved</Badge>
              <span>→</span>
              <Badge className={localApprovalState === 'closed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}>4. Closed</Badge>
            </div>

            <div className="flex flex-wrap gap-3">
              {localApprovalState === 'draft' && (
                <Button
                  onClick={() => handleStatusChange('pending_review', 'CAPA submitted for review!')}
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Submit for Review
                </Button>
              )}
              {localApprovalState === 'pending_review' && (
                <>
                  <Button
                    onClick={() => handleStatusChange('approved', 'CAPA approved!')}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Approve CAPA
                  </Button>
                  <Button
                    onClick={() => handleStatusChange('draft', 'CAPA returned to draft.')}
                    variant="outline"
                    disabled={saving}
                  >
                    Return to Draft
                  </Button>
                </>
              )}
              {localApprovalState === 'approved' && (
                <>
                  {(() => {
                    const allCA = ca || [];
                    const allPA = pa || [];
                    const allActions = [...allCA, ...allPA];
                    
                    // Allow close if actions are Verified OR Completed (since user requested checking for completed status)
                    const allDone = allActions.length > 0 && allActions.every(a => a.status === 'verified' || a.status === 'completed');
                    const doneCount = allActions.filter(a => a.status === 'verified' || a.status === 'completed').length;
                    
                    return (
                      <>
                        {!allDone && (
                          <div className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-2">
                            <p className="text-sm text-yellow-800">
                              <strong>Cannot close yet:</strong> All actions must be completed or verified. 
                              ({doneCount}/{allActions.length} ready)
                            </p>
                          </div>
                        )}
                        <Button
                          onClick={() => {
                            if (window.confirm('Close this CAPA? All actions are completed/verified.')) {
                              handleStatusChange('closed', 'CAPA closed successfully!');
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={saving || !allDone}
                        >
                          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                          Close CAPA
                        </Button>
                      </>
                    );
                  })()}
                  <Button
                    onClick={() => handleStatusChange('pending_review', 'CAPA returned to review.')}
                    variant="outline"
                    disabled={saving}
                  >
                    Return to Review
                  </Button>
                </>
              )}
              {localApprovalState === 'closed' && (
                <div className="w-full space-y-2">
                  <Badge className="bg-green-100 text-green-800 py-2 px-4 w-full justify-center text-sm">
                    ✓ CAPA Closed
                  </Badge>
                  {isAdmin && (
                    <Button
                      onClick={() => {
                        if (window.confirm('Unlock this CAPA? This will revert to "approved" status.')) {
                          handleStatusChange('approved', 'CAPA unlocked for editing.');
                        }
                      }}
                      variant="outline"
                      className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
                      Admin: Unlock for Editing
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NEW: SOP Recommendations */}
      {capa.sopRecommendations && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              SOP & Documentation Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SOPs to Update */}
            {capa.sopRecommendations.sopUpdatesNeeded && capa.sopRecommendations.sopUpdatesNeeded.length > 0 && (
              <div>
                <p className="text-sm font-medium text-blue-900 mb-2">📝 Existing SOPs to Update:</p>
                <div className="space-y-2">
                  {capa.sopRecommendations.sopUpdatesNeeded.map((sop, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border border-blue-200">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium text-sm">{sop.existingSOPTitle}</p>
                        <Badge className={
                          sop.priority === 'high' ? 'bg-red-100 text-red-800' :
                          sop.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {sop.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{sop.requiredChanges}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New SOPs Needed */}
            {capa.sopRecommendations.newSOPsNeeded && capa.sopRecommendations.newSOPsNeeded.length > 0 && (
              <div>
                <p className="text-sm font-medium text-blue-900 mb-2">➕ New SOPs to Create:</p>
                <div className="space-y-2">
                  {capa.sopRecommendations.newSOPsNeeded.map((sop, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border border-blue-200">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium text-sm">{sop.suggestedTitle}</p>
                        <Badge className={
                          sop.priority === 'high' ? 'bg-red-100 text-red-800' :
                          sop.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {sop.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{sop.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Training Materials */}
            {capa.sopRecommendations.trainingMaterialsNeeded && capa.sopRecommendations.trainingMaterialsNeeded.length > 0 && (
              <div>
                <p className="text-sm font-medium text-blue-900 mb-2">🎓 Training Materials Needed:</p>
                <ul className="space-y-1">
                  {capa.sopRecommendations.trainingMaterialsNeeded.map((material, idx) => (
                    <li key={idx} className="text-sm text-blue-700 pl-4">
                      • {material}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* NEW: Related Documents */}
      <RelatedDocuments 
        context={{ 
          type: 'capa', 
          data: capa
        }}
        onLink={async (docId) => {
          // Assuming 'base44' is an available global or imported object for data operations
          // In a real application, this would typically be an API call or a service function.
          const currentDoc = (await base44.entities.KnowledgeDocument.filter({id: docId}))[0];
          const updatedLinkedCapaIds = [...(currentDoc.linkedCAPAIds || []), capa.id];
          await base44.entities.KnowledgeDocument.update(docId, {
            linkedCAPAIds: updatedLinkedCapaIds
          });
          onUpdate({
            ...capa, // Ensure other capa properties are preserved
            linkedDocumentIds: [...(capa.linkedDocumentIds || []), docId]
          });
        }}
      />
    </div>
  );
}
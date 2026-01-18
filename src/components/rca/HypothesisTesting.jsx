import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X, CheckCircle2, Loader2 } from "lucide-react";

export default function HypothesisTesting({ rca, onUpdate }) {
  const [hypotheses, setHypotheses] = useState(rca.hypothesisList || []);
  const [newHypothesis, setNewHypothesis] = useState({ hypothesis: '', testMethod: '' });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync with rca prop when it changes
  useEffect(() => {
    if (rca.hypothesisList) {
      setHypotheses(rca.hypothesisList);
    }
  }, [rca.id]);

  const addHypothesis = () => {
    if (!newHypothesis.hypothesis.trim()) return;
    
    setHypotheses([
      ...hypotheses,
      { ...newHypothesis, result: '', validated: false }
    ]);
    setNewHypothesis({ hypothesis: '', testMethod: '' });
  };

  const updateHypothesis = (index, field, value) => {
    const updated = [...hypotheses];
    updated[index][field] = value;
    setHypotheses(updated);
  };

  const toggleValidation = (index) => {
    const updated = [...hypotheses];
    updated[index].validated = !updated[index].validated;
    setHypotheses(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      await onUpdate({ hypothesisList: hypotheses });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
    }
    
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hypothesis Testing</CardTitle>
        <p className="text-sm text-gray-500 mt-1">Test and validate root cause theories</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {saveSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Hypotheses saved successfully!
            </AlertDescription>
          </Alert>
        )}

        <div className="p-4 border rounded-lg bg-blue-50">
          <p className="text-sm font-medium text-blue-900 mb-3">Add New Hypothesis</p>
          <div className="space-y-3">
            <Input
              value={newHypothesis.hypothesis}
              onChange={(e) => setNewHypothesis({...newHypothesis, hypothesis: e.target.value})}
              placeholder="Hypothesis statement..."
            />
            <Input
              value={newHypothesis.testMethod}
              onChange={(e) => setNewHypothesis({...newHypothesis, testMethod: e.target.value})}
              placeholder="How to test this hypothesis..."
            />
            <Button onClick={addHypothesis} size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Hypothesis
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {hypotheses.map((hyp, idx) => (
            <div key={idx} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <p className="font-medium">{hyp.hypothesis}</p>
                <Badge className={hyp.validated ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                  {hyp.validated ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                  {hyp.validated ? 'Validated' : 'Pending'}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                <strong>Test Method:</strong> {hyp.testMethod}
              </p>

              <Textarea
                value={hyp.result}
                onChange={(e) => updateHypothesis(idx, 'result', e.target.value)}
                placeholder="Test results and observations..."
                rows={2}
                className="mb-2"
              />

              <Button
                onClick={() => toggleValidation(idx)}
                size="sm"
                variant={hyp.validated ? "outline" : "default"}
                className={hyp.validated ? "" : "bg-green-600 hover:bg-green-700"}
              >
                {hyp.validated ? 'Mark as Pending' : 'Mark as Validated'}
              </Button>
            </div>
          ))}
        </div>

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
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save Hypotheses
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
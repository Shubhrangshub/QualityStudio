import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, CheckCircle2, Loader2, Download } from "lucide-react";

export default function FiveWhyAnalysis({ rca, onUpdate }) {
  const [whys, setWhys] = useState(rca.fiveWhyTree || [
    { level: 1, question: "Why did this defect occur?", answer: "", evidence: "" }
  ]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync with rca prop when it changes
  useEffect(() => {
    if (rca?.fiveWhyTree && Array.isArray(rca.fiveWhyTree)) {
      setWhys(rca.fiveWhyTree);
    }
  }, [rca?.id]);

  const addWhy = () => {
    setWhys([...whys, { 
      level: whys.length + 1, 
      question: `Why? (Level ${whys.length + 1})`, 
      answer: "", 
      evidence: "" 
    }]);
  };

  const updateWhy = (index, field, value) => {
    const updated = [...whys];
    updated[index][field] = value;
    setWhys(updated);
  };

  const removeWhy = (index) => {
    setWhys(whys.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      await onUpdate({ fiveWhyTree: whys });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
    }
    
    setSaving(false);
  };

  const handleExport = () => {
    const content = whys.map(why => 
      `Level ${why.level}:\nQuestion: ${why.question}\nAnswer: ${why.answer}\nEvidence: ${why.evidence}\n\n`
    ).join('');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `5-Why-Analysis-${rca?.id?.slice(0, 8) || 'export'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>5-Why Analysis</CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleExport} size="sm" variant="outline">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button onClick={addWhy} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add Why
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {saveSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              5-Why analysis saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {whys.map((why, idx) => (
          <div key={idx} className="p-4 border rounded-lg bg-gray-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-700">Level {why.level}</span>
              {idx > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeWhy(idx)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Question</label>
              <Input
                value={why.question || ''}
                onChange={(e) => updateWhy(idx, 'question', e.target.value)}
                placeholder="Why did this happen?"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Answer</label>
              <Textarea
                value={why.answer || ''}
                onChange={(e) => updateWhy(idx, 'answer', e.target.value)}
                placeholder="Describe the cause..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Evidence</label>
              <Input
                value={why.evidence || ''}
                onChange={(e) => updateWhy(idx, 'evidence', e.target.value)}
                placeholder="Supporting evidence or data..."
                className="mt-1"
              />
            </div>
          </div>
        ))}
        
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
              Save 5-Why Analysis
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
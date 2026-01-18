import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from '@/api/apiClient';
import { 
  FileText, ExternalLink, Loader2, BookOpen, 
  Sparkles, Link as LinkIcon, AlertCircle 
} from "lucide-react";

export default function RelatedDocuments({ 
  context, // { type: 'defect'|'rca'|'capa', data: object }
  onLink 
}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  useEffect(() => {
    loadRelatedDocuments();
  }, [context]);

  const loadRelatedDocuments = async () => {
    setLoading(true);
    
    try {
      // Get all knowledge documents
      const allDocs = await api.entities.KnowledgeDocument.filter({ status: "active" }, "-created_date", 100);
      
      // Get AI suggestions for relevant documents
      const contextDescription = getContextDescription();
      
      const aiResult = await api.integrations.Core.InvokeLLM({
        prompt: `Analyze this ${context.type} context and identify which knowledge documents would be most relevant:

CONTEXT:
${contextDescription}

AVAILABLE DOCUMENTS:
${allDocs.map(doc => `
- Title: ${doc.title}
- Type: ${doc.documentType}
- Summary: ${doc.summary || 'No summary'}
- Keywords: ${doc.keywords?.join(', ') || 'None'}
- Defect Types: ${doc.defectTypes?.join(', ') || 'None'}
`).join('\n')}

Identify the top 5 most relevant documents and explain why they're relevant. Focus on:
- Direct relevance to the defect type or root cause
- Applicable troubleshooting steps
- Related process parameters
- Similar historical cases
- Relevant SOPs or procedures`,
        response_json_schema: {
          type: "object",
          properties: {
            relevantDocuments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  documentTitle: { type: "string" },
                  relevanceScore: { type: "number", minimum: 0, maximum: 100 },
                  relevanceReason: { type: "string" },
                  applicableInsights: { type: "array", items: { type: "string" } },
                  suggestedAction: { type: "string" }
                }
              }
            },
            missingDocumentation: { 
              type: "array", 
              items: { type: "string" },
              description: "Types of documents that would be helpful but are missing"
            }
          }
        }
      });

      // Match AI suggestions with actual documents
      const suggestedDocs = aiResult.relevantDocuments
        .map(suggestion => {
          const doc = allDocs.find(d => d.title === suggestion.documentTitle);
          return doc ? { ...doc, aiSuggestion: suggestion } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.aiSuggestion.relevanceScore - a.aiSuggestion.relevanceScore);

      setDocuments(suggestedDocs);
      setAiSuggestions(aiResult);
      
    } catch (error) {
      console.error("Error loading related documents:", error);
    }
    
    setLoading(false);
  };

  const getContextDescription = () => {
    if (context.type === 'defect') {
      const d = context.data;
      return `Defect Type: ${d.defectType?.replace(/_/g, ' ')}
Severity: ${d.severity}
Line: ${d.line}
Product: ${d.productCode}
Description: ${d.immediateAction || 'Not specified'}`;
    }
    
    if (context.type === 'rca') {
      const r = context.data;
      return `Root Causes: ${r.rootCauses?.map(rc => rc.cause || rc).join(', ') || 'Not identified'}
5-Why Levels: ${r.fiveWhyTree?.length || 0}
Ishikawa Categories: ${Object.keys(r.ishikawa || {}).join(', ')}
Hypotheses: ${r.hypothesisList?.length || 0}`;
    }
    
    if (context.type === 'capa') {
      const c = context.data;
      return `Corrective Actions: ${c.correctiveActions?.length || 0}
Preventive Actions: ${c.preventiveActions?.length || 0}
Actions: ${[...(c.correctiveActions || []), ...(c.preventiveActions || [])].map(a => a.action).join(', ')}`;
    }
    
    return '';
  };

  const getDocumentIcon = (type) => {
    const icons = {
      sop: FileText,
      technical_paper: BookOpen,
      vendor_spec: FileText,
      training_material: BookOpen,
      research: BookOpen,
      best_practice: Sparkles,
      troubleshooting_guide: AlertCircle
    };
    return icons[type] || FileText;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-600">AI is finding relevant documents...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Related Knowledge Documents
          <Badge className="ml-auto bg-purple-100 text-purple-800">
            {documents.length} AI-Matched
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.length > 0 ? (
          <>
            {documents.map((doc) => {
              const Icon = getDocumentIcon(doc.documentType);
              const suggestion = doc.aiSuggestion;
              
              return (
                <div key={doc.id} className="p-4 bg-white rounded-lg border border-purple-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 truncate">{doc.title}</h4>
                          <Badge variant="outline" className="flex-shrink-0">
                            {doc.documentType.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        {doc.summary && (
                          <p className="text-sm text-gray-600 mb-2">{doc.summary}</p>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800 flex-shrink-0 ml-2">
                      {suggestion.relevanceScore}% match
                    </Badge>
                  </div>

                  {/* AI Relevance Explanation */}
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs font-medium text-purple-900 mb-1">
                      🤖 Why this is relevant:
                    </p>
                    <p className="text-xs text-purple-700">{suggestion.relevanceReason}</p>
                  </div>

                  {/* Applicable Insights */}
                  {suggestion.applicableInsights && suggestion.applicableInsights.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-700">Key insights:</p>
                      <ul className="space-y-1">
                        {suggestion.applicableInsights.slice(0, 3).map((insight, idx) => (
                          <li key={idx} className="text-xs text-gray-600 pl-4">
                            • {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested Action */}
                  {suggestion.suggestedAction && (
                    <div className="p-2 bg-blue-50 rounded text-xs">
                      <p className="font-medium text-blue-900 mb-1">Suggested action:</p>
                      <p className="text-blue-700">{suggestion.suggestedAction}</p>
                    </div>
                  )}

                  {/* Document metadata */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex flex-wrap gap-1">
                      {doc.keywords?.slice(0, 4).map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {onLink && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onLink(doc.id)}
                        >
                          <LinkIcon className="w-3 h-3 mr-1" />
                          Link
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.fileUrl, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Missing Documentation */}
            {aiSuggestions.missingDocumentation && aiSuggestions.missingDocumentation.length > 0 && (
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-900 mb-2">
                  📋 Recommended documentation to create:
                </p>
                <ul className="space-y-1">
                  {aiSuggestions.missingDocumentation.map((doc, idx) => (
                    <li key={idx} className="text-sm text-orange-700 pl-4">
                      • {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-2">No related documents found</p>
            <p className="text-xs text-gray-400">
              Upload knowledge documents to get AI-powered recommendations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
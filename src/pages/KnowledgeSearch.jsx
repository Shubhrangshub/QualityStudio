import React, { useState } from "react";
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, BookOpen, Loader2, ExternalLink, 
  Sparkles, FileText, TrendingUp, Lightbulb
} from "lucide-react";

export default function KnowledgeSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [recommendedArticles, setRecommendedArticles] = useState(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);

    try {
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Search and provide comprehensive information about: ${searchQuery}
        
        For lamination processes, window films, or PPF manufacturing topics, provide:
        1. Technical explanation
        2. Best practices and industry standards
        3. Common issues and solutions
        4. Process optimization recommendations
        5. Safety considerations`,
        add_context_from_internet: true
      });

      setResults(result);

      // Get recommended articles
      const articles = await api.integrations.Core.InvokeLLM({
        prompt: `Suggest 5 relevant technical articles, research papers, or industry resources about: ${searchQuery}. Focus on lamination, film coating, adhesive technology, or quality control.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            articles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  source: { type: "string" },
                  summary: { type: "string" },
                  relevance: { type: "string" }
                }
              }
            }
          }
        }
      });

      setRecommendedArticles(articles);
    } catch (error) {
      console.error("Search error:", error);
    }

    setSearching(false);
  };

  const popularTopics = [
    { icon: Sparkles, label: "Bubble Prevention", query: "How to prevent bubbles in lamination process" },
    { icon: TrendingUp, label: "Process Optimization", query: "Optimizing line speed and quality in lamination" },
    { icon: Lightbulb, label: "Adhesive Selection", query: "Best practices for adhesive selection in PPF" },
    { icon: FileText, label: "Quality Standards", query: "Quality standards for window film manufacturing" }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            Knowledge Search
          </h1>
          <p className="text-gray-600 mt-1">AI-powered search for technical knowledge and best practices</p>
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search for technical knowledge, best practices, troubleshooting..."
                  className="pl-12 h-12 text-lg"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="h-12 px-8 bg-blue-600 hover:bg-blue-700"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {/* Popular Topics */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Popular Topics:</p>
              <div className="flex flex-wrap gap-2">
                {popularTopics.map((topic, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery(topic.query);
                      setTimeout(() => handleSearch(), 100);
                    }}
                    className="h-auto py-2"
                  >
                    <topic.icon className="w-4 h-4 mr-2" />
                    {topic.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searching ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Searching knowledge base and internet resources...</p>
            </CardContent>
          </Card>
        ) : results ? (
          <div className="space-y-6">
            {/* Main Answer */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  AI Knowledge Assistant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700">{results}</div>
                </div>
              </CardContent>
            </Card>

            {/* Recommended Articles */}
            {recommendedArticles?.articles && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-green-600" />
                    Recommended Reading
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recommendedArticles.articles.map((article, idx) => (
                      <div key={idx} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{article.title}</h3>
                          <Badge className="bg-green-100 text-green-800 ml-2 flex-shrink-0">
                            {article.relevance}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{article.summary}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{article.source}</span>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Read More
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Related Topics */}
            <Card>
              <CardHeader>
                <CardTitle>Related Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    "Process parameter optimization",
                    "Defect root cause analysis",
                    "Quality control methods",
                    "Material compatibility"
                  ].map((topic, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="justify-start"
                      onClick={() => {
                        setSearchQuery(topic);
                        setTimeout(() => handleSearch(), 100);
                      }}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      {topic}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Search for technical knowledge, best practices, and solutions</p>
              <p className="text-sm text-gray-400 mt-2">
                Ask questions about lamination processes, defects, materials, or quality control
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
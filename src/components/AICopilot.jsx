import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { entities, ai } from "@/api/localBackendClient";
import { 
  Bot, Send, X, Minimize2, Maximize2, Loader2, 
  Sparkles, FileText, TrendingUp, Lightbulb
} from "lucide-react";

export default function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your Quality AI Copilot. I can help you with:\n\n• Analyzing defects and suggesting solutions\n• Creating SOPs and training materials\n• Recommending experiments and process improvements\n• Searching knowledge base\n• Automation and IoT opportunities\n\nHow can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Get context from app
      const defects = await entities.DefectTicket.list("-created_date", 10);
      const rcas = await entities.RCARecord.list("-created_date", 5);
      
      const context = `
Recent Defects: ${defects.map(d => `${d.defectType} (${d.severity}) on ${d.line}`).join(', ')}
Active RCAs: ${rcas.length}
      `;

      // Use AI service for RCA suggestions
      const response = await ai.getRCASuggestions(
        `${context}\n\nUser question: ${userMessage}`,
        'general',
        'minor'
      );

      const aiResponse = response.suggestions 
        ? `Based on my analysis:\n\n${response.suggestions.join('\n\n')}` 
        : 'I\'m here to help with quality analysis. Please try asking about defects, RCA, or process improvements.';

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: aiResponse 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    }

    setIsLoading(false);
  };

  const quickActions = [
    { icon: FileText, label: "Create SOP", prompt: "Create a detailed SOP for preventing bubbles in lamination" },
    { icon: TrendingUp, label: "Suggest DoE", prompt: "Suggest a DoE to optimize line speed and nip pressure" },
    { icon: Lightbulb, label: "Automation Ideas", prompt: "What automation and IoT opportunities can improve our quality?" },
    { icon: Sparkles, label: "Analyze Defects", prompt: "Analyze my recent defects and suggest corrective actions" }
  ];

  const handleQuickAction = (prompt) => {
    setInput(prompt);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 z-50"
      >
        <Bot className="w-6 h-6 text-white" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-14 px-6 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Bot className="w-5 h-5 text-white mr-2" />
          <span className="text-white font-medium">AI Copilot</span>
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Bot className="w-5 h-5" />
            AI Quality Copilot
            <Badge className="bg-white text-blue-600 ml-2">Beta</Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length === 1 && (
          <div className="p-4 border-t bg-gray-50">
            <p className="text-xs font-medium text-gray-600 mb-2">Quick Actions:</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.prompt)}
                  className="text-xs h-auto py-2 flex-col items-start"
                >
                  <action.icon className="w-4 h-4 mb-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
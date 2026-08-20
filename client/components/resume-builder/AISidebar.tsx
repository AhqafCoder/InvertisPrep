'use client';

import { useState, useEffect } from 'react';
import { Sparkles, MessageSquare, Zap, History, Loader2, Send, Copy, Check, AlertCircle, Target, FileText, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIResume, type ATSResult, type SkillGroupSuggestion, REWRITE_INSTRUCTIONS, type RewriteInstruction, buildSummaryContext } from '@/lib/aiResume';
import type { Resume, ResumeExperience } from '@/types';
import { toast } from 'sonner';

interface AISidebarProps {
  resume: Resume;
  update: (patch: Partial<Resume>) => void;
  updatePersonal?: (patch: Partial<Resume['personal']>) => void;
}

interface GenerationHistoryItem {
  id: string;
  type: 'summary' | 'bullets' | 'project' | 'skills' | 'rewrite' | 'ats';
  timestamp: Date;
  input: string;
  output: string;
  applied: boolean;
}

const QUICK_ACTIONS = [
  {
    id: 'generate-all-bullets',
    icon: Zap,
    title: 'Generate All Bullets',
    description: 'Write achievement bullets for all experience entries',
  },
  {
    id: 'ats-check',
    icon: Target,
    title: 'ATS Check',
    description: 'Analyze resume for ATS compatibility and keyword gaps',
  },
  {
    id: 'match-jd',
    icon: FileText,
    title: 'Match to Job Description',
    description: 'Paste a JD to find missing keywords and tailor resume',
  },
  {
    id: 'rewrite-all',
    icon: Brain,
    title: 'Polish Entire Resume',
    description: 'Improve clarity and impact across all sections',
  },
] as const;

export function AISidebar({ resume, update, updatePersonal }: AISidebarProps) {
  const { actions, isLoading } = useAIResume();
  const [activeTab, setActiveTab] = useState<'chat' | 'actions' | 'history'>('chat');

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'chat' | 'actions' | 'history');
  };

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; type?: 'text' | 'suggestion'; data?: any }>>([]);
  const [atsResult, setAtsResult] = useState<ATSResult | null>(null);
  const [jdInput, setJdInput] = useState('');
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [generatingAction, setGeneratingAction] = useState<string | null>(null);

  // Persist history to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai-resume-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved).map((h: any) => ({ ...h, timestamp: new Date(h.timestamp) })));
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ai-resume-history', JSON.stringify(history.slice(-20)));
  }, [history]);

  const addToHistory = (item: Omit<GenerationHistoryItem, 'id' | 'timestamp'>) => {
    const newItem: GenerationHistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
    };
    setHistory(prev => [newItem, ...prev].slice(0, 20));
  };

  // ─── Chat Handlers ───
  const handleChatSend = async () => {
    if (!chatInput.trim() || isLoading) return;
    
    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');

    try {
      // Simple intent detection for demo
      const lower = userMessage.toLowerCase();
      let response = '';
      let suggestionData = null;

      if (lower.includes('summary') || lower.includes('profile')) {
        const summary = await actions.generateSummary(buildSummaryContext(resume));
        response = `Here's a generated professional summary:\n\n${summary}`;
        suggestionData = { type: 'summary', content: summary };
      } else if (lower.includes('bullet') || lower.includes('achievement')) {
        response = 'To generate bullets for a specific role, please use the "Generate All Bullets" quick action or specify which company/role you want bullets for.';
      } else if (lower.includes('skill')) {
        response = 'Use the "Suggest Skills" button in the Skills section or the "Polish Entire Resume" quick action for skill improvements.';
      } else if (lower.includes('ats') || lower.includes('score')) {
        const result = await actions.getATSScore(resume);
        setAtsResult(result);
        response = `ATS Score: ${result.score}/100\n\nMissing keywords: ${result.missingKeywords.join(', ')}\n\nSuggestions:\n${result.suggestions.map(s => `• ${s}`).join('\n')}`;
        suggestionData = { type: 'ats', content: result };
      } else {
        response = 'I can help you with:\n• Generating a professional summary\n• Writing achievement bullets\n• ATS scoring and keyword analysis\n• Skill suggestions\n\nTry asking: "Generate a summary for a Senior React Developer role"';
      }

      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response,
        type: suggestionData ? 'suggestion' : 'text',
        data: suggestionData,
      }]);
      
      if (suggestionData) {
        addToHistory({
          type: suggestionData.type as any,
          input: userMessage,
          output: response,
          applied: false,
        });
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, something went wrong. Please try again.' 
      }]);
    }
  };

  const handleApplySuggestion = async (data: any) => {
    if (data.type === 'summary') {
      update({ summary: data.content });
      toast.success('Summary applied!');
    }
    // Update history
    setHistory(prev => prev.map(h => 
      h.output === data.content ? { ...h, applied: true } : h
    ));
  };

  // ─── Quick Actions Handlers ───
  const handleQuickAction = async (actionId: string) => {
    setGeneratingAction(actionId);
    
    try {
      switch (actionId) {
        case 'generate-all-bullets': {
          // Generate bullets for each experience entry
          for (let i = 0; i < resume.experience.length; i++) {
            const exp = resume.experience[i];
            if (!exp.company || !exp.role) continue;
            
            const bullets = await actions.generateExperienceBullets({
              company: exp.company,
              role: exp.role,
              description: exp.description,
            });
            
            addToHistory({
              type: 'bullets',
              input: `${exp.role} at ${exp.company}`,
              output: bullets.join('\n'),
              applied: false,
            });
          }
          toast.success(`Generated bullets for ${resume.experience.length} experience entries`);
          break;
        }
        
        case 'ats-check': {
          const result = await actions.getATSScore(resume);
          setAtsResult(result);
          setActiveTab('history'); // Show in history
          addToHistory({
            type: 'ats',
            input: 'Full resume ATS check',
            output: `Score: ${result.score}/100\nMissing: ${result.missingKeywords.join(', ')}`,
            applied: false,
          });
          break;
        }
        
        case 'match-jd': {
          if (!jdInput.trim()) {
            toast.error('Please paste a job description first');
            return;
          }
          const result = await actions.getATSScore(resume, jdInput);
          setAtsResult(result);
          addToHistory({
            type: 'ats',
            input: 'JD Match: ' + jdInput.slice(0, 50) + '...',
            output: `Score: ${result.score}/100\nMissing: ${result.missingKeywords.join(', ')}`,
            applied: false,
          });
          break;
        }
        
        case 'rewrite-all': {
          // Rewrite summary
          if (resume.summary) {
            const polished = await actions.rewriteText(resume.summary, 'polish');
            update({ summary: polished });
            addToHistory({
              type: 'rewrite',
              input: 'Summary polish',
              output: polished,
              applied: true,
            });
          }
          
          // Rewrite experience descriptions and achievements
          for (const exp of resume.experience) {
            if (exp.description) {
              const polished = await actions.rewriteText(exp.description, 'polish');
              // Note: Would need more granular update function
              addToHistory({
                type: 'rewrite',
                input: `Experience: ${exp.role}`,
                output: polished,
                applied: false,
              });
            }
          }
          
          toast.success('Resume polished! Review changes in each section.');
          break;
        }
      }
    } catch (error) {
      toast.error('Action failed. Please try again.');
    } finally {
      setGeneratingAction(null);
    }
  };

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#f8fafc]">
      {/* Header */}
      <div className="border-b border-slate-200/80 bg-white/70 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-2.5 ring-1 ring-indigo-100">
            <Sparkles className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">AI Assistant</h3>
            <p className="text-xs text-slate-500">Chat, rewrite, and ATS tools</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col border-b border-slate-200/80">
        <TabsList className="grid w-full grid-cols-3 border-b border-slate-200/70 bg-white p-1">
          <TabsTrigger value="chat" className="px-2 py-1.5 text-xs data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
            <MessageSquare className="mr-1 h-4 w-4" /> Chat
          </TabsTrigger>
          <TabsTrigger value="actions" className="px-2 py-1.5 text-xs data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
            <Zap className="mr-1 h-4 w-4" /> Actions
          </TabsTrigger>
          <TabsTrigger value="history" className="px-2 py-1.5 text-xs data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
            <History className="mr-1 h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>

            {/* Chat Tab */}
          <TabsContent value="chat" className="flex flex-1 flex-col overflow-hidden p-3">
              <ScrollArea className="flex-1 space-y-3 pr-2">
                {chatMessages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
                    <Sparkles className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium">Start a conversation</p>
                    <p className="mt-1 text-xs">Ask me to improve your resume</p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      <div 
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          msg.role === 'user'
                            ? 'rounded-br-none bg-indigo-600 text-white'
                            : 'rounded-bl-none border border-slate-200 bg-white text-slate-900 shadow-sm'
                        }`}
                      >
                        {msg.type === 'suggestion' && msg.data ? (
                          <>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 text-xs"
                              onClick={() => handleApplySuggestion(msg.data!)}
                            >
                              <Check className="h-3 w-3 mr-1" /> Apply
                            </Button>
                          </>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
              
              <div className="mt-3 border-t border-slate-200/80 pt-3">
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleChatSend())}
                    placeholder="Ask me to improve your resume..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    size="icon"
                    onClick={handleChatSend}
                    disabled={isLoading || !chatInput.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 text-center">
                  Try: "Generate summary for Senior React role" or "Check ATS score"
                </p>
              </div>
          </TabsContent>

            {/* Quick Actions Tab */}
            <TabsContent value="actions" className="flex flex-1 flex-col overflow-hidden p-3">
              <ScrollArea className="flex-1 space-y-3 pr-2">
                {/* JD Input for Match Action */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Job Description (for Match to JD)
                  </Label>
                  <Textarea
                    className="min-h-24 rounded-xl border-slate-200 bg-white text-sm shadow-sm"
                    value={jdInput}
                    onChange={(e) => setJdInput(e.target.value)}
                    placeholder="Paste a job description here to match your resume against it..."
                  />
                </div>

                <div className="grid gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="h-auto gap-3 rounded-xl border-slate-200 bg-white p-3 text-left shadow-sm hover:border-indigo-200 hover:bg-indigo-50/60"
                      onClick={() => handleQuickAction(action.id)}
                      disabled={isLoading || generatingAction !== null || (action.id === 'match-jd' && !jdInput.trim())}
                    >
                      <action.icon className="h-5 w-5 text-indigo-600 shrink-0" />
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm text-slate-900">{action.title}</p>
                        <p className="text-xs text-slate-500">{action.description}</p>
                      </div>
                      {generatingAction === action.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
          </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex flex-1 flex-col overflow-hidden p-3">
              <ScrollArea className="flex-1 space-y-2 pr-2">
                {history.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
                    <History className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium">No history yet</p>
                    <p className="mt-1 text-xs">Your AI generations will appear here</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-indigo-100 text-indigo-700">
                              {item.type.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-400">
                              {item.timestamp.toLocaleTimeString()}
                            </span>
                            {item.applied && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-700">
                                Applied
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 truncate">{item.input}</p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.output}</p>
                        </div>
                        {!item.applied && item.type !== 'ats' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-slate-400 hover:text-indigo-600"
                            onClick={() => {
                              if (item.type === 'summary') update({ summary: item.output });
                              toast.success('Applied!');
                              setHistory(prev => prev.map(h => h.id === item.id ? { ...h, applied: true } : h));
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
              
              {atsResult && (
                <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Latest ATS Score
                  </Label>
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Score</span>
                      <span className="text-2xl font-bold text-indigo-600">{atsResult.score}/100</span>
                    </div>
                    {atsResult.missingKeywords.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-slate-600">Missing Keywords:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {atsResult.missingKeywords.slice(0, 8).map((kw, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-[10px] bg-white text-slate-600 rounded border border-slate-200">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
        </TabsContent>
      </Tabs>
    </aside>
  );
}
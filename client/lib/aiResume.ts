'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { Resume, ResumeExperience, ResumeSkillGroup } from '@/types';

// ─── Types ───

export interface ATSResult {
  score: number;
  missingKeywords: string[];
  suggestions: string[];
}

export interface SkillGroupSuggestion {
  title: string;
  items: string[];
}

export interface AIResumeActions {
  generateSummary: (context: {
    experience: ResumeExperience[];
    skills: string[];
    targetRole?: string;
  }) => Promise<string>;
  generateExperienceBullets: (context: {
    company: string;
    role: string;
    description: string;
  }) => Promise<string[]>;
  generateProjectDescription: (context: {
    name: string;
    techStack: string[];
    goal: string;
  }) => Promise<string>;
  suggestSkills: (context: {
    targetRole: string;
    currentSkills: string[];
  }) => Promise<SkillGroupSuggestion[]>;
  rewriteText: (text: string, instruction: string) => Promise<string>;
  getATSScore: (resume: Resume, targetJD?: string) => Promise<ATSResult>;
}

interface UseAIResumeReturn {
  actions: AIResumeActions;
  isLoading: boolean;
  error: string | null;
}

// ─── Hook ───

const API_BASE = '/api/ai/resume';

async function apiCall<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'AI request failed');
  }

  return data.data as T;
}

export function useAIResume(): UseAIResumeReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withLoading = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const actions: AIResumeActions = {
    generateSummary: (context) =>
      withLoading(() => apiCall<{ summary: string }>('/summary', context).then((d) => d.summary)),

    generateExperienceBullets: (context) =>
      withLoading(() => apiCall<{ bullets: string[] }>('/experience-bullets', context).then((d) => d.bullets)),

    generateProjectDescription: (context) =>
      withLoading(() => apiCall<{ description: string }>('/project-description', context).then((d) => d.description)),

    suggestSkills: (context) =>
      withLoading(() => apiCall<{ skillGroups: SkillGroupSuggestion[] }>('/suggest-skills', context).then((d) => d.skillGroups)),

    rewriteText: (text, instruction) =>
      withLoading(() => apiCall<{ rewritten: string }>('/rewrite', { text, instruction }).then((d) => d.rewritten)),

    getATSScore: (resume, targetJD) =>
      withLoading(() => apiCall<ATSResult>('/ats-score', { resume, targetJD })),
  };

  return { actions, isLoading, error };
}

// ─── Rewrite Instructions ───

export const REWRITE_INSTRUCTIONS = [
  { id: 'polish', label: 'Polish', description: 'Improve clarity, flow, and professional tone' },
  { id: 'shorten', label: 'Shorten', description: 'Make more concise while keeping key points' },
  { id: 'quantify', label: 'Quantify', description: 'Add metrics, numbers, and measurable outcomes' },
  { id: 'actionVerbs', label: 'Action Verbs', description: 'Start with strong action verbs, remove passive voice' },
] as const;

export type RewriteInstruction = (typeof REWRITE_INSTRUCTIONS)[number]['id'];

// ─── Helper to extract all skills from resume ───

export function extractAllSkills(resume: Resume): string[] {
  return resume.skillGroups.flatMap((group) => group.items.filter(Boolean));
}

// ─── Helper to build context for summary generation ───

export function buildSummaryContext(resume: Resume, targetRole?: string) {
  return {
    experience: resume.experience,
    skills: extractAllSkills(resume),
    targetRole,
  };
}
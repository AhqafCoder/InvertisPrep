'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, X } from 'lucide-react';
import { useAIResume, type SkillGroupSuggestion } from '@/lib/aiResume';
import type { Resume, ResumeExperience } from '@/types';

interface AIGenerateSummaryButtonProps {
  resume: Resume;
  update: (patch: Partial<Resume>) => void;
}

export function AIGenerateSummaryButton({ resume, update }: AIGenerateSummaryButtonProps) {
  const { actions, isLoading } = useAIResume();
  const [open, setOpen] = useState(false);
  const [generated, setGenerated] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const summary = await actions.generateSummary({
        experience: resume.experience,
        skills: resume.skillGroups.flatMap(g => g.items),
        targetRole: targetRole || undefined,
      });
      setGenerated(summary);
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    update({ summary: generated });
    setOpen(false);
    setGenerated('');
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1 border-slate-200 px-2 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
        onClick={() => setOpen(true)}
        disabled={isLoading}
      >
        <Sparkles size={14} /> AI Generate
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Generate Professional Summary
            </DialogTitle>
            <DialogDescription>
              AI will create a compelling summary based on your experience and skills.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Target Role (optional)</Label>
              <Input
                className="mt-1.5"
                placeholder="e.g., Senior Frontend Developer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={generating || isLoading}
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Summary'}
            </Button>

            {generated && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Generated Summary</Label>
                <Textarea
                  className="min-h-28"
                  value={generated}
                  onChange={(e) => setGenerated(e.target.value)}
                  readOnly
                />
                <Button className="w-full" onClick={handleApply} variant="default">
                  Apply to Resume
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface AIExperienceBulletsButtonProps {
  update: (patch: Partial<Resume>) => void;
  experienceIndex?: number;
  existingExperience?: ResumeExperience;
}

export function AIExperienceBulletsButton({ update, experienceIndex, existingExperience }: AIExperienceBulletsButtonProps) {
  const { actions, isLoading } = useAIResume();
  const [open, setOpen] = useState(false);
  const [generated, setGenerated] = useState<string[]>([]);
  const [form, setForm] = useState({
    company: existingExperience?.company || '',
    role: existingExperience?.role || '',
    description: existingExperience?.description || '',
  });
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const bullets = await actions.generateExperienceBullets(form);
      setGenerated(bullets);
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    if (experienceIndex !== undefined) {
      // Update existing experience
      const newAchievements = generated.filter(b => b.trim());
      update({} as any); // Trigger dirty - actual update handled by parent via onChange
      // We'll need a more specific update function from parent
    }
    setOpen(false);
    setGenerated([]);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1 border-slate-200 px-2 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
        onClick={() => setOpen(true)}
        disabled={isLoading}
      >
        <Sparkles size={14} /> AI Bullets
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Generate Achievement Bullets
            </DialogTitle>
            <DialogDescription>
              AI will write 4-5 quantified achievement bullets for this role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Company</Label>
                <Input
                  className="mt-1.5"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role</Label>
                <Input
                  className="mt-1.5"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="Your title"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role Description (optional)</Label>
              <Textarea
                className="mt-1.5 min-h-20"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of your responsibilities"
              />
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={generating || isLoading}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Bullets'}
            </Button>

            {generated.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Generated Bullets</Label>
                <Textarea
                  className="min-h-40 font-mono text-sm"
                  value={generated.join('\n')}
                  onChange={(e) => setGenerated(e.target.value.split('\n'))}
                  readOnly
                />
                <p className="text-xs text-slate-500">Copy these and paste into the Achievements field below.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface AIProjectDescriptionButtonProps {
  update: (patch: Partial<Resume>) => void;
  projectIndex?: number;
}

export function AIProjectDescriptionButton({ update, projectIndex }: AIProjectDescriptionButtonProps) {
  const { actions, isLoading } = useAIResume();
  const [open, setOpen] = useState(false);
  const [generated, setGenerated] = useState('');
  const [form, setForm] = useState({ name: '', techStack: '', goal: '' });
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const description = await actions.generateProjectDescription({
        name: form.name,
        techStack: form.techStack.split(',').map(s => s.trim()).filter(Boolean),
        goal: form.goal,
      });
      setGenerated(description);
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    if (projectIndex !== undefined) {
      update({} as any);
    }
    setOpen(false);
    setGenerated('');
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1 border-slate-200 px-2 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
        onClick={() => setOpen(true)}
        disabled={isLoading}
      >
        <Sparkles size={14} /> AI Describe
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Generate Project Description
            </DialogTitle>
            <DialogDescription>
              AI will write a compelling project description from your inputs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Project Name</Label>
              <Input
                className="mt-1.5"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="E-commerce Platform"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tech Stack (comma-separated)</Label>
              <Input
                className="mt-1.5"
                value={form.techStack}
                onChange={(e) => setForm({ ...form, techStack: e.target.value })}
                placeholder="React, Node.js, PostgreSQL, Redis"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Goal / Outcome</Label>
              <Textarea
                className="mt-1.5 min-h-20"
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                placeholder="What problem did this solve? What was the impact?"
              />
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={generating || isLoading}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Description'}
            </Button>

            {generated && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Generated Description</Label>
                <Textarea
                  className="min-h-24"
                  value={generated}
                  onChange={(e) => setGenerated(e.target.value)}
                  readOnly
                />
                <Button className="w-full" onClick={handleApply} variant="default">
                  Apply to Resume
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface AISuggestSkillsButtonProps {
  resume: Resume;
  update: (patch: Partial<Resume>) => void;
}

export function AISuggestSkillsButton({ resume, update }: AISuggestSkillsButtonProps) {
  const { actions, isLoading } = useAIResume();
  const [open, setOpen] = useState(false);
  const [generated, setGenerated] = useState<SkillGroupSuggestion[]>([]);
  const [targetRole, setTargetRole] = useState('');
  const [generating, setGenerating] = useState(false);

  const currentSkills = resume.skillGroups.flatMap(g => g.items);

  const handleGenerate = async () => {
    if (!targetRole.trim()) return;
    setGenerating(true);
    try {
      const skillGroups = await actions.suggestSkills({ targetRole, currentSkills });
      setGenerated(skillGroups);
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    update({ skillGroups: generated });
    setOpen(false);
    setGenerated([]);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1 border-slate-200 px-2 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
        onClick={() => setOpen(true)}
        disabled={isLoading}
      >
        <Sparkles size={14} /> AI Skills
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Suggest Skills for Role
            </DialogTitle>
            <DialogDescription>
              AI will suggest categorized skill groups tailored to your target role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Target Role</Label>
              <Input
                className="mt-1.5"
                placeholder="e.g., Full Stack Developer, Data Scientist, DevOps Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={generating || isLoading || !targetRole.trim()}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Suggest Skills'}
            </Button>

            {generated.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Suggested Skill Groups</Label>
                <div className="max-h-60 overflow-y-auto space-y-3">
                  {generated.map((group, i) => (
                    <div key={i} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                      <p className="font-semibold text-slate-900">{group.title}</p>
                      <p className="text-sm text-slate-600 mt-1">{group.items.join(', ')}</p>
                    </div>
                  ))}
                </div>
                <Button className="w-full" onClick={handleApply} variant="default">
                  Replace All Skills
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
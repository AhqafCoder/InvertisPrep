'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LayoutDashboard, FileText, Briefcase, GraduationCap, Code, Palette, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  tags: string[];
  comingSoon: boolean;
}

const TEMPLATES: Template[] = [
  {
    id: 'ats-standard',
    name: 'ATS Standard',
    description: 'Clean, single-column layout optimized for ATS parsing. Best for corporate roles.',
    icon: <FileText className="h-6 w-6" />,
    tags: ['ATS-friendly', 'Corporate', 'All roles'],
    comingSoon: false,
  },
  {
    id: 'modern-tech',
    name: 'Modern Tech',
    description: 'Two-column layout with skill highlights. Perfect for software engineers and developers.',
    icon: <Code className="h-6 w-6" />,
    tags: ['Tech', 'Two-column', 'Developers'],
    comingSoon: true,
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Premium layout with sidebar for leadership roles. Emphasizes achievements and impact.',
    icon: <Briefcase className="h-6 w-6" />,
    tags: ['Leadership', 'Senior', 'Executive'],
    comingSoon: true,
  },
  {
    id: 'creative',
    name: 'Creative Portfolio',
    description: 'Visual layout with project showcase. Ideal for designers, marketers, and creatives.',
    icon: <Palette className="h-6 w-6" />,
    tags: ['Creative', 'Portfolio', 'Design'],
    comingSoon: true,
  },
  {
    id: 'academic',
    name: 'Academic / Research',
    description: 'Detailed layout for publications, research, and education. For academia and research roles.',
    icon: <GraduationCap className="h-6 w-6" />,
    tags: ['Academic', 'Research', 'Publications'],
    comingSoon: true,
  },
  {
    id: 'minimal',
    name: 'Minimal Fresh',
    description: 'Ultra-clean design for entry-level and career changers. Focus on potential.',
    icon: <LayoutDashboard className="h-6 w-6" />,
    tags: ['Entry-level', 'Minimal', 'Freshers'],
    comingSoon: true,
  },
];

interface TemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate?: (templateId: string) => void;
}

export function TemplatesModal({ open, onClose, onSelectTemplate }: TemplatesModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-indigo-600" />
            Resume Templates
          </DialogTitle>
          <DialogDescription>
            Choose a starting template tailored to your role and industry.
            <span className="ml-2 text-amber-600">More templates coming soon!</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4 max-h-[60vh] overflow-y-auto pr-2">
          {TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className={`relative cursor-pointer transition-all hover:shadow-lg hover:border-indigo-300 ${
                template.comingSoon ? 'opacity-60' : ''
              }`}
              onClick={() => !template.comingSoon && onSelectTemplate?.(template.id)}
            >
              {template.comingSoon && (
                <div className="absolute inset-0 bg-slate-50/80 rounded-xl flex items-center justify-center z-10 pointer-events-none">
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                </div>
              )}
              
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    {template.icon}
                  </div>
                  {!template.comingSoon && (
                    <ArrowRight className="h-5 w-5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>

                <h4 className="font-semibold text-slate-900 mb-1">{template.name}</h4>
                <p className="text-sm text-slate-600 mb-3 flex-1">{template.description}</p>

                <div className="flex flex-wrap gap-1">
                  {template.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {!template.comingSoon && (
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTemplate?.(template.id);
                      onClose();
                    }}
                  >
                    Use this template
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Don't see what you need? <Button variant="ghost" size="sm" className="text-indigo-600 hover:underline p-0">Request a template</Button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
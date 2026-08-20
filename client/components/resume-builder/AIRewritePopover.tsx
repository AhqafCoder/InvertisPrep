'use client';

import { useState, useRef, useEffect } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Check, X } from 'lucide-react';
import { useAIResume, type RewriteInstruction, REWRITE_INSTRUCTIONS } from '@/lib/aiResume';

interface AIRewritePopoverProps {
  text: string;
  onReplace: (newText: string) => void;
  disabled?: boolean;
}

export function AIRewritePopover({ text, onReplace, disabled }: AIRewritePopoverProps) {
  const { actions, isLoading } = useAIResume();
  const [open, setOpen] = useState(false);
  const [rewritten, setRewritten] = useState('');
  const [generating, setGenerating] = useState<RewriteInstruction | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleRewrite = async (instruction: RewriteInstruction) => {
    if (!text.trim()) return;
    setGenerating(instruction);
    try {
      const result = await actions.rewriteText(text, instruction);
      setRewritten(result);
    } finally {
      setGenerating(null);
    }
  };

  const handleApply = () => {
    onReplace(rewritten);
    setOpen(false);
    setRewritten('');
  };

  const handleDiscard = () => {
    setRewritten('');
  };

  if (!text.trim() || disabled) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-slate-300 hover:text-slate-400 disabled:opacity-50"
        disabled
        aria-label="AI rewrite (add text first)"
      >
        <Sparkles size={14} />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          aria-label="AI rewrite options"
        >
          <Sparkles size={14} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        ref={popoverRef}
        className="w-72 p-2"
        side="right"
        align="start"
        sideOffset={5}
      >
        <div className="space-y-1">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Rewrite with AI
          </p>

          {REWRITE_INSTRUCTIONS.map((instruction) => (
            <Button
              key={instruction.id}
              type="button"
              variant="outline"
              className="w-full justify-start gap-2 text-xs px-2 py-1.5 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600"
              onClick={() => handleRewrite(instruction.id)}
              disabled={isLoading || generating !== null}
            >
              {generating === instruction.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3 text-indigo-600" />
              )}
              <span>{instruction.label}</span>
            </Button>
          ))}

          {rewritten && (
            <div className="border-t border-slate-200 pt-2 space-y-2">
              <p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Suggestion
              </p>
              <div className="px-2 max-h-40 overflow-y-auto bg-slate-50 rounded p-2 text-sm text-slate-700">
                {rewritten}
              </div>
              <div className="px-2 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleApply}
                  disabled={isLoading}
                >
                  <Check className="h-3 w-3 mr-1" /> Apply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={handleDiscard}
                >
                  <X className="h-3 w-3 mr-1" /> Discard
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
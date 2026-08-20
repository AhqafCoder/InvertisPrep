'use client';

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { resumeApi, walletApi } from '@/lib/api';
import type { Resume, ResumeDraft, ResumeEducation, ResumeExperience, ResumeLink, ResumeProject } from '@/types';
import {
  CheckCircle2, Clock, Coins, CreditCard, Download, FileUp, Gift,
  LayoutDashboard, Loader2, Plus, Printer, Save, Shield, Sparkles, Trash2,
  Wallet, ChevronDown, ChevronUp, FileText, Settings2, Eye, ZoomIn, ZoomOut,
  Maximize2, Minimize2, Minus,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SavePromptModal } from './SavePromptModal';
import { AISidebar } from './AISidebar';
import { TemplatesModal } from './TemplatesModal';

// ─── Factories ─────────────────────────────────────────────────────────────────
const emptyEducation  = (): ResumeEducation  => ({ institution: '', degree: '', startDate: '', endDate: '' });
const emptyExperience = (): ResumeExperience => ({ company: '', role: '', description: '', achievements: [''], startDate: '', endDate: '' });
const emptyProject    = (): ResumeProject    => ({ name: '', url: '', description: '', achievements: [''], startDate: '', endDate: '' });
const emptyLink       = (): ResumeLink       => ({ label: '', url: '' });

export function createStarterResume(): ResumeDraft {
  return {
    title: 'ATS Friendly Resume',
    personal: {
      name: 'Ahqaf Ali', headline: 'Developer', email: 'beddylea@gmail.com',
      phone: '+1-555-0100', location: 'San Francisco, CA',
      links: [
        { label: 'GitHub',    url: 'github.com/ahqafcoder' },
        { label: 'LinkedIn',  url: 'linkedin.com/in/bedivere-lea' },
        { label: 'Instagram', url: 'instagram.com/ahqafali0403' },
      ],
    },
    summary: 'Resourceful Developer with 11 years of experience in designing and developing user interfaces, testing and training employees.',
    education: [
      { institution: 'New York University', degree: 'Bachelor of Computer Science', startDate: '2020-08', endDate: '2024-07' },
    ],
    experience: [
      { company: 'Torph TTC', role: 'Developer', description: 'Global software company offering UI development tools for developer applications.', achievements: ['Created and maintained 10 web applications for national and foreign clients.', 'Ensured UX met at least 80% of user expectations.', 'Created and analyzed 500 unit test cases.'], startDate: '2023-02', endDate: '2023-08' },
      { company: 'Reilty Group', role: 'Front End Web Developer', description: 'Industry-leading provider of online gambling software and solutions.', achievements: ['Increased user reach by 35% through mobile web installation.', 'Delivered 30 web solutions.'], startDate: '2022-06', endDate: '2023-01' },
    ],
    projects: [],
    skillGroups: [
      { title: 'Technical Skills', items: ['JavaScript', 'Python', 'C++', 'HTML5', 'CSS', 'SQL'] },
      { title: 'Soft Skills',      items: ['Collaboration', 'Problem-solving', 'Communication'] },
    ],
    achievements: ['Winner - Smart India Hackathon (SIH) 2025 | December 2025'],
    languages: ['English', 'Hindi'],
    certifications: ['Certified Web Professional-Web Developer'],
  };
}

function safeResume(resume: Resume): Resume {
  const isPreviousGenericTemplate =
    resume.title === 'Ahqaf Ali - Full Stack Developer' ||
    resume.summary?.startsWith('Motivated student and aspiring software developer') ||
    resume.projects?.some((p) => p.name === 'Student Portfolio Website');
  if (isPreviousGenericTemplate) return { ...resume, ...createStarterResume() };

  const personal = resume.personal ?? { name: '', headline: '', email: '', phone: '', location: '', links: [] };
  return {
    ...resume,
    title:    resume.title ?? '',
    personal: {
      name:     personal.name     ?? '',
      headline: personal.headline ?? '',
      email:    personal.email    ?? '',
      phone:    personal.phone    ?? '',
      location: personal.location ?? '',
      links:    Array.isArray(personal.links) ? personal.links.map((l) => ({ ...emptyLink(), ...l })) : [],
    },
    summary:      resume.summary ?? '',
    education:    Array.isArray(resume.education)   ? resume.education.map((i) => ({ ...emptyEducation(), ...i })) : [],
    experience:   Array.isArray(resume.experience)  ? resume.experience.map((i) => ({ ...emptyExperience(), ...i, achievements: Array.isArray(i.achievements) ? i.achievements : [] })) : [],
    projects:     Array.isArray(resume.projects)    ? resume.projects.map((i) => ({ ...emptyProject(), ...i, achievements: Array.isArray(i.achievements) ? i.achievements : [] })) : [],
    skillGroups:  Array.isArray(resume.skillGroups) ? resume.skillGroups.map((g) => ({ ...g, title: g.title ?? '', items: Array.isArray(g.items) ? g.items : [] })) : [],
    achievements: Array.isArray(resume.achievements)    ? resume.achievements    : [],
    languages:    Array.isArray(resume.languages)       ? resume.languages       : [],
    certifications: Array.isArray(resume.certifications) ? resume.certifications : [],
  };
}

function toDraft(resume: Resume): ResumeDraft {
  const { _id, createdAt, updatedAt, ...draft } = resume as any;
  return draft as ResumeDraft;
}

function safeName(v: string) {
  return (v || 'resume').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}
function formatDate(value: string) {
  if (!value) return '';
  const [year, month] = value.split('-');
  if (!month) return year;
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export const navigationFlag = { suppress: false };
const GUEST_KEY = 'resume-builder-guest-draft';
function stashGuestResume(draft: ResumeDraft) { try { localStorage.setItem(GUEST_KEY, JSON.stringify(draft)); } catch { } }
export function clearGuestResume() { localStorage.removeItem(GUEST_KEY); }

// ─── Style tokens ──────────────────────────────────────────────────────────────
const inputCls    = 'bg-white border-zinc-200 focus-visible:border-zinc-800 focus-visible:ring-zinc-100 text-sm text-zinc-800 placeholder:text-zinc-400';
const textareaCls = 'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-100 resize-none transition';

// ─── Panel width constraints ───────────────────────────────────────────────────
const MIN_LEFT  = 240;
const MAX_LEFT  = 480;
const MIN_RIGHT = 340;
const MAX_RIGHT = 640;

// ─── Main Component ─────────────────────────────────────────────────────────────
export function ResumeBuilder() {
  const { user, loading, updateUser } = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [resume, setResume]     = useState<Resume | null>(null);
  const [booting, setBooting]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [isDirty, setIsDirty]   = useState(false);
  const [savedAt, setSavedAt]   = useState<Date | null>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const firstAutosaveToastShown = useRef(false);
  const loadedIdRef             = useRef<string | null>(null);
  const importRef               = useRef<HTMLInputElement>(null);
  const idParam                 = searchParams.get('id');

  // ── Panel widths (resizable) ──
  const [leftW,  setLeftW]  = useState(300);
  const [rightW, setRightW] = useState(430);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // ── Preview zoom ──
  const ZOOM_STEPS = [50, 60, 70, 80, 90, 100, 110, 125];
  const [zoomIdx, setZoomIdx]     = useState(5); // 100%
  const [fullscreen, setFullscreen] = useState(false);
  const zoom = ZOOM_STEPS[zoomIdx];

  // ── Modals ──
  const [showTemplates,    setShowTemplates]    = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloading,      setDownloading]      = useState<'free' | 'coins' | 'razorpay' | 'watermark' | null>(null);

  // Guest load
  useEffect(() => {
    if (user) return;
    if (loadedIdRef.current) return;
    const draft = createStarterResume();
    const r: Resume = { ...draft, _id: `guest-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setResume(r);
    loadedIdRef.current = r._id;
    setBooting(false);
  }, [user]);

  // Logged-in load
  useEffect(() => {
    if (!user) return;
    if (idParam && loadedIdRef.current === idParam) return;
    let cancelled = false;
    setBooting(true);
    (async () => {
      try {
        if (idParam) {
          const result = await resumeApi.get(idParam);
          if (cancelled) return;
          if (!result.data) throw new Error('Not found');
          setResume(safeResume(result.data));
          loadedIdRef.current = idParam;
        } else {
          const list = await resumeApi.list();
          if (cancelled) return;
          const first = list.data?.[0];
          if (first) {
            setResume(safeResume(first));
            loadedIdRef.current = first._id;
            router.replace(`/resume-builder?id=${first._id}`);
          } else {
            const created = await resumeApi.create(createStarterResume());
            if (cancelled) return;
            if (!created.data) throw new Error('Could not create');
            setResume(safeResume(created.data));
            loadedIdRef.current = created.data._id;
            router.replace(`/resume-builder?id=${created.data._id}`);
          }
        }
        setIsDirty(false);
        setSavedAt(null);
      } catch {
        if (!cancelled) toast.error('Could not load your resume.');
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, idParam]);

  // Autosave
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useCallback(async (draft = resume, isAuto = false) => {
    if (!draft) return;
    if (!user) { if (!isAuto) setShowSavePrompt(true); return; }
    setSaving(true);
    try {
      await resumeApi.update(draft._id, toDraft(draft));
      setIsDirty(false);
      setSavedAt(new Date());
      if (!isAuto) toast.success('Resume saved');
      if (isAuto && !firstAutosaveToastShown.current) {
        firstAutosaveToastShown.current = true;
        toast.success('Resume autosaved');
      }
    } catch { toast.error('Could not save the resume'); }
    finally { setSaving(false); }
  }, [resume, user]);

  useEffect(() => {
    if (booting || !isDirty || !resume || !user) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => { void save(resume, true); }, 2000);
    return () => { if (saveRef.current) clearTimeout(saveRef.current); };
  }, [resume, isDirty, booting, save, user]);

  useEffect(() => {
    if (!isDirty || showSavePrompt) return;
    const handle = (e: BeforeUnloadEvent) => {
      if (navigationFlag.suppress) return;
      e.preventDefault(); e.returnValue = '';
    };
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [isDirty, showSavePrompt]);

  const update = (patch: Partial<Resume>) => {
    setResume((cur) => cur ? { ...cur, ...patch } : cur);
    setIsDirty(true);
  };
  const updatePersonal = (patch: Partial<Resume['personal']>) => {
    setResume((cur) => cur ? { ...cur, personal: { ...cur.personal, ...patch } } : cur);
    setIsDirty(true);
  };

  // ── Print ──
  const printClean = () => {
    document.documentElement.classList.add('printing-clean');
    window.print();
    const restore = () => { document.documentElement.classList.remove('printing-clean'); window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    setTimeout(restore, 3000);
  };

  const handleDownload = async (method: 'free' | 'coins' | 'razorpay' | 'watermark') => {
    if (method === 'watermark') { window.print(); setShowDownloadModal(false); return; }
    if (method === 'razorpay')  { toast.info('Razorpay coming soon!'); return; }
    if (!resume) return;
    setDownloading(method);
    try {
      const res = await walletApi.spendDownload(resume._id, method);
      if (res.success && res.data) {
        updateUser({ ...user!, qcoins: res.data.qcoins, freeDownloadsLeft: res.data.freeDownloadsLeft });
        setShowDownloadModal(false);
        toast.success(method === 'free' ? 'Free download — printing now!' : '200 QCoins spent — printing now!');
        setTimeout(printClean, 300);
      }
    } catch (err: unknown) {
      toast.error((err as any)?.response?.data?.message ?? 'Download failed');
    } finally { setDownloading(null); }
  };

  const exportJson = () => {
    if (!resume) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(toDraft(resume), null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${safeName(resume.title)}.json` });
    a.click(); URL.revokeObjectURL(url);
  };
  const importJson = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !resume) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));
        if (!imported.personal || !Array.isArray(imported.education)) throw new Error();
        setResume(safeResume({ ...resume, ...imported, _id: resume._id, createdAt: resume.createdAt, updatedAt: resume.updatedAt }));
        setIsDirty(true);
        toast.success('Resume imported. Click Save to keep it.');
      } catch { toast.error('Not a valid InvertisPrep resume file'); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // ── Drag-to-resize ──
  const startResize = (side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX     = e.clientX;
    const startLeft  = leftW;
    const startRight = rightW;
    const ws = workspaceRef.current;

    const handleEl = (e.currentTarget as HTMLElement);
    handleEl.classList.add('rb-dragging');

    const onMove = (mv: MouseEvent) => {
      const dx = mv.clientX - startX;
      if (side === 'left') {
        setLeftW(Math.min(MAX_LEFT, Math.max(MIN_LEFT, startLeft + dx)));
      } else {
        setRightW(Math.min(MAX_RIGHT, Math.max(MIN_RIGHT, startRight - dx)));
      }
    };
    const onUp = () => {
      handleEl.classList.remove('rb-dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  };

  // Apply widths as CSS variables on the workspace element
  const workspaceStyle: React.CSSProperties = {
    '--rb-left-w':  `${leftW}px`,
    '--rb-right-w': `${rightW}px`,
  } as React.CSSProperties;

  if (loading || booting || !resume) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
          <p className="text-xs font-medium text-zinc-500 tracking-wide uppercase">Loading resume…</p>
        </div>
      </div>
    );
  }

  // ── Save status ──
  const SaveStatus = () => {
    if (!user && isDirty)
      return <button onClick={() => setShowSavePrompt(true)} className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-white/15 transition"><Clock size={10} /> Not saved — Sign in</button>;
    if (saving)
      return <span className="flex items-center gap-1.5 text-[11px] text-zinc-400"><Loader2 className="animate-spin" size={10} /> Saving…</span>;
    if (!isDirty && savedAt)
      return <span className="flex items-center gap-1.5 text-[11px] text-zinc-400"><CheckCircle2 size={10} className="text-emerald-400" /> Saved {savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
    if (!isDirty)
      return <span className="flex items-center gap-1.5 text-[11px] text-zinc-400"><CheckCircle2 size={10} className="text-emerald-400" /> All saved</span>;
    return <span className="flex items-center gap-1.5 text-[11px] text-amber-400"><Clock size={10} /> Unsaved</span>;
  };

  // ── Toolbar button ──
  const TBtn = ({ onClick, icon: Icon, label, primary = false, disabled = false }: {
    onClick?: () => void; icon: React.ElementType; label: string; primary?: boolean; disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        primary
          ? 'flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-900 hover:bg-zinc-100 transition disabled:opacity-50'
          : 'flex items-center gap-1.5 rounded-md border border-white/15 bg-white/8 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/15 hover:text-white transition'
      }
    >
      <Icon size={12} />
      {label}
    </button>
  );

  return (
    <div className="rb-shell resume-builder-shell">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <header className="rb-toolbar no-print">
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white">
            <FileText size={14} className="text-zinc-900" />
          </div>
          <div className="hidden sm:block">
            <p className="text-[12px] font-semibold text-white leading-tight truncate max-w-[180px]">
              {resume.title || 'Resume Builder'}
            </p>
            <p className="text-[10px] text-zinc-500 leading-tight">AI Resume Builder</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <SaveStatus />
          <div className="h-4 w-px bg-white/10 mx-0.5" />
          <Link
            href="/resumes"
            onClick={(e) => { if (!user && isDirty) { e.preventDefault(); setPendingNavigation('/resumes'); setShowSavePrompt(true); } }}
            className="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/8 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/15 hover:text-white transition"
          >
            <LayoutDashboard size={12} /> My Resumes
          </Link>
          <TBtn onClick={() => setShowTemplates(true)} icon={Settings2} label="Templates" />
          <TBtn onClick={() => importRef.current?.click()} icon={FileUp} label="Import" />
          <TBtn onClick={exportJson} icon={Download} label="Export" />
          <TBtn onClick={() => user ? setShowDownloadModal(true) : setShowSavePrompt(true)} icon={Printer} label="PDF" />
          <div className="h-4 w-px bg-white/10 mx-0.5" />
          <button
            disabled={saving}
            onClick={() => save(resume, false)}
            className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-900 hover:bg-zinc-100 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
            Save
          </button>
          <input ref={importRef} className="hidden" type="file" accept="application/json,.json" onChange={importJson} />
        </div>
      </header>

      {/* ── Three-panel workspace ─────────────────────────────────────── */}
      <div className="rb-workspace" ref={workspaceRef} style={workspaceStyle}>

        {/* LEFT — AI Panel */}
        <div className="rb-panel rb-panel-left">
          <div className="rb-panel-header no-print">
            <span className="rb-panel-title">AI Assistant</span>
            <Sparkles size={12} className="text-zinc-400" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AISidebar resume={resume} update={update} updatePersonal={updatePersonal} />
          </div>
        </div>

        {/* Drag handle: left ↔ center */}
        <div className="rb-drag-handle no-print" onMouseDown={startResize('left')} title="Drag to resize" />

        {/* CENTER — Editor forms */}
        <div className="rb-panel rb-panel-center">
          <div className="rb-panel-header no-print">
            <span className="rb-panel-title">Editor</span>
            <span className="text-[10px] text-zinc-400 tabular-nums">
              {resume.personal.name || 'Untitled'}
            </span>
          </div>
          <ResumeEditor resume={resume} update={update} updatePersonal={updatePersonal} />
        </div>

        {/* Drag handle: center ↔ right */}
        <div className="rb-drag-handle no-print" onMouseDown={startResize('right')} title="Drag to resize" />

        {/* RIGHT — Live preview */}
        <div className={`rb-panel rb-panel-right ${fullscreen ? 'rb-fullscreen' : ''}`}>
          <ResumePreview
            resume={resume}
            zoom={zoom}
            zoomIdx={zoomIdx}
            zoomSteps={ZOOM_STEPS}
            fullscreen={fullscreen}
            onZoomIn={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            onZoomOut={() => setZoomIdx((i) => Math.max(0, i - 1))}
            onZoomReset={() => setZoomIdx(5)}
            onToggleFullscreen={() => setFullscreen((f) => !f)}
          />
        </div>

      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <DownloadModal
        open={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        qcoins={user?.qcoins ?? 0}
        freeDownloadsLeft={user?.freeDownloadsLeft ?? 0}
        downloading={downloading}
        onDownload={handleDownload}
      />
      <SavePromptModal
        open={showSavePrompt}
        onOpenChange={setShowSavePrompt}
        onSaveAndLogin={() => { if (resume) stashGuestResume(toDraft(resume)); }}
        onDiscard={() => { clearGuestResume(); setPendingNavigation(null); setShowSavePrompt(false); }}
      />
      {showTemplates && (
        <TemplatesModal
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          onSelectTemplate={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}

// ─── Download Modal ─────────────────────────────────────────────────────────────
function DownloadModal({ open, onClose, qcoins, freeDownloadsLeft, downloading, onDownload }: {
  open: boolean; onClose: () => void; qcoins: number; freeDownloadsLeft: number;
  downloading: 'free' | 'coins' | 'razorpay' | 'watermark' | null;
  onDownload: (m: 'free' | 'coins' | 'razorpay' | 'watermark') => void;
}) {
  const canFree  = freeDownloadsLeft > 0;
  const canCoins = qcoins >= 200;

  const Opt = ({ method, icon, title, subtitle, badge, disabled, accent }: {
    method: 'free' | 'coins' | 'razorpay' | 'watermark';
    icon: React.ReactNode; title: string; subtitle: React.ReactNode;
    badge?: string; disabled?: boolean; accent?: string;
  }) => {
    const busy = downloading === method;
    return (
      <button
        onClick={() => !disabled && onDownload(method)}
        disabled={disabled || downloading !== null}
        className={`group relative flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed
          ${disabled ? 'border-zinc-100 bg-zinc-50'
            : accent === 'dark' ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800'
            : 'border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-sm'}`}
      >
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
          ${accent === 'dark' ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-700'}`}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-semibold text-sm ${accent === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{title}</p>
            {badge && <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span>}
          </div>
          <p className={`mt-0.5 text-xs ${accent === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>{subtitle}</p>
        </div>
        {!disabled && !downloading && <Download className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-zinc-600 transition" />}
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Printer className="h-5 w-5" /> Download PDF</DialogTitle>
          <DialogDescription>Choose how you'd like to download your resume.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs">
          <Coins className="h-4 w-4 text-zinc-500" />
          <span className="font-semibold text-zinc-700">{qcoins.toLocaleString('en-IN')} QCoins</span>
          <span className="mx-1 text-zinc-300">·</span>
          <Gift className="h-4 w-4 text-zinc-500" />
          <span className="font-semibold text-zinc-700">{freeDownloadsLeft} free left</span>
          <Link href="/wallet" className="ml-auto flex items-center gap-1 text-zinc-600 font-medium hover:underline">
            <Wallet className="h-3 w-3" /> Top up
          </Link>
        </div>
        <div className="space-y-2">
          <Opt method="free"  icon={<Gift className="h-5 w-5" />}
            title={`Use free trial ${canFree ? `(${freeDownloadsLeft} left)` : '(none left)'}`}
            subtitle="Clean watermark-free PDF — no coins needed."
            badge={canFree ? 'FREE' : undefined} disabled={!canFree} />
          <Opt method="coins" icon={<Coins className="h-5 w-5" />}
            title={`Spend 200 QCoins ${!canCoins ? `(need ${200 - qcoins} more)` : ''}`}
            subtitle={`You have ${qcoins.toLocaleString('en-IN')} QCoins. Each clean download = 200 QC.`}
            disabled={!canCoins} />
          <Opt method="razorpay" icon={<CreditCard className="h-5 w-5" />}
            title="Pay ₹19.99"
            subtitle={<span>Razorpay coming soon — <span className="font-bold text-zinc-800">₹19.99</span></span>} />
        </div>
        <div className="relative my-1 flex items-center gap-3">
          <div className="flex-1 border-t border-zinc-200" />
          <span className="text-xs text-zinc-400">or</span>
          <div className="flex-1 border-t border-zinc-200" />
        </div>
        <Opt method="watermark" icon={<Sparkles className="h-5 w-5" />}
          title="Download with watermark"
          subtitle="Always free. InvertisPrep watermark visible on the PDF." />
        <p className="text-center text-[11px] text-zinc-400">
          <Shield className="mr-1 inline h-3 w-3" /> Watermark-free for personal use only.
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ─── Resume Editor (center panel) ─────────────────────────────────────────────
function ResumeEditor({ resume, update, updatePersonal }: {
  resume: Resume;
  update: (patch: Partial<Resume>) => void;
  updatePersonal: (patch: Partial<Resume['personal']>) => void;
}) {
  const setArray = <K extends 'education' | 'experience' | 'projects' | 'skillGroups' | 'achievements' | 'languages' | 'certifications'>(
    key: K, value: Resume[K]
  ) => update({ [key]: value } as Partial<Resume>);

  return (
    <div className="rb-editor-scroll">
      {/* Resume title */}
      <div className="rb-editor-section">
        <div className="rb-editor-section-header">
          <span className="rb-section-dot" />
          <span className="rb-section-title">Resume Title</span>
        </div>
        <div className="px-4 pb-4 pt-2">
          <Input className={inputCls} value={resume.title} onChange={(e) => update({ title: e.target.value })} placeholder="My Resume" />
        </div>
      </div>

      <EditorSection title="Personal Information">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <EInput label="Full Name"          value={resume.personal.name}     onChange={(v) => updatePersonal({ name: v })} />
          <EInput label="Professional Title" value={resume.personal.headline} onChange={(v) => updatePersonal({ headline: v })} />
          <EInput label="Phone"              value={resume.personal.phone}    onChange={(v) => updatePersonal({ phone: v })} />
          <EInput label="Email" type="email" value={resume.personal.email}   onChange={(v) => updatePersonal({ email: v })} />
          <EInput label="Location"           value={resume.personal.location} onChange={(v) => updatePersonal({ location: v })} className="sm:col-span-2" />
        </div>
      </EditorSection>

      <EditorSection title="Social Links" action={() => updatePersonal({ links: [emptyLink(), ...resume.personal.links] })}>
        {resume.personal.links.map((link, i) => (
          <div key={link._id || i} className="mb-2 grid grid-cols-[1fr_1.4fr_auto] items-center gap-1.5">
            <Input className={inputCls} placeholder="Label" value={link.label}
              onChange={(e) => updatePersonal({ links: resume.personal.links.map((l, j) => j === i ? { ...l, label: e.target.value } : l) })} />
            <Input className={inputCls} placeholder="URL" value={link.url}
              onChange={(e) => updatePersonal({ links: resume.personal.links.map((l, j) => j === i ? { ...l, url: e.target.value } : l) })} />
            <DelBtn onClick={() => updatePersonal({ links: resume.personal.links.filter((_, j) => j !== i) })} />
          </div>
        ))}
      </EditorSection>

      <EditorSection title="Professional Summary">
        <textarea className={`${textareaCls} min-h-[6.5rem]`} value={resume.summary}
          onChange={(e) => update({ summary: e.target.value })}
          placeholder="Write a concise, achievement-focused professional summary…" />
      </EditorSection>

      <EditorSection title="Education" action={() => setArray('education', [emptyEducation(), ...resume.education])}>
        {resume.education.map((item, i) => (
          <div key={item._id || i} className="rb-card">
            <div className="grid gap-2 sm:grid-cols-2">
              <EInput compact placeholder="University / School" value={item.institution} onChange={(v) => setArray('education', resume.education.map((e, j) => j === i ? { ...e, institution: v } : e))} />
              <EInput compact placeholder="Degree / Course"     value={item.degree}      onChange={(v) => setArray('education', resume.education.map((e, j) => j === i ? { ...e, degree: v } : e))} />
              <EInput compact type="month" value={item.startDate} onChange={(v) => setArray('education', resume.education.map((e, j) => j === i ? { ...e, startDate: v } : e))} />
              <EInput compact type="month" value={item.endDate}   onChange={(v) => setArray('education', resume.education.map((e, j) => j === i ? { ...e, endDate: v } : e))} />
            </div>
            <div className="mt-2 flex justify-end"><DelBtn onClick={() => setArray('education', resume.education.filter((_, j) => j !== i))} /></div>
          </div>
        ))}
      </EditorSection>

      <EditorSection title="Work Experience" action={() => setArray('experience', [emptyExperience(), ...resume.experience])}>
        {resume.experience.map((item, i) => (
          <ExperienceEditor key={item._id || i} item={item}
            onChange={(next) => setArray('experience', resume.experience.map((e, j) => j === i ? next : e))}
            onRemove={() => setArray('experience', resume.experience.filter((_, j) => j !== i))} />
        ))}
      </EditorSection>

      <EditorSection title="Projects" action={() => setArray('projects', [emptyProject(), ...resume.projects])}>
        {resume.projects.map((item, i) => (
          <ProjectEditor key={item._id || i} item={item}
            onChange={(next) => setArray('projects', resume.projects.map((e, j) => j === i ? next : e))}
            onRemove={() => setArray('projects', resume.projects.filter((_, j) => j !== i))} />
        ))}
      </EditorSection>

      <EditorSection title="Skills" action={() => setArray('skillGroups', [{ title: 'New Group', items: [] }, ...resume.skillGroups])}>
        {resume.skillGroups.map((group, i) => (
          <div key={group._id || i} className="rb-card">
            <div className="mb-2 flex gap-1.5">
              <Input className={inputCls} value={group.title}
                onChange={(e) => setArray('skillGroups', resume.skillGroups.map((g, j) => j === i ? { ...g, title: e.target.value } : g))} />
              <DelBtn onClick={() => setArray('skillGroups', resume.skillGroups.filter((_, j) => j !== i))} />
            </div>
            <TagEditor values={group.items}
              onChange={(items) => setArray('skillGroups', resume.skillGroups.map((g, j) => j === i ? { ...g, items } : g))} />
          </div>
        ))}
      </EditorSection>

      <EditorSection title="Achievements">
        <TagEditor values={resume.achievements} onChange={(v) => setArray('achievements', v)} />
      </EditorSection>
      <EditorSection title="Languages">
        <TagEditor values={resume.languages} onChange={(v) => setArray('languages', v)} />
      </EditorSection>
      <EditorSection title="Certifications">
        <TagEditor values={resume.certifications} onChange={(v) => setArray('certifications', v)} />
      </EditorSection>
      <div className="h-10" />
    </div>
  );
}

// ─── Editor helpers ────────────────────────────────────────────────────────────
function EditorSection({ title, children, action }: { title: string; children: React.ReactNode; action?: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rb-editor-section">
      <div className="rb-editor-section-header" onClick={() => setOpen(!open)} role="button">
        <span className="rb-section-dot" />
        <span className="rb-section-title">{title}</span>
        <div className="ml-auto flex items-center gap-2">
          {action && open && (
            <button type="button" onClick={(e) => { e.stopPropagation(); action(); }}
              className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-500 hover:border-zinc-400 hover:text-zinc-800 transition">
              <Plus size={10} /> Add
            </button>
          )}
          {open ? <ChevronUp size={12} className="text-zinc-400" /> : <ChevronDown size={12} className="text-zinc-400" />}
        </div>
      </div>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </section>
  );
}

function EInput({ label, compact, className, ...props }: {
  label?: string; compact?: boolean; className?: string;
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      {label && <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</span>}
      <Input className={`${inputCls} ${compact ? 'h-8' : ''}`} {...props} onChange={(e) => props.onChange(e.target.value)} />
    </label>
  );
}

function DelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Remove"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 transition">
      <Trash2 size={13} />
    </button>
  );
}

function TagEditor({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex gap-1.5">
          <Input className={inputCls} value={v} placeholder="Add an item"
            onChange={(e) => onChange(values.map((x, j) => j === i ? e.target.value : x))} />
          <DelBtn onClick={() => onChange(values.filter((_, j) => j !== i))} />
        </div>
      ))}
      <button type="button" onClick={() => onChange(['', ...values])}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-[11px] font-medium text-zinc-500 hover:border-zinc-600 hover:bg-zinc-50 hover:text-zinc-700 transition">
        <Plus size={11} /> Add item
      </button>
    </div>
  );
}

function ExperienceEditor({ item, onChange, onRemove }: { item: ResumeExperience; onChange: (i: ResumeExperience) => void; onRemove: () => void }) {
  return (
    <div className="rb-card">
      <div className="grid gap-2 sm:grid-cols-2">
        <EInput compact placeholder="Company"   value={item.company}   onChange={(v) => onChange({ ...item, company: v })} />
        <EInput compact placeholder="Role"      value={item.role}      onChange={(v) => onChange({ ...item, role: v })} />
        <EInput compact type="month" value={item.startDate} onChange={(v) => onChange({ ...item, startDate: v })} />
        <EInput compact type="month" value={item.endDate}   onChange={(v) => onChange({ ...item, endDate: v })} />
      </div>
      <textarea className={`${textareaCls} mt-2.5 min-h-[4rem]`} value={item.description} placeholder="Company / role description (optional)"
        onChange={(e) => onChange({ ...item, description: e.target.value })} />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Key Achievements</p>
      <textarea className={`${textareaCls} mt-1 min-h-[5rem]`} value={item.achievements.join('\n')} placeholder="One achievement per line…"
        onChange={(e) => onChange({ ...item, achievements: e.target.value.split('\n') })} />
      <div className="mt-2 flex justify-end"><DelBtn onClick={onRemove} /></div>
    </div>
  );
}

function ProjectEditor({ item, onChange, onRemove }: { item: ResumeProject; onChange: (i: ResumeProject) => void; onRemove: () => void }) {
  return (
    <div className="rb-card">
      <div className="grid gap-2 sm:grid-cols-2">
        <EInput compact placeholder="Project Name" value={item.name}      onChange={(v) => onChange({ ...item, name: v })} />
        <EInput compact placeholder="URL"          value={item.url}       onChange={(v) => onChange({ ...item, url: v })} />
        <EInput compact type="month" value={item.startDate} onChange={(v) => onChange({ ...item, startDate: v })} />
        <EInput compact type="month" value={item.endDate}   onChange={(v) => onChange({ ...item, endDate: v })} />
      </div>
      <textarea className={`${textareaCls} mt-2.5 min-h-[4rem]`} value={item.description} placeholder="Project description"
        onChange={(e) => onChange({ ...item, description: e.target.value })} />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Key Achievements</p>
      <textarea className={`${textareaCls} mt-1 min-h-[5rem]`} value={item.achievements.join('\n')} placeholder="One achievement per line…"
        onChange={(e) => onChange({ ...item, achievements: e.target.value.split('\n') })} />
      <div className="mt-2 flex justify-end"><DelBtn onClick={onRemove} /></div>
    </div>
  );
}

// ─── Resume Preview (right panel) ─────────────────────────────────────────────
function ResumePreview({
  resume, zoom, zoomIdx, zoomSteps, fullscreen,
  onZoomIn, onZoomOut, onZoomReset, onToggleFullscreen,
}: {
  resume: Resume;
  zoom: number;
  zoomIdx: number;
  zoomSteps: number[];
  fullscreen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleFullscreen: () => void;
}) {
  const p = resume.personal;
  const hasLeft = resume.summary || resume.education.length
    || resume.skillGroups.some((g) => g.items.some(Boolean))
    || resume.achievements.some(Boolean) || resume.languages.some(Boolean)
    || resume.certifications.some(Boolean);
  const tiles = Array.from({ length: 60 });

  return (
    <div className="rb-preview-scroll">
      {/* Preview header */}
      <div className="rb-preview-header no-print">
        <div className="flex items-center gap-2">
          <Eye size={11} className="text-zinc-400" />
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Live Preview</span>
        </div>

        {/* Zoom cluster + fullscreen */}
        <div className="flex items-center gap-2">
          <div className="rb-zoom-cluster">
            <button className="rb-zoom-btn" onClick={onZoomOut} disabled={zoomIdx === 0} title="Zoom out">
              <Minus size={12} />
            </button>
            <button className="rb-zoom-label" onClick={onZoomReset} title="Reset zoom" style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}>
              {zoom}%
            </button>
            <button className="rb-zoom-btn" onClick={onZoomIn} disabled={zoomIdx === zoomSteps.length - 1} title="Zoom in">
              <Plus size={12} />
            </button>
          </div>

          <button
            onClick={onToggleFullscreen}
            className="flex items-center justify-center w-7 h-7 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-800 hover:text-zinc-900 transition"
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen preview'}
          >
            {fullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* A4 stage */}
      <div className="rb-preview-stage">
        {/* Print watermark */}
        <div className="resume-print-watermark" aria-hidden="true">INVERTISPREP</div>

        <div style={{
          transformOrigin: 'top center',
          transform: `scale(${zoom / 100})`,
          // Collapse the phantom space left behind by CSS scale at zoom < 100
          ...(zoom !== 100 && { marginBottom: `calc((${zoom / 100} - 1) * 11.69in)` }),
        }}>
          <article
            className="resume-page mx-auto bg-white text-black shadow-2xl"
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
          >
            {/* Diagonal watermark */}
            <div className="resume-preview-watermark" aria-hidden="true">
              <div className="resume-preview-watermark-inner">
                {tiles.map((_, i) => <span key={i}>INVERTISPREP</span>)}
              </div>
            </div>

            <header className="border-b border-zinc-300 pb-3 text-center">
              <h1 className="text-[22px] font-bold uppercase tracking-wide">{p.name || 'Your Name'}</h1>
              {p.headline && <p className="mt-0.5 text-[15px]">{p.headline}</p>}
              <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px]">
                {p.phone    && <span>{p.phone}</span>}
                {p.email    && <span>{p.email}</span>}
                {p.location && <span>{p.location}</span>}
              </div>
              {p.links.some((l) => l.url) && (
                <div className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px]">
                  {p.links.filter((l) => l.url).map((l, i) => (
                    <span key={l._id || i}>{l.label ? `${l.label}: ` : ''}{l.url.replace(/^https?:\/\//, '')}</span>
                  ))}
                </div>
              )}
            </header>

            <div className={hasLeft && (resume.experience.length || resume.projects.length) ? 'grid grid-cols-[31%_1fr] gap-7 pt-4' : 'pt-4'}>
              {hasLeft && (
                <aside>
                  {resume.summary && <PSection title="Summary"><p>{resume.summary}</p></PSection>}
                  {resume.education.length > 0 && (
                    <PSection title="Education">
                      {resume.education.map((e, i) => (
                        <div key={e._id || i} className="mb-3">
                          <p className="font-bold">{e.institution}</p>
                          <p>{e.degree}</p>
                          <DateLine start={e.startDate} end={e.endDate} />
                        </div>
                      ))}
                    </PSection>
                  )}
                  {resume.skillGroups.filter((g) => g.items.some(Boolean)).map((g, i) => (
                    <PSection key={g._id || i} title={g.title}><p>{g.items.filter(Boolean).join(', ')}</p></PSection>
                  ))}
                  {resume.achievements.some(Boolean) && (
                    <PSection title="Achievements">
                      <ul>{resume.achievements.filter(Boolean).map((a, i) => <li key={i}>• {a}</li>)}</ul>
                    </PSection>
                  )}
                  {resume.languages.some(Boolean) && (
                    <PSection title="Languages"><p>{resume.languages.filter(Boolean).join(', ')}</p></PSection>
                  )}
                  {resume.certifications.some(Boolean) && (
                    <PSection title="Certifications">
                      <ul>{resume.certifications.filter(Boolean).map((c, i) => <li key={i}>• {c}</li>)}</ul>
                    </PSection>
                  )}
                </aside>
              )}

              {(resume.experience.length || resume.projects.length) ? (
                <main>
                  {resume.experience.length > 0 && (
                    <PSection title="Work Experience">
                      {resume.experience.map((item, i) => <ExpPreview key={item._id || i} item={item} />)}
                    </PSection>
                  )}
                  {resume.projects.length > 0 && (
                    <PSection title="Projects">
                      {resume.projects.map((item, i) => (
                        <div key={item._id || i} className="mb-4">
                          <div className="flex justify-between gap-3">
                            <p className="font-bold">{item.name}</p>
                            <DateLine start={item.startDate} end={item.endDate} />
                          </div>
                          {item.url && <p className="text-[10px]">{item.url}</p>}
                          {item.description && <p className="mt-1">{item.description}</p>}
                          <AchList items={item.achievements} />
                        </div>
                      ))}
                    </PSection>
                  )}
                </main>
              ) : null}
            </div>
            <footer className="resume-watermark">Made with www.invertisprep.in</footer>
          </article>
        </div>
      </div>
    </div>
  );
}

// ─── Preview helpers ──────────────────────────────────────────────────────────
function PSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="mb-1 border-b-2 border-zinc-300 pb-0.5 text-[15px] font-bold">{title}</h2>
      <div className="resume-content">{children}</div>
    </section>
  );
}
function DateLine({ start, end }: { start: string; end: string }) {
  const text = [formatDate(start), formatDate(end)].filter(Boolean).join(' — ');
  return text ? <span className="shrink-0 whitespace-nowrap text-[11px]">{text}</span> : null;
}
function AchList({ items }: { items: string[] }) {
  const vals = items.filter(Boolean);
  return vals.length ? <ul className="mt-1 list-disc pl-4">{vals.map((v, i) => <li key={i}>{v}</li>)}</ul> : null;
}
function ExpPreview({ item }: { item: ResumeExperience }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between gap-3">
        <p className="font-bold">{item.company}</p>
        <DateLine start={item.startDate} end={item.endDate} />
      </div>
      <p className="font-semibold">{item.role}</p>
      {item.description && <p className="mt-1">{item.description}</p>}
      <AchList items={item.achievements} />
    </div>
  );
}

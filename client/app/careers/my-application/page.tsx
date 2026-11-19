'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileDown,
  GraduationCap,
  Hourglass,
  MapPin,
  Phone,
  RefreshCw,
  Sparkles,
  UserRound,
  XCircle,
} from 'lucide-react';

import { careerApi } from '@/lib/api';
import { CAREER_STATUS_META, CAREER_STATUS_STEPS } from '@/lib/career-status';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { CareerApplicationSelf, CareerApplicationStatus } from '@/types';

const STATUS_META = CAREER_STATUS_META;
const STEPS = CAREER_STATUS_STEPS;

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Horizontal stepper: Submitted → Under review → Shortlisted → Hired.
function StatusStepper({ status }: { status: CareerApplicationStatus }) {
  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
        <XCircle className="h-4 w-4" />
        Application closed — not selected
      </div>
    );
  }
  const currentIdx = STEPS.indexOf(status);
  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        return (
          <div key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : current
                      ? `border-transparent text-white ${STATUS_META[step].dot}`
                      : 'border-slate-200 bg-white text-slate-300'
                }`}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>
              <span
                className={`whitespace-nowrap text-[10px] font-semibold ${
                  done || current ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {STATUS_META[step].label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1.5 mb-4 h-0.5 flex-1 rounded-full ${
                  i < currentIdx ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// One label/value row in the details grid.
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
          {icon}
        </span>
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ApplicationCard({ app }: { app: CareerApplicationSelf }) {
  const meta = STATUS_META[app.status] ?? STATUS_META.pending;
  const location =
    app.currentLocation === 'Other' && app.customLocation
      ? app.customLocation
      : app.currentLocation;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Card header — domain + status */}
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-base font-black tracking-tight text-slate-900">
            {app.appliedDomain}
          </h2>
          <p className="text-xs text-slate-500">Applied on {formatDate(app.createdAt)}</p>
        </div>
        <Badge className={`w-fit shrink-0 px-2.5 py-1 text-xs font-bold ${meta.badge}`}>
          {meta.label}
        </Badge>
      </div>

      {/* What happens next */}
      <div className={`mx-5 mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${meta.strip}`}>
        {meta.blurb}
      </div>

      {/* Progress stepper */}
      <div className="px-5 py-5">
        <StatusStepper status={app.status} />
      </div>

      {/* Full application details — everything the applicant submitted */}
      <div className="space-y-3 border-t border-slate-100 px-5 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailSection icon={<UserRound className="h-4 w-4" />} title="Applicant">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailRow label="Full name" value={app.fullName} />
              <DetailRow label="Email" value={app.email} />
              <DetailRow label="WhatsApp" value={app.whatsappNumber} />
              <DetailRow
                label="Department / Branch"
                value={
                  <span className="flex items-center gap-1" title={app.departmentBranch}>
                    <GraduationCap className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {app.departmentBranch}
                  </span>
                }
              />
              <DetailRow label="Semester" value={app.currentSemester} />
              <DetailRow
                label="Location"
                value={
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {location}
                  </span>
                }
              />
            </div>
          </DetailSection>

          <DetailSection icon={<Briefcase className="h-4 w-4" />} title="Role & availability">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailRow label="Domain" value={app.appliedDomain} />
              <DetailRow label="Hybrid work" value={app.hybridComfortable ? 'Comfortable' : 'Not comfortable'} />
              <DetailRow
                label="Availability"
                value={
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {app.availability}
                  </span>
                }
              />
              <DetailRow label="Proficiency" value={app.proficiencyLevel} />
            </div>
          </DetailSection>

          <DetailSection icon={<FileDown className="h-4 w-4" />} title="Links">
            <div className="grid grid-cols-1 gap-3">
              <a
                href={app.resumeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                <FileDown className="h-4 w-4 shrink-0" />
                View resume
                <ExternalLink className="h-3 w-3" />
              </a>
              {app.portfolioLink && (
                <a
                  href={app.portfolioLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  View portfolio
                </a>
              )}
            </div>
          </DetailSection>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DetailSection icon={<Sparkles className="h-4 w-4" />} title="Skills">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{app.skills}</p>
            {app.hasProjects && app.projectDescription && (
              <>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Projects
                </p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {app.projectDescription}
                </p>
              </>
            )}
          </DetailSection>

          <DetailSection icon={<CheckCircle2 className="h-4 w-4" />} title="Why InvertisPrep">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {app.interestReason}
            </p>
          </DetailSection>
        </div>

        {(app.additionalNotes || app.heardFrom) && (
          <DetailSection icon={<Phone className="h-4 w-4" />} title="Extra info">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailRow
                label="Heard from"
                value={
                  app.heardFrom === 'Other' && app.customHeardFrom ? app.customHeardFrom : app.heardFrom
                }
              />
              {app.additionalNotes && <DetailRow label="Additional notes" value={app.additionalNotes} />}
            </div>
          </DetailSection>
        )}
      </div>

      {/* Review footer — set from the admin panel when the team acts on it */}
      {(app.reviewedAt || app.reviewedBy?.name) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
          <Hourglass className="h-3.5 w-3.5 text-slate-400" />
          Reviewed on {formatDate(app.reviewedAt)}
          {app.reviewedBy?.name ? ` by ${app.reviewedBy.name}` : ''} — status is updated by the
          InvertisPrep team from the admin panel.
        </div>
      )}
    </div>
  );
}

export default function MyApplicationPage() {
  const { user, loading: authLoading } = useAuth();

  const [applications, setApplications] = useState<CareerApplicationSelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await careerApi.getMine();
      if (res.success && Array.isArray(res.data)) {
        setApplications(res.data);
      } else {
        setError(res.message || 'Failed to load your application');
      }
    } catch {
      setError('Failed to load your application. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) fetchApplications();
  }, [authLoading, user, fetchApplications]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">My Application</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track the status of the application you submitted to join InvertisPrep.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchApplications}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/careers">
              <ArrowLeft className="h-3.5 w-3.5" /> Careers
            </Link>
          </Button>
        </div>
      </div>

      {/* Not signed in — the tracking page only works with an account */}
      {!authLoading && !user ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Briefcase className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">Sign in to view your application</p>
          <p className="max-w-sm text-xs text-slate-400">
            Your career application status is tied to your InvertisPrep account.
          </p>
          <Button asChild size="sm" className="mt-1">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      ) : loading && applications.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
          <Button variant="outline" size="sm" onClick={fetchApplications} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Briefcase className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">No application yet</p>
          <p className="max-w-sm text-xs text-slate-400">
            Want to join the team? Apply for a role and track your application here.
          </p>
          <Button asChild size="sm" className="mt-1">
            <Link href="/careers/apply">Apply now</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {applications.map((app) => (
            <ApplicationCard key={app._id} app={app} />
          ))}
          <p className="text-center text-xs text-slate-400">
            Interested in another role?{' '}
            <Link href="/careers/apply" className="font-semibold text-indigo-600 hover:underline">
              Apply again
            </Link>{' '}
            — each application is tracked separately.
          </p>
        </div>
      )}
    </div>
  );
}

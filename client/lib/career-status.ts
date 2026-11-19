import type { CareerApplicationStatus } from '@/types';

// Shared career-application status styling — the navbar chip, the careers
// landing banner and the /careers/my-application tracking page all render the
// same statuses, so labels, colors and copy live here in one place.

export interface CareerStatusMeta {
  label: string;
  badge: string;
  dot: string;
  /** Full-width "what happens next" strip styling. */
  strip: string;
  blurb: string;
}

export const CAREER_STATUS_META: Record<CareerApplicationStatus, CareerStatusMeta> = {
  pending: {
    label: 'Pending',
    badge: 'bg-yellow-100 text-yellow-800',
    dot: 'bg-yellow-500',
    strip: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    blurb:
      'Your application is in. Our team reviews applications on a rolling basis — you will get an email when there is an update.',
  },
  under_review: {
    label: 'Under review',
    badge: 'bg-blue-100 text-blue-800',
    dot: 'bg-blue-500',
    strip: 'border-blue-200 bg-blue-50 text-blue-800',
    blurb: 'Your application is being reviewed by the team right now. Hang tight!',
  },
  shortlisted: {
    label: 'Shortlisted',
    badge: 'bg-purple-100 text-purple-800',
    dot: 'bg-purple-500',
    strip: 'border-purple-200 bg-purple-50 text-purple-800',
    blurb:
      'Great news — you have been shortlisted! We will reach out to you shortly about the next steps.',
  },
  rejected: {
    label: 'Not selected',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    strip: 'border-red-200 bg-red-50 text-red-700',
    blurb:
      'This application was not selected this time. Do not be discouraged — you can apply again for another role anytime.',
  },
  hired: {
    label: 'Hired',
    badge: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-500',
    strip: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    blurb:
      'Welcome aboard! Your application has been accepted — the team will contact you shortly.',
  },
};

export const CAREER_STATUS_STYLES = Object.fromEntries(
  Object.entries(CAREER_STATUS_META).map(([k, m]) => [k, m.badge])
) as Record<CareerApplicationStatus, string>;

export const CAREER_STATUS_LABELS = Object.fromEntries(
  Object.entries(CAREER_STATUS_META).map(([k, m]) => [k, m.label])
) as Record<CareerApplicationStatus, string>;

// Progress path for the tracker — rejected is an off-path terminal.
export const CAREER_STATUS_STEPS: CareerApplicationStatus[] = [
  'pending',
  'under_review',
  'shortlisted',
  'hired',
];

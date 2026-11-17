import { PYQBrowser } from './PYQBrowser';
import type { Department } from '@/types';

// Server-only env var (no NEXT_PUBLIC_ prefix → never in the browser bundle).
const API_URL = process.env.API_URL;

// Departments change ~never — cache for an hour at the Next data-cache layer
// so the backend sees one request per TTL regardless of traffic.
export const revalidate = 3600;

/**
 * Server-rendered department grid. Content ships in the initial HTML
 * (instant paint + SEO); the client component below takes over purely for
 * interactivity (search box). If the API is unreachable at render time we
 * degrade gracefully to the client-side fetch path.
 */
export default async function PYQBrowsePage() {
  let initialDepartments: Department[] | null = null;
  try {
    const res = await fetch(`${API_URL}/departments`, {
      next: { revalidate: 3600, tags: ['departments'] },
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: unknown };
      if (Array.isArray(json.data)) initialDepartments = json.data as Department[];
    }
  } catch {
    // Backend unavailable — the browser component fetches client-side instead.
  }

  return <PYQBrowser initialDepartments={initialDepartments} />;
}

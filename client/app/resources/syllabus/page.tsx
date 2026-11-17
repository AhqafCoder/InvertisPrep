import { SyllabusBrowser, type Syllabus } from './SyllabusBrowser';

// Server-only env var (no NEXT_PUBLIC_ prefix → never in the browser bundle).
const API_URL = process.env.API_URL;

export const revalidate = 3600;

/**
 * Server-rendered syllabus table — ships in the initial HTML (instant paint
 * + SEO) instead of a skeleton. Revalidate hourly; the client component
 * falls back to its own fetch if the backend is unreachable at render time.
 */
export default async function SyllabusPage() {
  let initialSyllabus: Syllabus[] | null = null;
  try {
    const res = await fetch(`${API_URL}/syllabus`, {
      next: { revalidate: 3600, tags: ['syllabus'] },
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: unknown };
      if (Array.isArray(json.data)) initialSyllabus = json.data as Syllabus[];
    }
  } catch {
    // Backend unavailable — SyllabusBrowser fetches client-side instead.
  }

  return <SyllabusBrowser initialSyllabus={initialSyllabus} />;
}

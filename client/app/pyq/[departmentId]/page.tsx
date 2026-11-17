import { PYQDepartmentBrowser, type PyqInitialData } from './PYQDepartmentBrowser';
import type { Department, Branch, PYQPaper, Session } from '@/types';

// Server-only env vars (no NEXT_PUBLIC_ prefix → never in the browser bundle).
const API_URL = process.env.API_URL;
const PDF_API_URL = process.env.PDF_API_URL;

/**
 * Server-rendered PYQ listing. The old client version waterfalled four
 * sequential requests (department → branches → papers, plus sessions) behind
 * a loading skeleton; here the whole chain runs server-side (dept first,
 * then the rest in parallel) and the resulting HTML ships in the first
 * response — instant paint for users and crawlable content for SEO.
 *
 * Revalidate windows keep backend load flat: one upstream request per TTL per
 * URL at the Next data cache, regardless of traffic. Papers change as uploads
 * land, so they revalidate faster (60s) than the near-static catalog data.
 *
 * On any failure we pass null for the missing pieces and the client component
 * falls back to its original client-side fetch path — the page never breaks.
 */
export default async function DepartmentPYQPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = await params;
  const initial = await loadInitialData(departmentId);
  return <PYQDepartmentBrowser departmentId={departmentId} initial={initial} />;
}

const parseData = async (res: Response): Promise<unknown> => {
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as { data?: unknown } | null;
  return json?.data ?? null;
};

async function loadInitialData(departmentId: string): Promise<PyqInitialData | null> {
  try {
    // Resolve the slug (e.g. "btech") to the department document — papers and
    // branches are keyed by the department's ObjectId in the DB.
    const deptRes = await fetch(`${API_URL}/departments/${encodeURIComponent(departmentId)}`, {
      next: { revalidate: 3600, tags: ['departments'] },
    });
    const department = (await parseData(deptRes)) as Department | null;
    if (!department?._id) return null;

    const [branches, papers, sessions] = await Promise.all([
      fetch(`${API_URL}/departments/${department._id}/branches`, {
        next: { revalidate: 3600, tags: ['departments'] },
      }).then(parseData) as Promise<Branch[] | null>,
      fetch(`${PDF_API_URL}/pyq?departmentId=${department._id}`, {
        next: { revalidate: 60, tags: ['papers'] },
      }).then(parseData) as Promise<PYQPaper[] | null>,
      fetch(`${API_URL}/sessions`, {
        next: { revalidate: 3600, tags: ['sessions'] },
      }).then(parseData) as Promise<Session[] | null>,
    ]);

    return {
      department,
      branches: Array.isArray(branches) ? branches : null,
      papers: Array.isArray(papers) ? papers : null,
      sessions: Array.isArray(sessions) ? sessions : null,
    };
  } catch {
    return null;
  }
}

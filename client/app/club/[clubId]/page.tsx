import { ClubDetail } from './ClubDetail';
import type { Club as ClubModel } from '@/types';

// Server-only env var (no NEXT_PUBLIC_ prefix → never in the browser bundle).
const API_URL = process.env.API_URL;

export const revalidate = 3600;

/**
 * Server-rendered club detail — the club and the sibling list ship in the
 * initial HTML instead of waiting on client fetches. Falls back to the
 * client component's static seed path when the backend is unreachable.
 */
export default async function ClubDetailPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;

  let initialClub: ClubModel | null = null;
  let initialClubs: ClubModel[] | null = null;
  try {
    const [clubRes, clubsRes] = await Promise.all([
      fetch(`${API_URL}/clubs/${encodeURIComponent(clubId)}`, {
        next: { revalidate: 3600, tags: ['clubs'] },
      }),
      fetch(`${API_URL}/clubs`, {
        next: { revalidate: 3600, tags: ['clubs'] },
      }),
    ]);
    if (clubRes.ok) {
      const json = (await clubRes.json()) as { data?: unknown };
      if (json.data && typeof json.data === 'object') initialClub = json.data as ClubModel;
    }
    if (clubsRes.ok) {
      const json = (await clubsRes.json()) as { data?: unknown };
      if (Array.isArray(json.data) && json.data.length > 0) initialClubs = json.data as ClubModel[];
    }
  } catch {
    // Backend unavailable — ClubDetail falls back to the static seed list.
  }

  return <ClubDetail clubId={clubId} initialClub={initialClub} initialClubs={initialClubs} />;
}

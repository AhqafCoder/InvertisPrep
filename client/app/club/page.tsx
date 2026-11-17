import { ClubDirectory } from './ClubDirectory';
import type { Club as ClubModel } from '@/types';

// Server-only env var (no NEXT_PUBLIC_ prefix → never in the browser bundle).
const API_URL = process.env.API_URL;

export const revalidate = 3600;

/**
 * Server-rendered club directory — clubs ship in the initial HTML so the
 * animated hero and grid paint instantly (previously the page flashed the
 * static seed list before API data replaced it). Revalidate hourly; if the
 * backend is unreachable the client component keeps its static fallback.
 */
export default async function ClubPage() {
  let initialClubs: ClubModel[] | null = null;
  try {
    const res = await fetch(`${API_URL}/clubs`, {
      next: { revalidate: 3600, tags: ['clubs'] },
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: unknown };
      if (Array.isArray(json.data) && json.data.length > 0) {
        initialClubs = json.data as ClubModel[];
      }
    }
  } catch {
    // Backend unavailable — ClubDirectory falls back to the static seed list.
  }

  return <ClubDirectory initialClubs={initialClubs} />;
}

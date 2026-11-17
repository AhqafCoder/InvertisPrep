import { EventsBrowser } from './EventsBrowser';
import type { InvertisEvent } from '@/types';

// Server-only env var (no NEXT_PUBLIC_ prefix → never in the browser bundle).
const API_URL = process.env.API_URL;

export const revalidate = 300;

/**
 * Server-rendered events listing — the billboard, "Happening Next" rail and
 * event cards all ship in the initial HTML instead of pulsing skeletons while
 * the browser fetches. Revalidate every 5 minutes so the backend sees one
 * request per TTL regardless of traffic; if the API is unreachable the client
 * component falls back to its own fetch path.
 */
export default async function EventsPage() {
  let initialEvents: InvertisEvent[] | null = null;
  try {
    const res = await fetch(`${API_URL}/events`, {
      next: { revalidate: 300, tags: ['events'] },
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: unknown };
      if (Array.isArray(json.data)) initialEvents = json.data as InvertisEvent[];
    }
  } catch {
    // Backend unavailable — EventsBrowser fetches client-side instead.
  }

  return <EventsBrowser initialEvents={initialEvents} />;
}

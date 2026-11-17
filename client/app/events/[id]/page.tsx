import { EventDetailClient } from './EventDetailClient';
import type { InvertisEvent } from '@/types';

// Server-only env var (no NEXT_PUBLIC_ prefix → never in the browser bundle).
const API_URL = process.env.API_URL;

export const revalidate = 300;

/**
 * Server-rendered event detail — full event content ships in the initial
 * HTML instead of a spinner. The client component takes over only for
 * interactivity (share button) and falls back to its own fetch if the server
 * couldn't reach the backend.
 */
export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let initialEvent: InvertisEvent | null = null;
  try {
    const res = await fetch(`${API_URL}/events/${encodeURIComponent(id)}`, {
      next: { revalidate: 300, tags: ['events'] },
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: unknown };
      if (json.data && typeof json.data === 'object') {
        initialEvent = json.data as InvertisEvent;
      }
    }
  } catch {
    // Backend unavailable — EventDetailClient fetches client-side instead.
  }

  return <EventDetailClient eventId={id} initialEvent={initialEvent} />;
}

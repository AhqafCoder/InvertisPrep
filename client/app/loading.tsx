// Root navigation boundary. Without this file, App Router clicks sat on the
// old page with zero feedback while the target route's payload was in flight —
// on a slow backend that reads as "clicking does nothing". This spinner shows
// the instant a navigation starts, on every route that has no closer boundary.
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-slate-50">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600"
        role="status"
        aria-label="Loading page"
      />
      <p className="text-sm font-medium text-slate-400">Loading…</p>
    </div>
  );
}

/**
 * Formats a date string (ISO or any Date-parseable) into a human-friendly
 * relative time string (e.g. "just now", "5 min ago", "3h ago", "Mar 15").
 *
 * Pure function — no dependencies, only native Date arithmetic.
 */
export function formatRelativeTime(dateStr: string | Date): string {
    const date   = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const now    = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffS  = Math.floor(diffMs / 1000);
    const diffM  = Math.floor(diffS / 60);
    const diffH  = Math.floor(diffM / 60);
    const diffD  = Math.floor(diffH / 24);
    const diffW  = Math.floor(diffD / 7);

    if (diffS < 60)  return 'just now';
    if (diffM < 60)  return `${diffM} min ago`;
    if (diffH < 24)  return `${diffH}h ago`;
    if (diffD === 1) return 'yesterday';
    if (diffD < 7)   return `${diffD} days ago`;
    if (diffW === 1) return '1 week ago';
    if (diffW < 5)   return `${diffW} weeks ago`;

    // Fall back to a short absolute date for older entries
    return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

/**
 * Formats a date as a full readable string for tooltips / aria labels.
 * e.g. "March 15, 2026 at 2:30 PM"
 */
export function formatAbsoluteDate(dateStr: string | Date): string {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleString('en-CA', {
        month: 'long',
        day:   'numeric',
        year:  'numeric',
        hour:  'numeric',
        minute: '2-digit',
    });
}

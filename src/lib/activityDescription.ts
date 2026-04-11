/**
 * Cleans activity log descriptions for dashboard display: removes IP / "from …" tails
 * and normalizes "worker" phrasing to "employee" where appropriate.
 */
export function sanitizeActivityDescription(description: string | null | undefined): string {
  if (!description) return '';
  let s = description.trim();
  // IPv4 with optional port
  s = s.replace(/\s+from\s+(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/gi, '');
  // IPv6 (loose match for typical logged formats)
  s = s.replace(/\s+from\s+(?:[0-9a-f]{0,4}:){2,}[0-9a-f:.]+%?(?:\d+)?\b/gi, '');
  s = s.replace(/\s+from\s+Unknown\b/gi, '');
  s = s.replace(/\bUpdated worker\b/gi, 'Updated employee');
  s = s.replace(/\bCreated worker\b/gi, 'Created employee');
  s = s.replace(/\bDeleted worker\b/gi, 'Deleted employee');
  s = s.replace(/\bworker "([^"]+)"/gi, 'employee "$1"');
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

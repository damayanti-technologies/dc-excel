/**
 * Generates a unique, collision-resistant identifier.
 * Uses crypto.randomUUID() with a timestamped pseudorandom fallback.
 */
export function generateId(prefix?: string): string {
  let uniquePart: string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uniquePart = crypto.randomUUID();
  } else {
    uniquePart = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  }
  return prefix ? `${prefix}_${uniquePart}` : uniquePart;
}

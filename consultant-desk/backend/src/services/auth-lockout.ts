type LockState = {
  fails: number;
  lockedUntil: number;
};

const byKey = new Map<string, LockState>();

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export function lockoutKey(email: string, ip: string): string {
  return `${email.trim().toLowerCase()}|${ip}`;
}

export function isLocked(key: string): { locked: boolean; retryAfterSec: number } {
  const cur = byKey.get(key);
  if (!cur) return { locked: false, retryAfterSec: 0 };
  const now = Date.now();
  if (cur.lockedUntil > now) {
    return {
      locked: true,
      retryAfterSec: Math.max(1, Math.ceil((cur.lockedUntil - now) / 1000)),
    };
  }
  return { locked: false, retryAfterSec: 0 };
}

export function recordAuthFailure(key: string): void {
  const now = Date.now();
  const cur = byKey.get(key);
  if (!cur || now > cur.lockedUntil + WINDOW_MS) {
    byKey.set(key, { fails: 1, lockedUntil: 0 });
    return;
  }
  const fails = cur.fails + 1;
  byKey.set(key, {
    fails,
    lockedUntil: fails >= MAX_FAILS ? now + WINDOW_MS : 0,
  });
}

export function clearAuthFailures(key: string): void {
  byKey.delete(key);
}

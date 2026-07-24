/**
 * Encode a cursor value to an opaque base64url string.
 */
export function encodeCursor(value: string | bigint | number): string {
  return Buffer.from(String(value)).toString("base64url");
}

/**
 * Decode an opaque cursor string back to its original string value.
 */
export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString();
}

/**
 * Parse and validate a limit query parameter.
 * Returns a safe integer between 1 and maxLimit (default 100).
 */
export function parseLimit(
  raw: unknown,
  defaultLimit = 20,
  maxLimit = 100,
): number {
  const n = Number(raw);
  if (Number.isNaN(n) || n < 1) return defaultLimit;
  return Math.min(Math.floor(n), maxLimit);
}

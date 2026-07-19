import { randomBytes } from "crypto";

export function generateVerificationCode(): string {
  return randomBytes(6).toString("hex").toUpperCase();
}

export function extractInstagramHandle(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const match = pathname.match(/^\/([a-zA-Z0-9_.]+)\/?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function extractTiktokHandle(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const match = pathname.match(/^\/@?([a-zA-Z0-9_.]+)\/?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

interface VerificationRelevantFields {
  displayName?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  facebookUrl?: string | null;
}

export function isVerificationRelevantChange(
  existing: VerificationRelevantFields | null | undefined,
  incoming: VerificationRelevantFields,
): boolean {
  if (!existing) return false;

  const checkField = (field: keyof VerificationRelevantFields) => {
    const incomingValue = incoming[field] ?? null;
    const existingValue = existing[field] ?? null;
    return incomingValue !== existingValue;
  };

  return (
    checkField("displayName") ||
    checkField("websiteUrl") ||
    checkField("instagramUrl") ||
    checkField("tiktokUrl") ||
    checkField("facebookUrl")
  );
}

/**
 * Figma: Reject reasons enum for API
 * Used in reject/retake flow
 */

export const REJECT_REASONS = {
  FACE_NOT_DETECTED: "face",
  LIGHTING_IRREGULAR: "light",
  PHOTO_BLURRY: "blur",
  RESOLUTION_TOO_LOW: "resolution",
  OTHER: "other",
} as const;

export type RejectReason = (typeof REJECT_REASONS)[keyof typeof REJECT_REASONS];

export function mapPhotoQualityToRejectReasons(photoQuality: {
  warnings?: string[];
  faceDetected?: boolean;
  usedFaceFallback?: boolean;
  lightingWarning?: boolean;
  qualityBand?: string;
}): RejectReason[] {
  const reasons: RejectReason[] = [];

  if (!photoQuality.faceDetected || photoQuality.usedFaceFallback) {
    reasons.push(REJECT_REASONS.FACE_NOT_DETECTED);
  }

  if (photoQuality.lightingWarning) {
    reasons.push(REJECT_REASONS.LIGHTING_IRREGULAR);
  }

  // Check warnings for blur/resolution
  if (photoQuality.warnings) {
    for (const warning of photoQuality.warnings) {
      if (/baixa|resolução/i.test(warning)) {
        reasons.push(REJECT_REASONS.RESOLUTION_TOO_LOW);
      }
      if (/desfocad|blur|tremid/i.test(warning)) {
        reasons.push(REJECT_REASONS.PHOTO_BLURRY);
      }
    }
  }

  if (reasons.length === 0 && photoQuality.qualityBand === "ruim") {
    reasons.push(REJECT_REASONS.OTHER);
  }

  return reasons;
}

/**
 * Compatibilidad: el stack usa `supplementMoments`; estos alias evitan romper imports antiguos.
 */
export {
  SUPPLEMENT_MOMENT_ORDER as SUPPLEMENT_DAYPART_ORDER,
  SUPPLEMENT_MOMENT_LABELS as SUPPLEMENT_DAYPART_LABELS,
  isSupplementMomentId as isSupplementDaypart,
  normalizeSupplementMomentId,
} from "@/lib/health/supplementMoments"

// frontend/src/utils/scoreUtils.js

/**
 * Returns a tag object for a numeric match score (0–100).
 *
 * Tiers (aligned with backend MatchConfig):
 *   >= 80  → Highly Qualified
 *   >= 65  → Moderately Qualified
 *   >= 50  → Qualified
 *   >= 35  → For Review
 *   <  35  → Not Qualified
 *
 * Also accepts legacy string bucket names from Firebase so existing
 * records display correctly before re-screening.
 */
export function getScoreTag(scoreOrBucket) {
  // Accept stored bucket strings (legacy + new)
  if (typeof scoreOrBucket === 'string') {
    return BUCKET_TAG[scoreOrBucket] ?? BUCKET_TAG['Not Qualified'];
  }
  if (scoreOrBucket === null || scoreOrBucket === undefined) return null;
  const s = Number(scoreOrBucket);
  if (s >= 80) return BUCKET_TAG['Highly Qualified'];
  if (s >= 65) return BUCKET_TAG['Moderately Qualified'];
  if (s >= 50) return BUCKET_TAG['Qualified'];
  if (s >= 35) return BUCKET_TAG['For Review'];
  return BUCKET_TAG['Not Qualified'];
}

// Tag definitions — single source of truth for labels + Tailwind classes
const BUCKET_TAG = {
  'Highly Qualified':    { label: 'Highly Qualified',    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Moderately Qualified':{ label: 'Moderately Qualified', bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500'    },
  'Qualified':           { label: 'Qualified',            bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  'For Review':          { label: 'For Review',           bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  // Legacy name — keep so old Firebase records still render correctly
  'Needs Review':        { label: 'For Review',           bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  'Not Qualified':       { label: 'Not Qualified',        bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    dot: 'bg-rose-500'    },
  // Other legacy names
  'Strong':              { label: 'Highly Qualified',     bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Good':                { label: 'Moderately Qualified', bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500'    },
  'Weak':                { label: 'Not Qualified',        bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    dot: 'bg-rose-500'    },
};

/** The 3 shortlist-worthy bucket names (new + legacy). */
export const SHORTLIST_BUCKETS = new Set([
  'Highly Qualified', 'Moderately Qualified', 'Qualified',
  'Strong', 'Good',   // legacy fallbacks
]);
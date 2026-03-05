const REQUIRED_FIELDS = [
  { key: 'f_name',           label: 'First name'       },
  { key: 'l_name',           label: 'Last name'        },
  { key: 'email',            label: 'Email'            },
  { key: 'phone',            label: 'Phone number'     },
  { key: 'applied_position', label: 'Applied position' },
  { key: 'resume_path',      label: 'Resume'           },
];

function normalize(str) {
  return (str || '').trim().toLowerCase();
}

/**
 * Build a flag map for every applicant.
 * @param {Array} applicants - raw applicant objects from the API
 * @returns {Map<string, FlagResult>}
 */
export function buildFlagMap(applicants = []) {
  const map = new Map();

  // Index builders
  const phoneIndex = new Map(); // phone -> [ids]
  const nameIndex  = new Map(); // "firstname lastname" -> [ids]

  applicants.forEach(a => {
    const id = a.id;
    if (!id) return;

    const phone    = normalize(a.phone);
    const fullName = `${normalize(a.f_name)} ${normalize(a.l_name)}`.trim();

    if (phone) {
      if (!phoneIndex.has(phone)) phoneIndex.set(phone, []);
      phoneIndex.get(phone).push(id);
    }
    if (fullName && fullName !== ' ') {
      if (!nameIndex.has(fullName)) nameIndex.set(fullName, []);
      nameIndex.get(fullName).push(id);
    }

    map.set(id, { isDuplicate: false, isIncomplete: false, reasons: [], duplicateOf: [] });
  });

  // Mark phone duplicates
  phoneIndex.forEach((ids) => {
    if (ids.length < 2) return;
    ids.forEach(id => {
      const entry  = map.get(id);
      if (!entry) return;
      entry.isDuplicate = true;
      const others = ids.filter(i => i !== id);
      entry.reasons.push(`Duplicate phone number with ${others.length} other applicant${others.length > 1 ? 's' : ''}`);
      others.forEach(o => { if (!entry.duplicateOf.includes(o)) entry.duplicateOf.push(o); });
    });
  });

  // Mark name duplicates
  nameIndex.forEach((ids) => {
    if (ids.length < 2) return;
    ids.forEach(id => {
      const entry  = map.get(id);
      if (!entry) return;
      entry.isDuplicate = true;
      const others = ids.filter(i => i !== id);
      const label  = `Duplicate name with ${others.length} other applicant${others.length > 1 ? 's' : ''}`;
      if (!entry.reasons.includes(label)) entry.reasons.push(label);
      others.forEach(o => { if (!entry.duplicateOf.includes(o)) entry.duplicateOf.push(o); });
    });
  });

  // Mark incomplete fields
  applicants.forEach(a => {
    const entry = map.get(a.id);
    if (!entry) return;

    REQUIRED_FIELDS.forEach(({ key, label }) => {
      const val = a[key];
      if (val === null || val === undefined || String(val).trim() === '') {
        entry.isIncomplete = true;
        entry.reasons.push(`Missing: ${label}`);
      }
    });

    if (a.ai_resume_score == null) {
      entry.isIncomplete = true;
      entry.reasons.push('AI prescreen not yet run');
    }
  });

  return map;
}

/** Get flags for a single id. Returns safe default if not found. */
export function getFlags(flagMap, id) {
  return flagMap.get(id) ?? { isDuplicate: false, isIncomplete: false, reasons: [], duplicateOf: [] };
}

/** Count applicants with at least one flag. */
export function countFlagged(flagMap) {
  let n = 0;
  flagMap.forEach(v => { if (v.isDuplicate || v.isIncomplete) n++; });
  return n;
}
/** Scenario <-> URL hash (shareable links) and CSV export. */

/** Encode a scenario object into a URL-safe base64 string (unicode-safe). */
export function encodeScenario(scenario) {
  try {
    const json = JSON.stringify(scenario);
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return '';
  }
}

/** Decode a scenario object from a URL hash string. Returns null on failure. */
export function decodeScenario(str) {
  try {
    const json = decodeURIComponent(escape(atob(str)));
    const obj = JSON.parse(json);
    if (obj && typeof obj === 'object' && Array.isArray(obj.expenses)) return obj;
    return null;
  } catch {
    return null;
  }
}

/** Read a scenario from the current location hash (#s=...). */
export function scenarioFromHash() {
  if (typeof window === 'undefined') return null;
  const h = window.location.hash || '';
  const match = h.match(/[#&]s=([^&]+)/);
  return match ? decodeScenario(match[1]) : null;
}

/** Build a full shareable URL for a scenario (long, self-contained hash link). */
export function shareUrl(scenario) {
  const base = window.location.origin + window.location.pathname;
  return `${base}#s=${encodeScenario(scenario)}`;
}

/* ------------------------------ Short links (/s/:id) ------------------------------ */

/**
 * Save the scenario to the backend and return a short share URL (origin/s/:id).
 * Throws if the backend isn't available (caller falls back to a long hash link).
 */
export async function createShortLink(scenario) {
  const res = await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  });
  if (!res.ok) throw new Error(`save failed: ${res.status}`);
  const { id } = await res.json();
  if (!id) throw new Error('no id returned');
  return `${window.location.origin}/s/${id}`;
}

/** Read a short-link id from the current path (/s/:id). */
export function shortIdFromPath() {
  if (typeof window === 'undefined') return null;
  const m = window.location.pathname.match(/^\/s\/([A-Za-z0-9]{4,16})$/);
  return m ? m[1] : null;
}

/** Fetch a scenario by short id. Returns the scenario, or null on any failure. */
export async function fetchScenarioById(id) {
  try {
    const res = await fetch(`/api/get?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const { scenario } = await res.json();
    return scenario && Array.isArray(scenario.expenses) ? scenario : null;
  } catch {
    return null;
  }
}

/* --------------------------- Full backup (export / import) --------------------------- */

const BACKUP_VERSION = 1;

/** True if an object looks like a scenario (has an expenses array). */
export function isScenario(obj) {
  return !!obj && typeof obj === 'object' && Array.isArray(obj.expenses);
}

/** Serialize the full app state (current scenario + saved scenarios) to a JSON string. */
export function exportData(scenario, saved) {
  const payload = {
    app: 'retirement-simulator',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    current: scenario,
    saved: Array.isArray(saved) ? saved : [],
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Parse a backup file's text into { current, saved }.
 * Accepts a full backup payload or a bare scenario object.
 * Throws an Error with a friendly message on failure.
 */
export function parseImport(text) {
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error("That file isn't valid JSON."); }

  // A bare scenario (no wrapper) — treat it as the current scenario.
  if (isScenario(data)) return { current: data, saved: [] };

  if (!data || typeof data !== 'object') throw new Error('Unrecognised backup file.');

  const current = isScenario(data.current) ? data.current : null;
  const saved = Array.isArray(data.saved)
    ? data.saved.filter((e) => e && typeof e.name === 'string' && isScenario(e.scenario))
    : [];

  if (!current && saved.length === 0) throw new Error('No scenarios found in that file.');
  return { current, saved };
}

/** Convert simulation rows to a CSV string. */
export function rowsToCsv(rows) {
  const headers = [
    'Age',
    'Phase',
    'Start corpus',
    'Gross growth',
    'Tax on growth',
    'Net growth',
    'Expense',
    'Inflow',
    'Net withdrawal',
    'SIP contribution',
    'Asset liquidation',
    'End corpus',
    'Withdrawal rate %',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.age,
        r.phase,
        Math.round(r.start),
        Math.round(r.grossGrowth),
        Math.round(r.tax),
        Math.round(r.netGrowth),
        Math.round(r.expense),
        Math.round(r.inflow),
        Math.round(r.netDraw),
        Math.round(r.contribution),
        Math.round(r.liquidation || 0),
        Math.round(r.end),
        (r.withdrawalRate * 100).toFixed(2),
      ].join(',')
    );
  }
  return lines.join('\n');
}

/** Trigger a client-side file download. */
export function downloadFile(filename, content, type = 'text/csv') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

import React, { useState, useMemo, useEffect } from 'react';
import { api } from '@/config/api';
import { SlidersHorizontal, Trophy, Search, FileText, Sparkles, Briefcase, Loader2, Play, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import CandidateModal from '../modals/CandidateModal';

// ── Resume scoring constants ──────────────────────────────────────────────
const DEFAULT_WEIGHTS = { structure: 30, experience: 30, impact: 25, clarity: 15 };
const WEIGHT_META = [
  { key: 'structure',  label: 'Resume Structure',     color: '#2A5C9A', desc: 'Section headings, bullet formatting, organisation' },
  { key: 'experience', label: 'Experience Signals',   color: '#7C3AED', desc: 'Date ranges, role titles, work-history completeness' },
  { key: 'impact',     label: 'Impact & Achievement', color: '#F59E0B', desc: 'Action verbs, quantified results, metrics' },
  { key: 'clarity',    label: 'Writing Clarity',      color: '#10B981', desc: 'Contact info, clean formatting, length' },
];
const STORAGE_KEY = 'intellihire_score_weights';

// ── Match scoring constants ──────────────────────────────────────────────
const DEFAULT_MATCH_WEIGHTS = { keyword: 35, semantic: 50, experience: 15 };
const MATCH_WEIGHT_META = [
  { key: 'keyword',    label: 'Keyword Coverage',    color: '#2A5C9A', desc: 'How well resume keywords match the job description' },
  { key: 'semantic',   label: 'Semantic Similarity',  color: '#7C3AED', desc: 'TF-IDF cosine similarity between resume and job text' },
  { key: 'experience', label: 'Experience Fit',       color: '#10B981', desc: 'Candidate experience years vs job requirement' },
];
const MATCH_STORAGE_KEY = 'intellihire_match_weights';

function recomputeScore(breakdown, weights) {
  if (!breakdown) return null;
  const { structure = 0, experience_signals = 0, impact_signals = 0, clarity = 0 } = breakdown;
  const total = WEIGHT_META.reduce((s, m) => s + weights[m.key], 0);
  if (total === 0) return 0;
  const raw =
    (structure / 30)           * weights.structure  +
    (experience_signals / 30)  * weights.experience +
    (impact_signals / 25)      * weights.impact     +
    (clarity / 15)             * weights.clarity;
  return Math.round((raw / total) * 100);
}

function scoreColor(s) {
  if (s == null) return 'text-slate-300';
  if (s >= 75)   return 'text-emerald-600';
  if (s >= 50)   return 'text-amber-500';
  return 'text-rose-500';
}

function scoreBg(s) {
  if (s == null) return 'bg-slate-50 border-slate-100';
  if (s >= 75)   return 'bg-emerald-50 border-emerald-100';
  if (s >= 50)   return 'bg-amber-50 border-amber-100';
  return 'bg-rose-50 border-rose-100';
}

// ── Pure SVG donut ────────────────────────────────────────────────────────────
const DonutChart = ({ weights }) => {
  const SIZE = 130, CX = 65, CY = 65, R_OUT = 48, R_IN = 30;
  const total = WEIGHT_META.reduce((s, m) => s + (weights[m.key] || 0), 0) || 1;
  const slices = [];
  let cursor = -Math.PI / 2;
  WEIGHT_META.forEach(({ key, color }) => {
    const val = weights[key] || 0;
    const angle = (val / total) * 2 * Math.PI;
    if (angle < 0.01) return;
    const x1  = CX + R_OUT * Math.cos(cursor);
    const y1  = CY + R_OUT * Math.sin(cursor);
    const x2  = CX + R_OUT * Math.cos(cursor + angle);
    const y2  = CY + R_OUT * Math.sin(cursor + angle);
    const xi1 = CX + R_IN  * Math.cos(cursor + angle);
    const yi1 = CY + R_IN  * Math.sin(cursor + angle);
    const xi2 = CX + R_IN  * Math.cos(cursor);
    const yi2 = CY + R_IN  * Math.sin(cursor);
    const lg  = angle > Math.PI ? 1 : 0;
    slices.push({
      key, color,
      d: `M${x1},${y1} A${R_OUT},${R_OUT} 0 ${lg} 1 ${x2},${y2} L${xi1},${yi1} A${R_IN},${R_IN} 0 ${lg} 0 ${xi2},${yi2} Z`,
    });
    cursor += angle;
  });
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {slices.map(({ d, color, key }) => (
        <path key={key} d={d} fill={color} opacity={0.88} className="transition-all duration-300" />
      ))}
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="12" fontWeight="800" fill="#1e293b">
        {WEIGHT_META.reduce((s, m) => s + (weights[m.key] || 0), 0)}
      </text>
      <text x={CX} y={CY + 9} textAnchor="middle" fontSize="7.5" fill="#94a3b8" fontWeight="600">TOTAL</text>
    </svg>
  );
};

// ── Rank row ──────────────────────────────────────────────────────────────────
const RankRow = ({ rank, app, score, sublabel, onNameClick }) => (
  <div className="flex items-center gap-3 py-2.5 px-4 rounded-xl border border-slate-100 bg-white hover:border-[#2A5C9A]/20 hover:shadow-sm transition-all">
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
      rank === 1 ? 'bg-amber-400 text-white' :
      rank === 2 ? 'bg-slate-300 text-white' :
      rank === 3 ? 'bg-amber-600/70 text-white' :
      'bg-slate-100 text-slate-400'
    }`}>{rank}</span>
    <div className="flex-1 min-w-0">
      <button
        onClick={() => onNameClick(app)}
        className="text-sm font-bold text-[#2A5C9A] hover:underline underline-offset-2 text-left truncate max-w-full block"
      >
        {app.f_name} {app.l_name}
      </button>
      <p className="text-[10px] text-slate-400 truncate">{sublabel}</p>
    </div>
    <div className={`px-2.5 py-0.5 rounded-lg border text-xs font-black shrink-0 ${scoreBg(score)} ${scoreColor(score)}`}>
      {score != null ? score : '—'}
      <span className="text-[9px] font-medium opacity-60 ml-0.5">/ 100</span>
    </div>
    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
      <div
        className={`h-full rounded-full transition-all duration-500 ${score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
        style={{ width: `${Math.min(score ?? 0, 100)}%` }}
      />
    </div>
  </div>
);

// ── Panel wrapper ─────────────────────────────────────────────────────────────
const Panel = ({ icon: Icon, iconBg, title, subtitle, action, children }) => (
  <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
    <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b border-slate-50 gap-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          <Icon size={15} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-800">{title}</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
    <div className="px-7 py-5">{children}</div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const AITab = ({ applicants = [], jobs = [], onSelectApplicant }) => {

  // ── Weights ──────────────────────────────────────────────────────────────
  const [weights, setWeights] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return s ? { ...DEFAULT_WEIGHTS, ...s } : DEFAULT_WEIGHTS;
    } catch { return DEFAULT_WEIGHTS; }
  });
  const [saved, setSaved] = useState(false);

  const setWeight = (key, raw) => {
    const val = Math.max(0, Math.min(100, parseInt(raw) || 0));
    setWeights(w => ({ ...w, [key]: val }));
    setSaved(false);
  };

  const saveWeights = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetWeights = () => {
    setWeights(DEFAULT_WEIGHTS);
    localStorage.removeItem(STORAGE_KEY);
    setSaved(false);
  };

  const totalWeight = WEIGHT_META.reduce((s, m) => s + weights[m.key], 0);

  // ── NEW: Match Weights ────────────────────────────────────────────────────
  const [matchWeights, setMatchWeights] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(MATCH_STORAGE_KEY));
      return s ? { ...DEFAULT_MATCH_WEIGHTS, ...s } : DEFAULT_MATCH_WEIGHTS;
    } catch { return DEFAULT_MATCH_WEIGHTS; }
  });
  const [matchSaved, setMatchSaved] = useState(false);

  const setMatchWeight = (key, raw) => {
    const val = Math.max(0, Math.min(100, parseInt(raw) || 0));
    setMatchWeights(w => ({ ...w, [key]: val }));
    setMatchSaved(false);
  };

  const saveMatchWeights = () => {
    localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(matchWeights));
    setMatchSaved(true);
    setTimeout(() => setMatchSaved(false), 2000);
  };

  const resetMatchWeights = () => {
    setMatchWeights(DEFAULT_MATCH_WEIGHTS);
    localStorage.removeItem(MATCH_STORAGE_KEY);
    setMatchSaved(false);
  };

  const totalMatchWeight = MATCH_WEIGHT_META.reduce((s, m) => s + matchWeights[m.key], 0);

  // ── Rank Candidates ───────────────────────────────────────────────────────
  const rankedByResume = useMemo(() => applicants
    .map(app => ({
      app,
      score: recomputeScore(app.ai_resume_score_json?.breakdown, weights)
        ?? (app.ai_resume_score != null ? Math.round(app.ai_resume_score) : null),
    }))
    .filter(({ score }) => score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10),
  [applicants, weights]);

  // ── Smart Screen ──────────────────────────────────────────────────────────
  const roleList = useMemo(() => {
    const seen = new Set();
    const list = [];
    jobs.filter(j => j.status === 'Open').forEach(j => {
      if (!seen.has(j.title)) { seen.add(j.title); list.push(j.title); }
    });
    applicants.forEach(app => {
      [app.ai_recommended_role, app.applied_position].filter(Boolean).forEach(r => {
        if (!seen.has(r)) { seen.add(r); list.push(r); }
      });
    });
    return list.sort();
  }, [applicants, jobs]);

  const [selectedRole, setSelectedRole] = useState('');
  const [screenFilter, setScreenFilter] = useState('all');
  const [smartResults, setSmartResults] = useState([]);
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartError, setSmartError]     = useState(null);

  useEffect(() => {
    if (!selectedRole && roleList.length) setSelectedRole(roleList[0]);
  }, [roleList]);

  useEffect(() => {
    if (!selectedRole) return;

    if (screenFilter === 'applied') {
      const pool = applicants
        .filter(app => app.applied_position === selectedRole)
        .map(app => ({
          ...app,
          role_match_score: app.ai_job_match_score != null ? Math.round(app.ai_job_match_score)
            : app.ai_resume_score != null ? Math.round(app.ai_resume_score) : null,
        }))
        .filter(app => app.role_match_score !== null)
        .sort((a, b) => b.role_match_score - a.role_match_score)
        .slice(0, 10);
      setSmartResults(pool);
      setSmartError(null);
      return;
    }

    // 'all' mode — fetch from backend with abort support
    const controller = new AbortController();
    setSmartLoading(true);
    setSmartError(null);

    api.get('/smart-screen', {
      params: { title: selectedRole },
      signal: controller.signal,
    })
      .then(res => {
        setSmartResults(res.data);
        setSmartLoading(false);
      })
      .catch(err => {
        if (err.name === 'CanceledError') return;
        setSmartError('Could not load rankings for this role.');
        setSmartLoading(false);
      });

    return () => controller.abort();
  }, [selectedRole, screenFilter, applicants]);

  // ── Candidate modal ───────────────────────────────────────────────────────
  const [modalApp, setModalApp] = useState(null);

  const openModal = (appOrResult) => {
    const full = applicants.find(a => a.id === (appOrResult.id || appOrResult.applicant_id));
    setModalApp(full || appOrResult);
  };

  // ── Bulk Prescreen ────────────────────────────────────────────────────────
  const [bulkRunning,  setBulkRunning]  = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal,    setBulkTotal]    = useState(0);
  const [bulkDone,     setBulkDone]     = useState(null); // null = idle, number = completed count
  const [bulkErrors,   setBulkErrors]   = useState([]);   // names that failed
  const [bulkFilter,   setBulkFilter]   = useState('unscreened'); // 'unscreened' | 'all'

  const unscreenedCount = useMemo(
    () => applicants.filter(a => a.ai_resume_score == null).length,
    [applicants]
  );

  const bulkQueue = useMemo(() => {
    if (bulkFilter === 'all') return applicants.filter(a => a.id);
    return applicants.filter(a => a.ai_resume_score == null && a.id);
  }, [applicants, bulkFilter]);

  const runBulkPrescreen = async () => {
    if (bulkRunning || bulkQueue.length === 0) return;
    setBulkRunning(true);
    setBulkProgress(0);
    setBulkTotal(bulkQueue.length);
    setBulkDone(null);
    setBulkErrors([]);

    let completed = 0;
    const errors  = [];

    for (const app of bulkQueue) {
      try {
        await api.post(`/applicants/${app.id}/prescreen`);
      } catch {
        const name = `${app.f_name || ''} ${app.l_name || ''}`.trim() || app.id;
        errors.push(name);
      }
      completed += 1;
      setBulkProgress(completed);
    }

    setBulkRunning(false);
    setBulkDone(completed - errors.length);
    setBulkErrors(errors);
  };

  const resetBulk = () => {
    setBulkDone(null);
    setBulkErrors([]);
    setBulkProgress(0);
    setBulkTotal(0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* 1. Resume Scoring Adjustment */}
      <Panel
        icon={SlidersHorizontal}
        iconBg="bg-[#2A5C9A]"
        title="Resume Scoring Adjustment"
        subtitle="Set how much each dimension contributes to the overall resume score"
        action={
          <>
            <button onClick={resetWeights}
              className="text-[10px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-wide px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all">
              Reset
            </button>
            <button onClick={saveWeights}
              className={`text-[10px] font-black uppercase tracking-wide px-4 py-1.5 rounded-xl transition-all ${
                saved ? 'bg-emerald-500 text-white' : 'bg-[#2A5C9A] text-white hover:bg-[#1e4470]'
              }`}>
              {saved ? '✓ Saved' : 'Save Weights'}
            </button>
          </>
        }
      >
        <div className="flex gap-8 items-center">

          {/* 2×2 grid of weight inputs */}
          <div className="flex-1 grid grid-cols-2 gap-3">
            {WEIGHT_META.map(({ key, label, color, desc }) => (
              <div key={key} className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 leading-tight">{label}</p>
                  <p className="text-[9px] text-slate-400 truncate">{desc}</p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weights[key]}
                  onChange={e => setWeight(key, e.target.value)}
                  className="w-14 text-center text-sm font-black rounded-xl border-2 border-slate-200 focus:border-[#2A5C9A] outline-none py-1.5 bg-white transition-all shrink-0"
                  style={{ color }}
                />
              </div>
            ))}

            {/* Total */}
            <div className="col-span-2 flex justify-end pt-1 pr-1">
              <span className={`text-[10px] font-black ${totalWeight === 100 ? 'text-emerald-600' : 'text-amber-500'}`}>
                Total: {totalWeight}{totalWeight !== 100 ? ' — will be normalised' : ' ✓'}
              </span>
            </div>
          </div>

          {/* Donut + legend */}
          <div className="shrink-0 flex flex-col items-center gap-3">
            <DonutChart weights={weights} />
            <div className="space-y-1.5">
              {WEIGHT_META.map(({ key, label, color }) => {
                const tot = WEIGHT_META.reduce((s, m) => s + (weights[m.key] || 0), 0) || 1;
                const pct = Math.round((weights[key] / tot) * 100);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-[10px] text-slate-500 w-32 truncate">{label}</span>
                    <span className="text-[10px] font-black text-slate-400">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </Panel>

      {/* 2. Match Scoring Adjustment */}
      <Panel
        icon={SlidersHorizontal}
        iconBg="bg-[#1A3C6E]"
        title="Match Scoring Adjustment"
        subtitle="Set how much each dimension contributes to the overall job match score"
        action={
          <>
            <button onClick={resetMatchWeights}
              className="text-[10px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-wide px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all">
              Reset
            </button>
            <button onClick={saveMatchWeights}
              className={`text-[10px] font-black uppercase tracking-wide px-4 py-1.5 rounded-xl transition-all ${
                matchSaved ? 'bg-emerald-500 text-white' : 'bg-[#1A3C6E] text-white hover:bg-[#0D2645]'
              }`}>
              {matchSaved ? '✓ Saved' : 'Save Weights'}
            </button>
          </>
        }
      >
        <div className="flex gap-8 items-start">
          <div className="flex-1 space-y-3">
            {MATCH_WEIGHT_META.map(({ key, label, color, desc }) => (
              <div key={key} className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 leading-tight">{label}</p>
                  <p className="text-[9px] text-slate-400 truncate">{desc}</p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={matchWeights[key]}
                  onChange={e => setMatchWeight(key, e.target.value)}
                  className="w-14 text-center text-sm font-black rounded-xl border-2 border-slate-200 focus:border-[#1A3C6E] outline-none py-1.5 bg-white transition-all shrink-0"
                  style={{ color }}
                />
              </div>
            ))}

            {/* Total */}
            <div className="flex justify-end pt-1 pr-1">
              <span className={`text-[10px] font-black ${totalMatchWeight === 100 ? 'text-emerald-600' : 'text-amber-500'}`}>
                Total: {totalMatchWeight}{totalMatchWeight !== 100 ? ' — will be normalised' : ' ✓'}
              </span>
            </div>
          </div>
        </div>
      </Panel>

      {/* 3. Bulk Prescreen */}
      <Panel
        icon={Play}
        iconBg="bg-[#00AECC]"
        title="Bulk Prescreen"
        subtitle="Run AI prescreening on multiple applicants at once"
        action={
          <div className="flex items-center gap-2">
            {/* Filter toggle */}
            <div className="flex bg-slate-100 rounded-xl p-1">
              {[
                { val: 'unscreened', label: `Unscreened (${unscreenedCount})` },
                { val: 'all',        label: `All (${applicants.length})` },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  disabled={bulkRunning}
                  onClick={() => { setBulkFilter(val); resetBulk(); }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all disabled:opacity-50 ${
                    bulkFilter === val ? 'bg-white text-[#1A3C6E] shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Run / reset button */}
            {bulkDone !== null ? (
              <button
                onClick={resetBulk}
                className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-4 py-1.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
              >
                <RotateCcw size={12} /> Reset
              </button>
            ) : (
              <button
                onClick={runBulkPrescreen}
                disabled={bulkRunning || bulkQueue.length === 0}
                className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-4 py-1.5 rounded-xl text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #1A3C6E 0%, #00AECC 100%)' }}
              >
                {bulkRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                {bulkRunning ? 'Running…' : `Run ${bulkQueue.length} Applicant${bulkQueue.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        }
      >
        {/* Idle state */}
        {!bulkRunning && bulkDone === null && (
          <div className="flex items-center gap-6 py-2">
            <div className="flex-1 grid grid-cols-3 gap-4">
              {[
                { label: 'Total Applicants',  value: applicants.length,                      color: '#1A3C6E' },
                { label: 'Already Screened',  value: applicants.length - unscreenedCount,    color: '#00AECC' },
                { label: 'Pending Screening', value: unscreenedCount,                        color: unscreenedCount > 0 ? '#F59E0B' : '#10B981' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-2xl font-black" style={{ color }}>{value}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Running state */}
        {bulkRunning && (
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">Processing applicants…</span>
              <span className="font-black text-[#1A3C6E]">{bulkProgress} / {bulkTotal}</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${bulkTotal > 0 ? (bulkProgress / bulkTotal) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, #1A3C6E 0%, #00AECC 100%)',
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400">This may take a while for large batches</p>
          </div>
        )}

        {/* Done state */}
        {!bulkRunning && bulkDone !== null && (
          <div className="py-2 space-y-3">
            {/* Success */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">{bulkDone} applicant{bulkDone !== 1 ? 's' : ''} screened successfully</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Scores and buckets have been updated in Firebase</p>
              </div>
            </div>

            {/* Errors */}
            {bulkErrors.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                  <XCircle size={20} className="text-rose-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">{bulkErrors.length} failed</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate">
                    {bulkErrors.slice(0, 3).join(', ')}{bulkErrors.length > 3 ? ` +${bulkErrors.length - 3} more` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Rank Candidates */}
        <Panel
          icon={Trophy}
          iconBg="bg-amber-400"
          title="Rank Candidates"
          subtitle="Top 10 by resume score with your current weights"
        >
          {rankedByResume.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
              <FileText size={28} className="mb-3" />
              <p className="text-xs font-medium text-slate-400">No resume scores yet</p>
              <p className="text-[10px] mt-1">Run prescreen on applicants first</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rankedByResume.map(({ app, score }, i) => (
                <RankRow
                  key={app.id}
                  rank={i + 1}
                  app={app}
                  score={score}
                  sublabel={app.applied_position || '—'}
                  onNameClick={openModal}
                />
              ))}
            </div>
          )}
        </Panel>

        {/* Smart Screen */}
        <Panel
          icon={Search}
          iconBg="bg-violet-500"
          title="Smart Screen"
          subtitle="Candidates ranked by match score against a specific role"
          action={
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="text-[11px] font-bold text-[#2A5C9A] bg-[#E8F0F8] border-none rounded-xl px-3 py-1.5 outline-none cursor-pointer max-w-[160px] truncate"
            >
              {roleList.length === 0 && <option value="">No roles</option>}
              {roleList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          }
        >
          {/* Toggle */}
          <div className="flex items-center gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
            {[{ val: 'all', label: 'All Candidates' }, { val: 'applied', label: 'Only Applied' }].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setScreenFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                  screenFilter === val ? 'bg-white text-[#2A5C9A] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          {smartLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={24} className="text-violet-400 animate-spin" />
              <p className="text-xs text-slate-400">Scoring all candidates for <strong>{selectedRole}</strong>…</p>
              <p className="text-[10px] text-slate-300">This may take a moment</p>
            </div>
          ) : smartError ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-xs font-medium text-rose-400">{smartError}</p>
              <p className="text-[10px] mt-1 text-slate-400">Make sure this job has a description</p>
            </div>
          ) : !selectedRole ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-300">
              <Briefcase size={28} className="mb-3" />
              <p className="text-xs font-medium text-slate-400">Select a role above</p>
            </div>
          ) : smartResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-300">
              <Sparkles size={28} className="mb-3" />
              <p className="text-xs font-medium text-slate-400">
                {screenFilter === 'applied' ? 'No one has applied to this role yet' : 'No candidates could be scored'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {smartResults.map((item, i) => {
                const score = item.role_match_score != null ? Math.round(item.role_match_score)
                  : item.ai_job_match_score != null ? Math.round(item.ai_job_match_score)
                  : null;
                const app = applicants.find(a => a.id === item.id) || item;
                return (
                  <RankRow
                    key={item.id || i}
                    rank={i + 1}
                    app={app}
                    score={score}
                    sublabel={
                      app.applied_position === selectedRole
                        ? 'Applied for this role'
                        : `Applied: ${app.applied_position || '—'}`
                    }
                    onNameClick={openModal}
                  />
                );
              })}
            </div>
          )}
        </Panel>

      </div>

      {/* Candidate modal */}
      {modalApp && (
        <CandidateModal
          app={modalApp}
          onClose={() => setModalApp(null)}
          onViewFull={(id) => {
            setModalApp(null);
            if (onSelectApplicant) onSelectApplicant(id);
          }}
        />
      )}

    </div>
  );
};

export default AITab;
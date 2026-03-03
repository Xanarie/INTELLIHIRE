<<<<<<< HEAD
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import { SlidersHorizontal, Trophy, Search, FileText, Sparkles, Briefcase, Loader2 } from 'lucide-react';
import CandidateModal from '../modals/CandidateModal';

const API_BASE_URL = 'http://localhost:8000/api/admin';

const DEFAULT_WEIGHTS = { structure: 30, experience: 30, impact: 25, clarity: 15 };
const WEIGHT_META = [
  { key: 'structure',  label: 'Resume Structure',     color: '#2A5C9A', desc: 'Section headings, bullet formatting, organisation' },
  { key: 'experience', label: 'Experience Signals',   color: '#7C3AED', desc: 'Date ranges, role titles, work-history completeness' },
  { key: 'impact',     label: 'Impact & Achievement', color: '#F59E0B', desc: 'Action verbs, quantified results, metrics' },
  { key: 'clarity',    label: 'Writing Clarity',      color: '#10B981', desc: 'Contact info, clean formatting, length' },
];
const STORAGE_KEY = 'intellihire_score_weights';

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
  if (s >= 75) return 'text-emerald-600';
  if (s >= 50) return 'text-amber-500';
  return 'text-rose-500';
}
function scoreBg(s) {
  if (s == null) return 'bg-slate-50 border-slate-100';
  if (s >= 75) return 'bg-emerald-50 border-emerald-100';
  if (s >= 50) return 'bg-amber-50 border-amber-100';
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

  // ── Smart Screen — calls backend to score ALL applicants per role ─────────
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
  const [smartResults, setSmartResults]   = useState([]);
  const [smartLoading, setSmartLoading]   = useState(false);
  const [smartError, setSmartError]       = useState(null);

  useEffect(() => {
    if (!selectedRole && roleList.length) setSelectedRole(roleList[0]);
  }, [roleList]);

  // When role changes or filter changes, fetch from backend (all mode) or compute locally (applied mode)
  useEffect(() => {
    if (!selectedRole) return;

    if (screenFilter === 'applied') {
      // Local: just filter applicants who applied for this role
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

    // 'all' mode: call backend to score everyone against this specific role
    const controller = new AbortController();
    setSmartLoading(true);
    setSmartError(null);

    axios.get(`${API_BASE_URL}/smart-screen`, {
      params: { title: selectedRole },
      signal: controller.signal,
    })
      .then(res => {
        setSmartResults(res.data);
        setSmartLoading(false);
      })
      .catch(err => {
        if (axios.isCancel(err)) return;
        setSmartError('Could not load rankings for this role.');
        setSmartLoading(false);
      });

    return () => controller.abort();
  }, [selectedRole, screenFilter, applicants]);

  // ── Candidate modal ───────────────────────────────────────────────────────
  const [modalApp, setModalApp] = useState(null);

  // Enrich smart-screen result (only has basic fields) with full applicant data
  const openModal = (appOrResult) => {
    // Try to find the full applicant record
    const full = applicants.find(a => a.id === (appOrResult.id || appOrResult.applicant_id));
    setModalApp(full || appOrResult);
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

            {/* Total under the grid */}
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

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* 2. Rank Candidates */}
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

        {/* 3. Smart Screen */}
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
            <div className="flex flex-col items-center justify-center py-10 text-slate-300">
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
                // item may be from API (role_match_score) or local (role_match_score)
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
=======
import React, { useState } from 'react';
import { Send, Sparkles, FileSearch, MessageSquare, Wand2 } from 'lucide-react';

const AITab = () => {
    const [prompt, setPrompt] = useState("");

    const aiFeatures = [
        { title: "Rank Candidates", desc: "Compare applicants based on job requirements", icon: FileSearch, color: "text-blue-500" },
        { title: "Draft Email", desc: "Generate interview invites or offer letters", icon: MessageSquare, color: "text-emerald-500" },
        { title: "Smart Screen", desc: "Summarize top 5 resumes for any role", icon: Wand2, color: "text-purple-500" },
    ];

    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
            {/* AI HERO SECTION */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-emerald-500 rounded-lg">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">AI Recruitment Intelligence</span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight mb-4">How can I assist your hiring today?</h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        I can help you rank candidates, summarize interview notes, or generate personalized outreach emails in seconds.
                    </p>
                    
                    <div className="relative group">
                        <input 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g. 'Identify the best 3 candidates for the Frontend role...'"
                            className="w-full bg-white/10 border border-white/10 rounded-2xl py-5 pl-6 pr-16 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all backdrop-blur-md"
                        />
                        <button className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                            <Send size={20} />
                        </button>
                    </div>
                </div>
                
                {/* Decorative AI Brain Icon */}
                <Sparkles className="absolute -right-10 -bottom-10 text-white/5 w-80 h-80" />
            </div>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-3 gap-6">
                {aiFeatures.map((feature, idx) => (
                    <button key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 transition-all text-left group">
                        <feature.icon className={`${feature.color} mb-4 group-hover:scale-110 transition-transform`} size={28} />
                        <h3 className="font-bold text-slate-800 mb-1">{feature.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    );
>>>>>>> 05ef615b6d098f2c2a9b43995a0643c6bbcd19a2
};

export default AITab;
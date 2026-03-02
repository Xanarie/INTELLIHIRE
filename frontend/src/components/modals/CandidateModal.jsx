import React, { useEffect } from 'react';
import { X, Mail, Phone, MapPin, Briefcase, Sparkles, ArrowRight, User, Star, FileText } from 'lucide-react';

const STAGE_BADGE = {
  'pre-screening': 'bg-blue-50 text-blue-600 border border-blue-100',
  'screening':     'bg-indigo-50 text-indigo-600 border border-indigo-100',
  'interview':     'bg-amber-50 text-amber-600 border border-amber-100',
  'offer':         'bg-violet-50 text-violet-600 border border-violet-100',
  'hired':         'bg-emerald-50 text-emerald-700 border border-emerald-100',
  'rejected':      'bg-rose-50 text-rose-600 border border-rose-100',
};

function stageBadge(s) {
  return STAGE_BADGE[(s || '').toLowerCase()] || 'bg-slate-50 text-slate-500 border border-slate-100';
}

function scoreStyle(s) {
  if (s == null) return { color: '#94a3b8', bg: 'bg-slate-50 border-slate-100' };
  if (s >= 75)   return { color: '#10B981', bg: 'bg-emerald-50 border-emerald-100' };
  if (s >= 50)   return { color: '#F59E0B', bg: 'bg-amber-50 border-amber-100' };
  return           { color: '#f43f5e',  bg: 'bg-rose-50 border-rose-100' };
}

const BreakdownBar = ({ label, value, max, color }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-black text-slate-600">
          {value}<span className="text-slate-300 font-medium text-[10px]"> / {max}</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
};

const InfoRow = ({ icon: Icon, value }) => value ? (
  <div className="flex items-center gap-3">
    <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
      <Icon size={12} className="text-slate-400" />
    </div>
    <span className="text-sm text-slate-600 truncate">{value}</span>
  </div>
) : null;

const CandidateModal = ({ app, onClose, onViewFull }) => {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!app) return null;

  const initials   = `${(app.f_name || '')[0] || ''}${(app.l_name || '')[0] || ''}`.toUpperCase();
  const fullName   = `${app.f_name || ''} ${app.l_name || ''}`.trim();
  const resumeScore = app.ai_resume_score    != null ? Math.round(app.ai_resume_score)    : null;
  const matchScore  = app.ai_job_match_score != null ? Math.round(app.ai_job_match_score) : null;
  const breakdown   = app.ai_resume_score_json?.breakdown;
  const rs = scoreStyle(resumeScore);
  const ms = scoreStyle(matchScore);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-2xl mx-4 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="px-8 pt-7 pb-6 border-b border-slate-50 flex items-center gap-5">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-[#2A5C9A] flex items-center justify-center text-white text-lg font-black shadow-md shrink-0">
            {initials || <User size={20} />}
          </div>

          {/* Name + stage */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-slate-800 leading-tight truncate">{fullName || 'Unknown'}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${stageBadge(app.hiring_status)}`}>
                {app.hiring_status || 'Pre-screening'}
              </span>
              {app.applied_position && (
                <span className="text-[10px] text-slate-400 font-medium truncate">
                  · {app.applied_position}
                </span>
              )}
            </div>
          </div>

          {/* Score pills */}
          <div className="flex gap-2 shrink-0">
            <div className={`px-4 py-2 rounded-2xl border text-center ${rs.bg}`}>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Resume</p>
              <p className="text-xl font-black leading-none" style={{ color: rs.color }}>
                {resumeScore ?? '—'}
              </p>
              <p className="text-[8px] text-slate-300 mt-0.5">/ 100</p>
            </div>
            <div className={`px-4 py-2 rounded-2xl border text-center ${ms.bg}`}>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Match</p>
              <p className="text-xl font-black leading-none" style={{ color: ms.color }}>
                {matchScore ?? '—'}
              </p>
              <p className="text-[8px] text-slate-300 mt-0.5">/ 100</p>
            </div>
          </div>

          {/* Close */}
          <button onClick={onClose} className="shrink-0 p-2 rounded-xl text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-all ml-1">
            <X size={16} />
          </button>
        </div>

        {/* ── Body: two columns ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-0 divide-x divide-slate-50">

          {/* Left col */}
          <div className="px-8 py-6 space-y-5">
            {/* Contact */}
            <div className="space-y-2.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact</p>
              <InfoRow icon={Mail}   value={app.email} />
              <InfoRow icon={Phone}  value={app.phone} />
              <InfoRow icon={MapPin} value={[app.current_city, app.current_province].filter(Boolean).join(', ') || null} />
            </div>

            {/* Applied / AI best fit */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Applied For</p>
                <div className="flex items-start gap-1.5">
                  <Briefcase size={10} className="text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] font-bold text-slate-700 leading-snug">{app.applied_position || '—'}</p>
                </div>
              </div>
              <div className="bg-[#F3F7F6] rounded-2xl p-3 border border-slate-100">
                <p className="text-[8px] font-black text-[#2A5C9A] uppercase tracking-widest mb-2">AI Best Fit</p>
                <div className="flex items-start gap-1.5">
                  <Sparkles size={10} className="text-[#2A5C9A] mt-0.5 shrink-0" />
                  <p className="text-[11px] font-bold text-[#2A5C9A] leading-snug">{app.ai_recommended_role || '—'}</p>
                </div>
              </div>
            </div>

            {/* AI summary */}
            {app.ai_prescreen_summary && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">AI Summary</p>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-4">{app.ai_prescreen_summary}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right col */}
          <div className="px-8 py-6 space-y-5">
            {breakdown ? (
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Resume Breakdown</p>
                <BreakdownBar label="Resume Structure"     value={Math.round(breakdown.structure           ?? 0)} max={30} color="#2A5C9A" />
                <BreakdownBar label="Experience Signals"   value={Math.round(breakdown.experience_signals  ?? 0)} max={30} color="#7C3AED" />
                <BreakdownBar label="Impact & Achievement" value={Math.round(breakdown.impact_signals      ?? 0)} max={25} color="#F59E0B" />
                <BreakdownBar label="Writing Clarity"      value={Math.round(breakdown.clarity             ?? 0)} max={15} color="#10B981" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-10 text-slate-200 gap-2">
                <FileText size={24} />
                <p className="text-xs text-slate-400">No breakdown data yet</p>
                <p className="text-[10px] text-slate-300">Run prescreen to generate scores</p>
              </div>
            )}

            {/* Bucket badges if available */}
            {(app.ai_resume_bucket || app.ai_job_match_bucket) && (
              <div className="flex gap-2 flex-wrap">
                {app.ai_resume_bucket && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#E8F0F8] text-[#2A5C9A] border border-[#2A5C9A]/10">
                    Resume: {app.ai_resume_bucket}
                  </span>
                )}
                {app.ai_job_match_bucket && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Match: {app.ai_job_match_bucket}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="px-8 py-5 border-t border-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl border-2 border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            Close
          </button>
          <button
            onClick={() => { onClose(); onViewFull(app.id); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#2A5C9A] hover:bg-[#1e4470] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-[#2A5C9A]/20"
          >
            View Full Profile
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidateModal;
// frontend/src/components/admin/Job.jsx
import React, { useState, useMemo } from 'react';
import { Plus, Users, FileText, Star, Trophy, Sparkles } from 'lucide-react';
import { getScoreTag, SHORTLIST_BUCKETS } from '../../utils/scoreUtils';

const NAVY = '#1A3C6E';
const TEAL = '#00AECC';
const TEAL_LIGHT = '#E6F7FB';

const JobTab = ({ jobs = [], applicants = [], onEdit, onDelete, onStatusUpdate, onSelectApplicant }) => {
  const [activeView,     setActiveView]     = useState('status');
  const [shortlistJobId, setShortlistJobId] = useState('');

  const getApplicantCount = (jobTitle) =>
    applicants.filter(a => a.applied_position?.toLowerCase() === jobTitle?.toLowerCase()).length;

  const hasJobDescription = (job) =>
    ['key_responsibilities', 'required_qualifications', 'preferred_qualifications', 'key_competencies']
      .some(f => typeof job?.[f] === 'string' && job[f].trim().length > 0);

  const groupedJobs = useMemo(() => {
    const groups = { Draft: [], Open: [], Closed: [] };
    jobs.forEach(job => {
      const s = job.status || 'Draft';
      if (groups[s]) groups[s].push(job);
    });
    return groups;
  }, [jobs]);

  const shortlistJobs = useMemo(() => jobs.filter(j => j.title?.trim()), [jobs]);

  const selectedJob = useMemo(
    () => shortlistJobs.find(j => j.id === shortlistJobId) || shortlistJobs[0] || null,
    [shortlistJobs, shortlistJobId],
  );

  // Show only Highly Qualified / Moderately Qualified / Qualified, capped at 10
  const shortlist = useMemo(() => {
    if (!selectedJob) return [];
    return applicants
      .filter(app => {
        if (app.applied_position?.toLowerCase() !== selectedJob.title?.toLowerCase()) return false;
        return SHORTLIST_BUCKETS.has(app.ai_job_match_bucket);
      })
      .map(app => ({ ...app, _score: app.ai_job_match_score ?? null }))
      .filter(a => a._score !== null)
      .sort((a, b) => b._score - a._score)
      .slice(0, 10);
  }, [applicants, selectedJob]);

  const TABS = ['Status', 'Department', 'Short List'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Tab navigation */}
      <div className="flex gap-8 border-b border-slate-100">
        {TABS.map(tab => {
          const key    = tab.toLowerCase().replace(' ', '_');
          const active = activeView === key;
          return (
            <button
              key={tab}
              onClick={() => setActiveView(key)}
              className={`pb-4 text-sm font-bold transition-all relative ${active ? '' : 'text-slate-400 hover:text-slate-600'}`}
              style={active ? { color: NAVY } : {}}
            >
              {tab}
              {active && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: TEAL }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* STATUS VIEW */}
      {activeView === 'status' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-slate-700">All Positions</p>
            <button
              onClick={() => onEdit(null)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90"
              style={{ background: NAVY }}
            >
              <Plus size={14} /> New Job
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center justify-center gap-3">
              <Sparkles size={28} className="text-slate-200" />
              <p className="text-sm font-bold text-slate-400">No job positions yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50">
                    {['Position', 'Status', 'Applicants', 'JD', 'Created'].map(h => (
                      <th key={h} className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                    ))}
                    <th className="px-8 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {['Open', 'Draft', 'Closed'].flatMap(s => groupedJobs[s]).map(job => {
                    if (!job) return null;
                    const count   = getApplicantCount(job.title);
                    const limit   = job.applicant_limit ?? '—';
                    const jdAdded = hasJobDescription(job);
                    const dateStr = job.created_at
                      ? new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—';
                    return (
                      <tr key={job.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{job.title}</p>
                            {job.department && <p className="text-[10px] text-slate-400 mt-0.5">{job.department}</p>}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${job.status === 'Open' ? 'bg-emerald-500' : job.status === 'Closed' ? 'bg-rose-400' : 'bg-slate-300'}`} />
                            <span className="text-xs font-bold text-slate-600">{job.status}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm text-slate-600 font-medium">{count} / {limit}</td>
                        <td className="px-8 py-5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${jdAdded ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {jdAdded ? '✓ Added' : 'Missing'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-xs text-slate-400">{dateStr}</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3 justify-end">
                            <button onClick={() => onEdit(job)} className="text-xs font-bold hover:opacity-70 transition-opacity" style={{ color: TEAL }}>Edit</button>
                            {job.status === 'Open'
                              ? <button onClick={() => onStatusUpdate(job, 'Closed')} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Close</button>
                              : job.status === 'Closed'
                              ? <button onClick={() => onStatusUpdate(job, 'Open')} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Reopen</button>
                              : <button onClick={() => onStatusUpdate(job, 'Open')} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Publish</button>
                            }
                            <button onClick={() => onDelete(job.id)} className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors">Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DEPARTMENT VIEW */}
      {activeView === 'department' && (
        <div className="space-y-4">
          {Object.entries(
            jobs.reduce((acc, j) => {
              const dept = j.department || 'General';
              if (!acc[dept]) acc[dept] = [];
              acc[dept].push(j);
              return acc;
            }, {})
          ).map(([dept, deptJobs]) => (
            <div key={dept}>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{dept}</p>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {deptJobs.map((job, i) => (
                  <div key={job.id} className={`flex items-center gap-5 px-6 py-4 ${i < deptJobs.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-slate-50/50 transition-colors`}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: TEAL_LIGHT }}>
                      <Briefcase size={14} style={{ color: NAVY }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{job.title}</p>
                      <p className="text-[10px] text-slate-400">{getApplicantCount(job.title)} applicants · {job.status}</p>
                    </div>
                    <button onClick={() => onEdit(job)} className="text-xs font-bold hover:opacity-70 transition-opacity" style={{ color: TEAL }}>Edit</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {jobs.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center justify-center gap-3">
              <FileText size={28} className="text-slate-200" />
              <p className="text-sm font-bold text-slate-400">No jobs yet</p>
            </div>
          )}
        </div>
      )}

      {/* SHORT LIST VIEW */}
      {activeView === 'short_list' && (
        <div className="space-y-4">

          {/* Header + job selector */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: TEAL_LIGHT }}>
                <Trophy size={16} style={{ color: NAVY }} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">Short List</p>
                <p className="text-[10px] text-slate-400">
                  Top 10 — <strong>Highly Qualified</strong>, <strong>Moderately Qualified</strong> &amp; <strong>Qualified</strong> candidates only
                </p>
              </div>
            </div>

            {shortlistJobs.length > 0 && (
              <select
                value={shortlistJobId || selectedJob?.id || ''}
                onChange={e => setShortlistJobId(e.target.value)}
                className="text-xs font-bold rounded-xl border-2 border-slate-200 px-4 py-2.5 outline-none transition-colors shrink-0"
                style={{ color: NAVY, minWidth: 180 }}
                onFocus={e => { e.target.style.borderColor = TEAL; }}
                onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; }}
              >
                {shortlistJobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            )}
          </div>

          {/* Empty states */}
          {shortlistJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center justify-center gap-3">
              <Sparkles size={28} className="text-slate-200" />
              <p className="text-sm font-bold text-slate-400">No job positions found</p>
            </div>

          ) : shortlist.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center justify-center gap-3">
              <Sparkles size={28} className="text-slate-200" />
              <p className="text-sm font-bold text-slate-400">No qualified candidates for this position</p>
              <p className="text-xs text-slate-300 text-center max-w-xs">
                Only <strong>Highly Qualified</strong>, <strong>Moderately Qualified</strong>, and <strong>Qualified</strong> candidates appear here.
                Run prescreening on applicants for <strong>{selectedJob?.title}</strong> first.
              </p>
            </div>

          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Column headers */}
              <div className="flex items-center gap-5 px-6 py-3 border-b border-slate-50 bg-slate-50">
                <div className="w-8 shrink-0" />
                <div className="w-9 shrink-0" />
                <p className="flex-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-36 text-center">Qualification</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">Score</p>
                <div className="w-[14px] shrink-0" />
              </div>

              {shortlist.map((app, i) => {
                const score = Math.round(app._score);
                const name  = `${app.f_name || ''} ${app.l_name || ''}`.trim() || 'Unknown';
                const tag   = getScoreTag(app.ai_job_match_bucket) ?? getScoreTag(score);
                const isTop3 = i < 3;

                return (
                  <div
                    key={app.id}
                    className="flex items-center gap-5 px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Rank */}
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
                      style={isTop3 ? { background: NAVY, color: '#fff' } : { background: '#f1f5f9', color: '#94a3b8' }}
                    >
                      {i + 1}
                    </div>

                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                      style={{ background: TEAL }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => onSelectApplicant?.(app.id)}
                        className="text-sm font-bold text-left truncate block max-w-full hover:underline underline-offset-2 transition-colors"
                        style={{ color: NAVY }}
                      >
                        {name}
                      </button>
                      <p className="text-[10px] text-slate-400 truncate">{app.email || '—'}</p>
                    </div>

                    {/* Qualification tag */}
                    <div className="w-36 flex justify-center">
                      {tag ? (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${tag.bg} ${tag.text} ${tag.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tag.dot}`} />
                          {tag.label}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-300">—</span>
                      )}
                    </div>

                    {/* Score */}
                    <div className={`w-16 text-sm font-black text-center px-2 py-1 rounded-xl border ${
                      tag ? `${tag.bg} ${tag.text} ${tag.border}` : 'bg-slate-50 text-slate-400 border-slate-100'
                    }`}>
                      {score}%
                    </div>

                    {/* Top-3 star */}
                    {isTop3
                      ? <Star size={14} className="text-amber-400 shrink-0" fill="currentColor" />
                      : <div className="w-[14px] shrink-0" />
                    }
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default JobTab;
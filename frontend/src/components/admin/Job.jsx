// frontend/src/components/admin/Job.jsx
import React, { useState, useMemo } from 'react';
import { Plus, Users, FileText, Star, Trophy, Sparkles } from 'lucide-react';

const NAVY = '#1A3C6E';
const TEAL = '#00AECC';
const TEAL_LIGHT = '#E6F7FB';

// Only these two buckets are considered qualified
const QUALIFIED_BUCKETS = new Set(['Good', 'Strong']);

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
      const status = job.status || 'Draft';
      if (groups[status]) groups[status].push(job);
    });
    return groups;
  }, [jobs]);

  const shortlistJobs = useMemo(() => jobs.filter(j => j.title?.trim()), [jobs]);

  const selectedJob = useMemo(
    () => shortlistJobs.find(j => j.id === shortlistJobId) || shortlistJobs[0] || null,
    [shortlistJobs, shortlistJobId]
  );

  // Strict filter: ONLY ai_job_match_bucket must be Good or Strong.
  // Resume bucket is NOT used as fallback — this is a job-specific shortlist.
  const shortlist = useMemo(() => {
    if (!selectedJob) return [];
    return applicants
      .filter(app => {
        if (app.applied_position?.toLowerCase() !== selectedJob.title?.toLowerCase()) return false;
        return QUALIFIED_BUCKETS.has(app.ai_job_match_bucket);
      })
      .map(app => ({ ...app, _score: app.ai_job_match_score ?? null }))
      .filter(a => a._score !== null)
      .sort((a, b) => b._score - a._score)
      .slice(0, 10);
  }, [applicants, selectedJob]);

  const scoreBg = (s) => {
    if (s >= 75) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (s >= 50) return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-rose-50 text-rose-500 border-rose-100';
  };

  const TABS = ['Status', 'Department', 'Short List'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* TABS NAVIGATION */}
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
              {active && <div className="absolute bottom-0 left-0 w-full h-1 rounded-t-full" style={{ background: NAVY }} />}
            </button>
          );
        })}
      </div>

      {/* STATUS VIEW */}
      {activeView === 'status' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {['Draft', 'Open', 'Closed'].map(status => (
            <div key={status} className="flex flex-col gap-4">
              <h3 className="text-center font-black text-lg uppercase tracking-widest mb-2" style={{ color: NAVY }}>
                {status}
              </h3>
              <div className="space-y-4 p-2 min-h-[500px]">
                {status === 'Draft' && (
                  <button
                    onClick={() => onEdit(null)}
                    className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-[#1A3C6E] hover:bg-[#1A3C6E] hover:text-white transition-all bg-white group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-white/20 transition-all">
                      <Plus size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tighter">Create New Job</span>
                  </button>
                )}
                {groupedJobs[status].map(job => {
                  const count   = getApplicantCount(job.title);
                  const limit   = job.applicant_limit || 50;
                  const isFull  = count >= limit;
                  const jdAdded = hasJobDescription(job);
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => onEdit(job)}
                      className="w-full text-left bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      style={{ borderLeftWidth: 4, borderLeftColor: NAVY }}
                    >
                      <div className="flex items-start gap-2 mb-3">
                        <h4 className="font-bold text-sm leading-tight" style={{ color: NAVY }}>{job.title}</h4>
                        {!jdAdded && (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase tracking-tighter bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                            <FileText size={8} /> No JD
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-3">
                        <span className="flex items-center gap-1"><Users size={10} /> {count}/{limit} applicants</span>
                        {isFull && <span className="text-rose-500 font-bold text-[9px] uppercase">Full</span>}
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min((count / limit) * 100, 100)}%`, background: isFull ? '#f87171' : TEAL }}
                        />
                      </div>
                      {status === 'Draft' && (
                        <p className="mt-4 text-[10px] text-slate-300 italic font-medium">Pending Approval</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DEPARTMENT VIEW */}
      {activeView === 'department' && (
        <div className="bg-white rounded-[2rem] border-2 shadow-xl overflow-hidden" style={{ borderColor: `${NAVY}1A` }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest" style={{ background: TEAL_LIGHT, color: NAVY }}>
                <th className="px-8 py-5 border-r border-slate-100">Job Title</th>
                <th className="px-8 py-5 border-r border-slate-100">Department</th>
                <th className="px-8 py-5 border-r border-slate-100">Status</th>
                <th className="px-8 py-5 border-r border-slate-100">Applicants / Limit</th>
                <th className="px-8 py-5 border-r border-slate-100">JD</th>
                <th className="px-8 py-5">Date Posted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {jobs.map(job => {
                const count   = getApplicantCount(job.title);
                const limit   = job.applicant_limit || 50;
                const jdAdded = hasJobDescription(job);
                const dateStr = job.created_at
                  ? new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—';
                return (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => onEdit(job)}>
                    <td className="px-8 py-5">
                      <span className="font-bold text-slate-700 text-sm group-hover:text-[#1A3C6E] transition-colors">{job.title}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full uppercase">{job.department || '—'}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${job.status === 'Open' ? 'bg-emerald-500' : job.status === 'Closed' ? 'bg-rose-400' : 'bg-slate-300'}`} />
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
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                  Top 10 candidates with a <strong>Good</strong> or <strong>Strong</strong> AI job match for this position
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

          {/* No jobs */}
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
                Only applicants with a <strong>Good</strong> or <strong>Strong</strong> AI job match score appear here.
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 text-center">Bucket</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">Match</p>
                <div className="w-4 shrink-0" />
              </div>

              {shortlist.map((app, i) => {
                const score  = Math.round(app._score);
                const name   = `${app.f_name || ''} ${app.l_name || ''}`.trim() || 'Unknown';
                const bucket = app.ai_job_match_bucket;
                const isTop3 = i < 3;

                return (
                  <div
                    key={app.id}
                    className="flex items-center gap-5 px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Rank badge */}
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

                    {/* Clickable name → opens candidate modal */}
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

                    {/* Bucket pill */}
                    <div className="w-20 flex justify-center">
                      <span
                        className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border"
                        style={
                          bucket === 'Strong'
                            ? { background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }
                            : { background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }
                        }
                      >
                        {bucket}
                      </span>
                    </div>

                    {/* Score */}
                    <div className={`w-16 text-sm font-black text-center px-2 py-1 rounded-xl border ${scoreBg(score)}`}>
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
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

  const TABS = ['Status', 'Short List'];

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Draft', 'Open', 'Closed'].map(status => {
                const colColor = status === 'Open'
                  ? { dot: 'bg-emerald-500', header: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' }
                  : status === 'Closed'
                  ? { dot: 'bg-rose-400',    header: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-100' }
                  : { dot: 'bg-slate-400',   header: 'text-slate-600',   bg: 'bg-slate-100',  border: 'border-slate-200' };

                return (
                  <div key={status} className="flex flex-col gap-3">

                    {/* Column header */}
                    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${colColor.bg} ${colColor.border}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${colColor.dot}`} />
                        <h3 className={`text-xs font-black uppercase tracking-wider ${colColor.header}`}>{status}</h3>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${colColor.bg} ${colColor.header}`}>
                        {groupedJobs[status].length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex flex-col gap-3">
                      {groupedJobs[status].length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-100 py-8 flex items-center justify-center">
                          <p className="text-xs text-slate-300 font-bold">No {status.toLowerCase()} jobs</p>
                        </div>
                      ) : (
                        groupedJobs[status].map(job => {
                          const count   = getApplicantCount(job.title);
                          const limit   = job.applicant_limit ?? '—';
                          const jdAdded = hasJobDescription(job);
                          const dateStr = job.created_at
                            ? new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—';

                          return (
                            <div
                              key={job.id}
                              onClick={() => onEdit(job)}
                              className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-4 cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-800 truncate">{job.title}</p>
                                  {job.department && <p className="text-[10px] text-slate-400 mt-0.5">{job.department}</p>}
                                </div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${jdAdded ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {jdAdded ? '✓ JD' : 'No JD'}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3">
                                <span className="flex items-center gap-1">
                                  <Users size={10} /> {count} / {limit}
                                </span>
                                <span>{dateStr}</span>
                              </div>

                              <div className="flex items-center pt-2 border-t border-slate-50">
                                <button
                                  onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(job.id);
                                }}
                                className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors ml-auto"
                                > 
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                );
              })}
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
              <p className="text-sm font-bold text-slate-400">No jobs yet</p>
            </div>
          ) : shortlist.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center justify-center gap-3">
              <Star size={28} className="text-slate-200" />
              <p className="text-sm font-bold text-slate-400">No shortlisted candidates yet</p>
              <p className="text-xs text-slate-300">Candidates need AI screening scores to appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50">
                    {['#', 'Candidate', 'Match Score', 'Bucket', 'Status'].map(h => (
                      <th key={h} className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shortlist.map((app, i) => {
                    const tag = getScoreTag(app._score);
                    return (
                      <tr
                        key={app.id || app.applicantid}
                        onClick={() => onSelectApplicant?.(app.id || app.applicantid)}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 text-xs font-black text-slate-300">#{i + 1}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-800">{app.f_name} {app.l_name}</p>
                          <p className="text-[10px] text-slate-400">{app.applied_position}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${app._score}%`, background: tag.color }}
                              />
                            </div>
                            <span className="text-xs font-black" style={{ color: tag.color }}>{Math.round(app._score)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="text-[10px] font-black px-2.5 py-1 rounded-full border"
                            style={{ color: tag.color, borderColor: tag.color + '40', background: tag.color + '15' }}
                          >
                            {app.ai_job_match_bucket}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-500">{app.hiring_status || '—'}</span>
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

    </div>
  );
};

export default JobTab;
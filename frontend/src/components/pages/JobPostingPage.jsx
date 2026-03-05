// frontend/src/components/pages/JobPostingPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Briefcase, MapPin, Building2, ClipboardList, Star,
  Lightbulb, FileText, ChevronRight, Loader2, AlertCircle, Info,
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/admin';

// ProgressPro brand
const NAVY = '#1A3C6E';
const TEAL = '#00AECC';
const TEAL_LIGHT = '#E6F7FB';

const DEPT_COLORS = {
  IT:         'bg-blue-50 text-blue-700 border-blue-100',
  Creative:   'bg-violet-50 text-violet-700 border-violet-100',
  Marketing:  'bg-amber-50 text-amber-700 border-amber-100',
  HR:         'bg-[#E6F7FB] text-[#1A3C6E] border-[#b3e6f5]',
  Operations: 'bg-slate-50 text-slate-600 border-slate-200',
};

function deptBadge(dept) {
  return DEPT_COLORS[dept] || 'bg-slate-50 text-slate-600 border-slate-200';
}

const SectionBlock = ({ icon: Icon, color, title, content }) => {
  if (!content?.trim()) return null;
  const lines = content.split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  return (
    <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-7">
      <div className="flex items-center gap-2.5 mb-5">
        <div className={`p-2 rounded-xl ${color}`}>
          <Icon size={14} className="text-white" />
        </div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{title}</h3>
      </div>
      <ul className="space-y-2.5">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: TEAL }} />
            <span className="text-sm text-slate-600 leading-relaxed">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const JobPostingPage = () => {
  const { jobId } = useParams();
  const navigate  = useNavigate();
  const [job,     setJob]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/jobs/${jobId}`)
      .then(r => { setJob(r.data); setLoading(false); })
      .catch(() => { setError('This job posting could not be found.'); setLoading(false); });
  }, [jobId]);

  if (loading) return (
    <div className="min-h-screen bg-[#F3F7F6] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin" style={{ color: TEAL }} />
        <p className="text-sm text-slate-400 font-medium">Loading job posting…</p>
      </div>
    </div>
  );

  if (error || !job) return (
    <div className="min-h-screen bg-[#F3F7F6] flex items-center justify-center">
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-10 text-center max-w-sm">
        <AlertCircle size={32} className="text-rose-400 mx-auto mb-3" />
        <p className="font-black text-slate-700 mb-1">Job Not Found</p>
        <p className="text-sm text-slate-400">{error || 'This posting may have been removed.'}</p>
      </div>
    </div>
  );

  const isClosed = job.status === 'Closed';

  return (
    <div className="min-h-screen bg-[#F3F7F6] font-sans">

      {/* Top nav strip */}
      <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs shadow"
            style={{ background: NAVY }}
          >
            IH
          </div>
          <div>
            <span className="font-bold text-slate-700 text-sm">IntelliHire</span>
            <span className="text-slate-300 mx-1.5 text-xs">·</span>
            <span className="text-xs font-medium" style={{ color: TEAL }}>ProgressPro Services Inc.</span>
          </div>
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border"
          style={
            job.status === 'Open'
              ? { background: TEAL_LIGHT, color: NAVY, borderColor: '#b3e6f5' }
              : job.status === 'Draft'
              ? {}
              : { background: '#FFF1F2', color: '#BE123C', borderColor: '#FECDD3' }
          }
        >
          {job.status}
        </span>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-8">

        {/* Hero card */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm px-10 py-9 mb-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: TEAL_LIGHT }}>
              <Briefcase size={22} style={{ color: NAVY }} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-slate-800 leading-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {job.department && (
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${deptBadge(job.department)}`}>
                    {job.department}
                  </span>
                )}
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Building2 size={10} />
                  <span>ProgressPro Services Inc.</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <MapPin size={10} />
                  <span>Cebu, Philippines</span>
                </div>
              </div>
            </div>
            {job.applicant_limit && (
              <div className="text-right shrink-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Openings</p>
                <p className="text-2xl font-black" style={{ color: NAVY }}>{job.applicant_limit}</p>
              </div>
            )}
          </div>

          {/* Summary */}
          {job.job_summary && (
            <div className="mt-6 pt-6 border-t border-slate-50">
              <div className="flex items-center gap-2 mb-3">
                <Info size={13} style={{ color: TEAL }} />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">About this Role</p>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{job.job_summary}</p>
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-4">
          <SectionBlock icon={ClipboardList} color="bg-[#1A3C6E]" title="Key Responsibilities"    content={job.key_responsibilities} />
          <SectionBlock icon={Star}          color="bg-amber-400"  title="Required Qualifications" content={job.required_qualifications} />
          <SectionBlock icon={Lightbulb}     color="bg-violet-500" title="Preferred Qualifications" content={job.preferred_qualifications} />
          <SectionBlock icon={FileText}      color="bg-rose-400"   title="Key Competencies"        content={job.key_competencies} />
        </div>

        {/* Spacer for sticky bar */}
        <div className="h-28" />
      </div>

      {/* Sticky apply bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-slate-100 shadow-xl z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-slate-800">{job.title}</p>
            <p className="text-[10px] text-slate-400">{job.department} · ProgressPro Services Inc.</p>
          </div>
          {isClosed ? (
            <div className="px-8 py-3.5 bg-slate-100 text-slate-400 text-[11px] font-black uppercase tracking-widest rounded-2xl">
              Applications Closed
            </div>
          ) : (
            <button
              onClick={() => navigate('/', { state: { preselectedRole: job.title } })}
              className="flex items-center gap-2 px-8 py-3.5 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all"
              style={{
                background: `linear-gradient(135deg, ${NAVY} 0%, ${TEAL} 100%)`,
                boxShadow: `0 4px 14px ${TEAL}40`,
              }}
            >
              Apply Here
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default JobPostingPage;
// frontend/src/components/pages/JobPostingPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/config/api';
import {
  Briefcase, MapPin, Building2, ClipboardList, Star,
  Lightbulb, FileText, ChevronRight, Loader2, AlertCircle, Info
} from 'lucide-react';

const DEPT_COLORS = {
  IT:          'bg-blue-50 text-blue-700 border-blue-100',
  Creative:    'bg-violet-50 text-violet-700 border-violet-100',
  Marketing:   'bg-amber-50 text-amber-700 border-amber-100',
  HR:          'bg-emerald-50 text-emerald-700 border-emerald-100',
  Operations:  'bg-slate-50 text-slate-600 border-slate-200',
};

function deptBadge(dept) {
  return DEPT_COLORS[dept] || 'bg-slate-50 text-slate-600 border-slate-200';
}

// Renders a multi-line text field as a clean bullet list
const SectionBlock = ({ icon: Icon, color, title, content }) => {
  if (!content?.trim()) return null;
  const lines = content.split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  return (
    <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-7">
      <div className={`flex items-center gap-2.5 mb-5`}>
        <div className={`p-2 rounded-xl ${color}`}>
          <Icon size={14} className="text-white" />
        </div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{title}</h3>
      </div>
      <ul className="space-y-2.5">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2A5C9A]/40 mt-2 shrink-0" />
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
  const [job, setJob]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    api.get(`/jobs/${jobId}`)
      .then(r => { setJob(r.data); setLoading(false); })
      .catch(() => { setError('This job posting could not be found.'); setLoading(false); });
  }, [jobId]);

  if (loading) return (
    <div className="min-h-screen bg-[#F3F7F6] flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-[#2A5C9A]" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F3F7F6] flex items-center justify-center">
      <div className="text-center space-y-3">
        <AlertCircle size={40} className="text-rose-400 mx-auto" />
        <p className="text-slate-600 font-medium">{error}</p>
        <button onClick={() => navigate('/')} className="text-[#2A5C9A] text-sm font-bold hover:underline">
          Go back to apply
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F3F7F6] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#2A5C9A] rounded-xl flex items-center justify-center">
            <Briefcase size={14} className="text-white" />
          </div>
          <span className="text-sm font-black text-slate-800">IntelliHire</span>
        </div>
        <button
          onClick={() => navigate('/', { state: { preselectedRole: job?.title } })}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#2A5C9A] text-white text-sm font-black rounded-2xl hover:bg-[#1e4470] transition-colors"
        >
          Apply Now <ChevronRight size={14} />
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* Job title card */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">{job.title}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${deptBadge(job.department)}`}>
                  {job.department}
                </span>
                {job.status && (
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${job.status === 'Open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {job.status}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/', { state: { preselectedRole: job?.title } })}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#2A5C9A] text-white text-sm font-black rounded-2xl hover:bg-[#1e4470] transition-colors"
            >
              Apply <ChevronRight size={14} />
            </button>
          </div>

          {job.job_summary && (
            <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-4 mt-4">
              {job.job_summary}
            </p>
          )}
        </div>

        <SectionBlock icon={ClipboardList} color="bg-[#2A5C9A]"  title="Key Responsibilities"     content={job.key_responsibilities} />
        <SectionBlock icon={Star}          color="bg-amber-400"   title="Required Qualifications"   content={job.required_qualifications} />
        <SectionBlock icon={Info}          color="bg-violet-500"  title="Preferred Qualifications"  content={job.preferred_qualifications} />
        <SectionBlock icon={Lightbulb}     color="bg-emerald-500" title="Key Competencies"          content={job.key_competencies} />

        {/* CTA */}
        <div className="bg-[#2A5C9A] rounded-[2rem] p-8 text-center text-white space-y-4">
          <h2 className="text-xl font-black">Interested in this role?</h2>
          <p className="text-blue-100 text-sm">Submit your application and our team will review your profile.</p>
          <button
            onClick={() => navigate('/', { state: { preselectedRole: job?.title } })}
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-[#2A5C9A] font-black rounded-2xl hover:bg-blue-50 transition-colors"
          >
            <FileText size={16} /> Apply Now
          </button>
        </div>
      </main>
    </div>
  );
};

export default JobPostingPage;
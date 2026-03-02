import React, { useState, useMemo } from 'react';
import { Plus, Users, FileText } from 'lucide-react';

const JobTab = ({ jobs = [], applicants = [], onEdit, onDelete, onStatusUpdate }) => {
  const [activeView, setActiveView] = useState('status');

  const getApplicantCount = (jobTitle) => {
    return applicants.filter(
      (app) => app.applied_position?.toLowerCase() === jobTitle?.toLowerCase()
    ).length;
  };

  // Check any of the 4 structured description fields
  const hasJobDescription = (job) => {
    return (
      (typeof job?.key_responsibilities === 'string' && job.key_responsibilities.trim().length > 0) ||
      (typeof job?.required_qualifications === 'string' && job.required_qualifications.trim().length > 0) ||
      (typeof job?.preferred_qualifications === 'string' && job.preferred_qualifications.trim().length > 0) ||
      (typeof job?.key_competencies === 'string' && job.key_competencies.trim().length > 0)
    );
  };

  const groupedJobs = useMemo(() => {
    const groups = { Draft: [], Open: [], Closed: [] };
    jobs.forEach((job) => {
      const status = job.status || 'Draft';
      if (groups[status]) groups[status].push(job);
    });
    return groups;
  }, [jobs]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* TABS NAVIGATION */}
      <div className="flex gap-8 border-b border-slate-100 mb-6">
        {['Status', 'Department'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveView(tab.toLowerCase())}
            className={`pb-4 text-sm font-bold transition-all relative ${
              activeView === tab.toLowerCase()
                ? 'text-[#2A5C9A]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}
            {activeView === tab.toLowerCase() && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-[#2A5C9A] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {activeView === 'status' ? (
        /* STATUS VIEW — CARD BOARD */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {['Draft', 'Open', 'Closed'].map((status) => (
            <div key={status} className="flex flex-col gap-4">
              <h3 className="text-center font-black text-[#2A5C9A] text-lg uppercase tracking-widest mb-2">
                {status}
              </h3>

              <div className="space-y-4 p-2 min-h-[500px]">
                {status === 'Draft' && (
                  <button
                    onClick={() => onEdit(null)}
                    className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-[#2A5C9A] hover:text-[#2A5C9A] transition-all bg-white group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#2A5C9A] group-hover:text-white transition-all">
                      <Plus size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                      Create New Job
                    </span>
                  </button>
                )}

                {groupedJobs[status].map((job) => {
                  const count = getApplicantCount(job.title);
                  const limit = job.applicant_limit || 50;
                  const isFull = count >= limit;
                  const jdAdded = hasJobDescription(job);

                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => onEdit(job)}
                      className="w-full text-left bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-[#2A5C9A]/30 transition-all group relative border-l-4 border-l-[#2A5C9A] cursor-pointer"
                    >
                      <div className="flex items-start gap-2 mb-3">
                          <h4 className="font-bold text-[#2A5C9A] text-sm leading-tight group-hover:text-[#1e4470] transition-colors">
                            {job.title}
                          </h4>
                          {!jdAdded && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase tracking-tighter bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                              <FileText size={10} />
                              JD Missing
                            </span>
                          )}
                      </div>

                      <div className="flex flex-col w-full gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Users size={14} className="text-[#2A5C9A]" />
                            <span className="text-xs font-black text-slate-600">
                              {count}
                              <span className="text-slate-300 font-medium ml-1">/ {limit}</span>
                            </span>
                          </div>
                          {isFull && (
                            <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter bg-red-50 px-2 py-0.5 rounded-full">
                              Full
                            </span>
                          )}
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${isFull ? 'bg-red-400' : 'bg-[#10B981]'}`}
                            style={{ width: `${Math.min((count / limit) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {status === 'Draft' && (
                        <p className="mt-4 text-[10px] text-slate-300 italic font-medium">
                          Pending Approval
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* DEPARTMENT VIEW — TABLE */
        <div className="bg-white rounded-[2rem] border-2 border-[#2A5C9A]/10 shadow-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#E8F0F8] text-[#2A5C9A] text-[10px] font-black uppercase tracking-widest">
                <th className="px-8 py-5 border-r border-[#2A5C9A]/5">Job Title</th>
                <th className="px-8 py-5 border-r border-[#2A5C9A]/5">Department</th>
                <th className="px-8 py-5 border-r border-[#2A5C9A]/5">Status</th>
                <th className="px-8 py-5 border-r border-[#2A5C9A]/5">Applicants / Limit</th>
                <th className="px-8 py-5 border-r border-[#2A5C9A]/5">JD</th>
                <th className="px-8 py-5">Date Posted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {jobs.map((job) => {
                const count = getApplicantCount(job.title);
                const limit = job.applicant_limit || 50;
                const jdAdded = hasJobDescription(job);

                return (
                  <tr
                    key={job.id}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => onEdit(job)}
                  >
                    <td className="px-8 py-5">
                      <span className="font-bold text-slate-700 text-sm group-hover:text-[#2A5C9A] transition-colors">
                        {job.title}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                        {job.department}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          job.status === 'Open' ? 'bg-emerald-500'
                          : job.status === 'Closed' ? 'bg-red-500'
                          : 'bg-amber-500'
                        }`} />
                        <span className="text-slate-500 text-sm font-medium">{job.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-sm ${count >= limit ? 'text-red-500' : 'text-slate-700'}`}>
                          {count}
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-400 text-xs font-bold">{limit}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {jdAdded ? (
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-full">
                          Added
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter bg-amber-50 px-2 py-0.5 rounded-full">
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-slate-400 text-sm">
                      {job.created_at ? new Date(job.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default JobTab;
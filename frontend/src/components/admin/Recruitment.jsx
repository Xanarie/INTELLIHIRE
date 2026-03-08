// frontend/src/components/admin/Recruitment.jsx
import React, { useMemo } from 'react';
import { Trash2, MoreVertical, Briefcase, Clock3, Sparkles } from 'lucide-react';
import { getScoreTag } from '../../utils/scoreUtils';

const PIPELINE_STAGES = [
  "Pre-screening", "Screening", "Interview", "Offer", "Accepted", "Rejected",
];

// These columns show a minimal name-only card — no AI data, no clutter
const SIMPLE_CARD_STAGES = new Set(["Accepted", "Rejected"]);

const RecruitmentTab = ({ applicants = [], onSelect, onDelete }) => {
  const groupedApplicants = useMemo(() => {
    const groups = {};
    PIPELINE_STAGES.forEach(stage => { groups[stage] = []; });
    applicants.forEach(app => {
      const status = (app.hiring_status || '').trim().toLowerCase();
      const match  = PIPELINE_STAGES.find(s => s.toLowerCase() === status);
      (match ? groups[match] : groups['Pre-screening']).push(app);
    });
    return groups;
  }, [applicants]);

  const getMatchScore = (app) => {
    const raw = app.ai_job_match_score ?? app.ai_match_json?.score ?? app.ai_resume_score ?? null;
    return raw !== null ? Math.round(Number(raw)) : null;
  };

  const getExperience = (app) => {
    const sig = app.ai_resume_score_json?.breakdown?.experience_signals
             ?? app.ai_match_json?.breakdown?.experience_signals
             ?? null;
    if (sig === null) return null;
    if (sig >= 25) return 'Strong';
    if (sig >= 18) return 'Good';
    if (sig >= 12) return 'Moderate';
    return 'Limited';
  };

  return (
    <div className="bg-white rounded-[2rem] border-2 border-[#2A5C9A]/20 shadow-xl animate-in fade-in duration-500 h-full flex flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-x-auto">
        {PIPELINE_STAGES.map((stage, index) => (
          <div
            key={stage}
            className={`flex-1 min-w-[210px] flex flex-col border-r border-slate-100 min-h-0 ${
              index === PIPELINE_STAGES.length - 1 ? 'border-r-0' : ''
            }`}
          >
            {/* Column header */}
            <div className="bg-[#E8F0F8] px-4 py-3 border-b-2 border-[#2A5C9A]/20 flex items-center justify-between shrink-0">
              <h3 className="font-black text-[#2A5C9A] text-[10px] uppercase tracking-wider">{stage}</h3>
              <span className="text-[9px] font-black bg-[#2A5C9A]/10 text-[#2A5C9A] rounded-full px-2 py-0.5">
                {groupedApplicants[stage].length}
              </span>
            </div>

            {/* Cards */}
            <div className="p-3 space-y-3 bg-slate-50/30 pb-6 flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
              {groupedApplicants[stage].map((app) => {
                const id = app.id || app.applicantid || app.applicant_id;

                /* ── Accepted / Rejected: name only ── */
                if (SIMPLE_CARD_STAGES.has(stage)) {
                  return (
                    <div
                      key={id}
                      onClick={() => onSelect(id)}
                      className="px-4 py-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-[#2A5C9A]/40 transition-all cursor-pointer flex items-center justify-between gap-2"
                    >
                      <h4 className="font-bold text-[#2A5C9A] text-sm leading-tight truncate">
                        {app.f_name} {app.l_name}
                      </h4>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(e, id); }}
                        className="text-slate-200 hover:text-rose-500 transition-colors shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                }

                /* ── All other stages: full card ── */
                const matchScore = getMatchScore(app);
                const experience = getExperience(app);
                const tag        = matchScore !== null
                  ? getScoreTag(matchScore)
                  : (app.ai_job_match_bucket ? getScoreTag(app.ai_job_match_bucket) : null);

                return (
                  <div
                    key={id}
                    onClick={() => onSelect(id)}
                    className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-[#2A5C9A]/40 transition-all cursor-pointer"
                  >
                    {/* Name + delete */}
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-[#2A5C9A] text-sm leading-tight truncate pr-2">
                        {app.f_name} {app.l_name}
                      </h4>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(e, id); }}
                        className="text-slate-200 hover:text-rose-500 transition-colors shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Applied role */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Briefcase size={10} className="text-slate-300 shrink-0" />
                      <p className="text-[10px] text-slate-500 font-semibold truncate">
                        {app.applied_position || '—'}
                      </p>
                    </div>

                    {/* Experience */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <Clock3 size={10} className="text-slate-300 shrink-0" />
                      <p className="text-[10px] text-slate-400 font-medium">
                        {experience ? `${experience} exp.` : 'Exp. N/A'}
                      </p>
                    </div>

                    {/* Qualification tag */}
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tight mb-1.5 ${
                      tag
                        ? `${tag.bg} ${tag.text} ${tag.border}`
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}>
                      {tag && <span className={`w-1.5 h-1.5 rounded-full ${tag.dot}`} />}
                      {tag ? tag.label : 'Not Screened'}
                    </div>

                    {/* Score % */}
                    {matchScore !== null && (
                      <p className="text-[9px] font-bold text-slate-400 mb-2">{matchScore}%</p>
                    )}

                    {/* Recommended role */}
                    <div className="flex items-start gap-1 pt-1.5 border-t border-slate-50">
                      <Sparkles size={9} className="text-violet-400 mt-0.5 shrink-0" />
                      <p className="text-[9px] text-slate-400 leading-tight">
                        <span className="font-black uppercase tracking-tight">Rec: </span>
                        {app.ai_recommended_role || app.applied_position || '—'}
                      </p>
                    </div>
                  </div>
                );
              })}

              {groupedApplicants[stage].length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-slate-200">
                  <MoreVertical size={20} />
                  <p className="text-[10px] mt-2 font-medium">No candidates</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecruitmentTab;
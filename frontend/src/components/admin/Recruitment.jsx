// frontend/src/components/admin/Recruitment.jsx
// Changes: applicant cards now show Experience, Applied Role, Match Score

import React, { useMemo } from 'react';
import { Trash2, MoreVertical, Briefcase, Star, Clock3, Sparkles } from 'lucide-react';

const RecruitmentTab = ({ applicants = [], onSelect, onDelete, getStatusBadge }) => {
  const pipelineStages = [
    "Pre-screening", "Screening", "Interview", "Offer", "Hired", "Rejected"
  ];

  const groupedApplicants = useMemo(() => {
    const groups = {};
    pipelineStages.forEach(stage => groups[stage] = []);
    applicants.forEach(app => {
      const currentStatus = (app.hiring_status || "").trim().toLowerCase();
      const matchedStage = pipelineStages.find(s => s.toLowerCase() === currentStatus);
      if (matchedStage) groups[matchedStage].push(app);
      else groups["Pre-screening"].push(app);
    });
    return groups;
  }, [applicants]);

  // Pull match score from whichever AI field is available
  const getMatchScore = (app) => {
    const score =
      app.ai_job_match_score ??
      app.ai_match_json?.score ??
      app.ai_resume_score ??
      null;
    if (score === null) return null;
    return Math.round(Number(score));
  };

  // Map experience_signals (0-30 score from AI) to a readable label
  const getExperience = (app) => {
    const signals =
      app.ai_resume_score_json?.breakdown?.experience_signals ??
      app.ai_match_json?.breakdown?.experience_signals ??
      null;
    if (signals === null) return null;
    if (signals >= 25) return "Strong";
    if (signals >= 18) return "Good";
    if (signals >= 12) return "Moderate";
    return "Limited";
  };

  const scoreBadgeColor = (score) => {
    if (score === null) return 'text-slate-300';
    if (score >= 75) return 'text-emerald-600 bg-emerald-50';
    if (score >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-rose-500 bg-rose-50';
  };

  return (
    <div className="bg-white rounded-[2rem] border-2 border-[#2A5C9A]/20 shadow-xl animate-in fade-in duration-500 h-full flex flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-x-auto">
        {pipelineStages.map((stage, index) => (
          <div
            key={stage}
            className={`flex-1 min-w-[210px] flex flex-col border-r border-slate-100 min-h-0 ${
              index === pipelineStages.length - 1 ? 'border-r-0' : ''
            }`}
          >
            {/* Column Header — sticky so it stays visible while scrolling */}
            <div className="bg-[#E8F0F8] px-4 py-3 border-b-2 border-[#2A5C9A]/20 flex items-center justify-between shrink-0">
              <h3 className="font-black text-[#2A5C9A] text-[10px] uppercase tracking-wider">
                {stage}
              </h3>
              <span className="text-[9px] font-black bg-[#2A5C9A]/10 text-[#2A5C9A] rounded-full px-2 py-0.5">
                {groupedApplicants[stage].length}
              </span>
            </div>

            {/* Cards — scrollable independently per column */}
            <div className="p-3 space-y-3 bg-slate-50/30 pb-6 flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
              {groupedApplicants[stage].map((app) => {
                const targetId = app.id || app.applicantid || app.applicant_id;
                const matchScore = getMatchScore(app);
                const experience = getExperience(app);

                return (
                  <div
                    key={targetId}
                    onClick={() => onSelect(targetId)}
                    className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-[#2A5C9A]/40 transition-all cursor-pointer group"
                  >
                    {/* Name row */}
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-[#2A5C9A] text-sm leading-tight truncate pr-2">
                        {app.f_name} {app.l_name}
                      </h4>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(e, targetId); }}
                        className="text-slate-200 hover:text-rose-500 transition-colors shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Applied Role */}
                    <div className="flex items-center gap-1.5 mb-2">
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

                    {/* Match Score */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1">
                        <Star size={10} className="text-amber-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Match</span>
                      </div>
                      {matchScore !== null ? (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${scoreBadgeColor(matchScore)}`}>
                          {matchScore}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-medium">—</span>
                      )}
                    </div>

                    {/* Recommended Role */}
                    <div className="flex items-start gap-1 pt-1 border-t border-slate-50">
                      <Sparkles size={9} className="text-violet-400 mt-0.5 shrink-0" />
                      <p className="text-[9px] text-slate-400 leading-tight">
                        <span className="font-black uppercase tracking-tight">Rec: </span>
                        {app.ai_recommended_role || app.applied_position || '—'}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Empty slot placeholders */}
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
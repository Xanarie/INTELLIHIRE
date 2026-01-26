import React, { useMemo } from 'react';
import { Trash2, MoreVertical, Clock } from 'lucide-react';

const RecruitmentTab = ({ applicants = [], onSelect, onDelete, getStatusBadge }) => {
    const pipelineStages = [
        "Pre-screening",
        "Screening",
        "Interview",
        "Offer",
        "Hired",
        "Rejected"
    ];

    const groupedApplicants = useMemo(() => {
    const groups = {};
    pipelineStages.forEach(stage => groups[stage] = []);
    
    applicants.forEach(app => {
        const currentStatus = (app.hiring_status || "").trim().toLowerCase();
        
        const matchedStage = pipelineStages.find(s => 
            s.toLowerCase() === currentStatus
        );

        if (matchedStage) {
            groups[matchedStage].push(app);
        } else {
            groups["Pre-screening"].push(app);
        }
    });
    return groups;
}, [applicants]);

    return (
        <div className="bg-white rounded-[2rem] border-2 border-[#2A5C9A]/20 shadow-xl overflow-hidden animate-in fade-in duration-500">
            <div className="flex min-h-[700px] overflow-x-auto bg-white">
                {pipelineStages.map((stage, index) => (
                    <div 
                        key={stage} 
                        className={`flex-1 min-w-[200px] flex flex-col border-r border-slate-100 ${
                            index === pipelineStages.length - 1 ? 'border-r-0' : ''
                        }`}
                    >
                        {/* Header */}
                        <div className="bg-[#E8F0F8] p-4 border-b-2 border-[#2A5C9A]/30">
                            <h3 className="text-center font-black text-[#2A5C9A] text-xs uppercase tracking-tighter">
                                {stage}
                            </h3>
                        </div>

                        {/* Candidate Cards */}
                        <div className="p-3 space-y-3 flex-1 bg-white/50">
                            {groupedApplicants[stage].map((app) => {
                                // DETECT THE CORRECT ID FIELD
                                const targetId = app.id || app.applicantid || app.applicant_id;

                                return (
                                    <div 
                                        key={targetId} 
                                        onClick={() => {
                                            console.log("Opening Modal for ID:", targetId);
                                            onSelect(targetId);
                                        }}
                                        className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-[#2A5C9A]/60 transition-all cursor-pointer group relative"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-[#2A5C9A] text-sm truncate pr-2">
                                                {app.f_name} {app.l_name}
                                            </h4>
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevents modal from opening
                                                        onDelete(e, targetId);
                                                    }}
                                                    className="text-slate-300 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                                <MoreVertical size={14} className="text-slate-300" />
                                            </div>
                                        </div>
                                        
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                            {app.applied_position || 'Position'}
                                        </p>

                                        <div className="mt-3 flex items-center justify-between">
                                            <span className={`text-[9px] font-black ${getStatusBadge(app.hiring_status)}`}>
                                                {app.assessment_rating || '0'}%
                                            </span>
                                            <Clock size={10} className="text-slate-300" />
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {Array.from({ length: Math.max(0, 5 - groupedApplicants[stage].length) }).map((_, i) => (
                                <div key={i} className="h-20 border-b border-slate-50 opacity-40"></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecruitmentTab;
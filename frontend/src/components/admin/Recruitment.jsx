import React from 'react';
import { Trash2, MoreVertical, ExternalLink } from 'lucide-react';

const RecruitmentTab = ({ applicants, onSelect, onDelete, getStatusBadge, getAssessmentBadge }) => {
    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Applied Position</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessment</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {applicants.map((app) => {
                        // Ensure we grab the correct ID regardless of backend naming
                        const appId = app.id || app.applicantid;
                        
                        return (
                            <tr 
                                key={appId} 
                                onClick={() => onSelect(appId)}
                                className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                            >
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                                            {app.f_name?.charAt(0)}{app.l_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{app.f_name} {app.l_name}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{app.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-sm font-medium text-slate-600">
                                    {app.applied_position}
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(app.hiring_status)}`}>
                                        {app.hiring_status || 'Applied'}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`px-3 py-1 rounded-lg border text-[10px] font-bold ${getAssessmentBadge(app.assessment_rating)}`}>
                                        {app.assessment_rating || 'Pending'}
                                    </span>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevents opening detail panel
                                                onDelete(e, appId);
                                            }}
                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <button className="p-2 text-slate-300 hover:text-slate-600">
                                            <MoreVertical size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {applicants.length === 0 && (
                <div className="p-20 text-center">
                    <p className="text-slate-400 text-sm">No applicants found matching your search.</p>
                </div>
            )}
        </div>
    );
};

export default RecruitmentTab;
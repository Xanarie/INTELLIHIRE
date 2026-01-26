import React, { useMemo } from 'react';
import { UserCheck, Clock, Building2 } from 'lucide-react';

  const OnboardingTab = ({ applicants = [] }) => {
    const groupedByDept = useMemo(() => {
        const groups = {};
        applicants.forEach(app => {
            const dept = app.department || 'Unassigned';
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(app);
        });
        return groups;
    }, [applicants]);

  const displayDepts = Object.keys(groupedByDept).length > 0 
        ? Object.keys(groupedByDept) 
        : ['HR Department', 'IT Department', 'Marketing'];

    return (
      <div>

            {/* Department Columns Container */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {displayDepts.map((dept) => (
                    <div key={dept} className="flex flex-col gap-6">
                        {/* Column Header */}
                        <div className="flex items-center gap-2 border-b-2 border-blue-50 pb-2">
                            <Building2 size={20} className="text-blue-400" />
                            <h3 className="text-xl font-bold text-slate-700">{dept}</h3>
                        </div>

                        {/* List of Applicants in this Dept */}
                        <div className="space-y-4">
                            {groupedByDept[dept]?.length > 0 ? (
                                groupedByDept[dept].map((person) => (
                                    <div 
                                        key={person.id} 
                                        className="bg-white p-5 rounded-[1.5rem] border border-blue-50 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-black text-slate-800 group-hover:text-[#2A5C9A] transition-colors">
                                                {person.f_name} {person.l_name}
                                            </h4>
                                            <div className="bg-emerald-50 text-emerald-600 p-1 rounded-full">
                                                <Clock size={14} />
                                            </div>
                                        </div>
                                        <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                                            {person.applied_role || 'New Hire'}
                                        </p>
                                        
                                        {/* Progress Indicator */}
                                        <div className="mt-4 flex items-center gap-3">
                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="bg-emerald-500 h-full w-[45%] rounded-full"></div>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400">45%</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="border-2 border-dashed border-slate-100 rounded-[1.5rem] p-8 text-center">
                                    <p className="text-xs font-medium text-slate-300 uppercase tracking-widest">No Active Onboarding</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OnboardingTab;
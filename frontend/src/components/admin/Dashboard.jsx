import React from 'react';
import { Users, Briefcase, CheckCircle2 } from 'lucide-react';

const StatCard = ({ label, value, color, icon: Icon }) => (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className={`w-12 h-12 rounded-2xl ${color} text-white flex items-center justify-center mb-4`}>
            <Icon size={22} />
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <h3 className="text-3xl font-black text-slate-800 mt-1">{value}</h3>
    </div>
);

const DashboardTab = ({ applicants = [], jobs = [] }) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    label="Total Candidates" 
                    value={applicants?.length || 0} 
                    color="bg-emerald-500" 
                    icon={Users} 
                />
                <StatCard 
                    label="Active Positions" 
                    value={jobs?.filter(j => j.status === 'Open').length || 0} 
                    color="bg-blue-600" 
                    icon={Briefcase} 
                />
                <StatCard 
                    label="Finalized Hires" 
                    value="4" 
                    color="bg-slate-800" 
                    icon={CheckCircle2} 
                />
            </div>

            {/* Placeholder for future Charts/Recent Activity */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 min-h-[300px] flex items-center justify-center border-dashed border-2">
                <p className="text-slate-400 font-medium">Analytics & Recent Activity coming soon...</p>
            </div>
        </div>
    );
};

export default DashboardTab;
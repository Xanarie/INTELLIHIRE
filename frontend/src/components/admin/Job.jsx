import React from 'react';
import { Edit3, Trash2, Briefcase, Users, Power, PowerOff } from 'lucide-react';

const JobTab = ({ jobs, onEdit, onDelete, onStatusToggle }) => {
    
    // Internal helper to calculate tab-specific metrics
    const stats = {
        total: jobs.length,
        open: jobs.filter(j => j.status === 'Open').length,
        applicants: jobs.reduce((sum, j) => sum + (Number(j.applicants) || 0), 0)
    };

    return (
        <div className="space-y-6">
            {/* 1. MINI STATS BAR - Gives context to the current list */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Briefcase size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Roles</p>
                        <p className="text-lg font-black text-slate-800">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Power size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</p>
                        <p className="text-lg font-black text-slate-800">{stats.open}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Pool</p>
                        <p className="text-lg font-black text-slate-800">{stats.applicants}</p>
                    </div>
                </div>
            </div>

            {/* 2. MAIN TABLE */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <tr>
                            <th className="px-8 py-5">Job Title</th>
                            <th className="px-8 py-5">Department</th>
                            <th className="px-8 py-5">Status</th>
                            <th className="px-8 py-5">Applicants</th>
                            <th className="px-8 py-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {jobs.map((job) => (
                            <tr key={job.id} className={`hover:bg-slate-50/80 transition-colors group ${job.status === 'Closed' ? 'opacity-60' : ''}`}>
                                <td className="px-8 py-5">
                                    <div className="text-sm font-bold text-slate-700">{job.title}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">ID: #{job.id}</div>
                                </td>
                                <td className="px-8 py-5 text-sm text-slate-500 font-medium">{job.department}</td>
                                <td className="px-8 py-5">
                                    <button 
                                        onClick={() => onStatusToggle && onStatusToggle(job)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${
                                            job.status === 'Open' 
                                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                        }`}
                                    >
                                        <div className={`w-1 h-1 rounded-full ${job.status === 'Open' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                        {job.status}
                                    </button>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="text-sm font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                        {job.applicants} Applied
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => onEdit(job)} 
                                            title="Edit Position"
                                            className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => onDelete(job.id)} 
                                            title="Delete Position"
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {jobs.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-8 py-20 text-center text-slate-400 text-sm italic">
                                    No job positions match your current search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default JobTab;  
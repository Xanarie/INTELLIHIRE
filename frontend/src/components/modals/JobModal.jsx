import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const JobModal = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        title: '',
        department: 'IT',
        status: 'Draft',
        applicant_limit: 50,
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                // Ensure applicant_limit has a fallback if missing in DB
                applicant_limit: initialData.applicant_limit || 50 
            });
        } else {
            setFormData({
                title: '',
                department: 'IT',
                status: 'Draft',
                applicant_limit: 50,
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, initialData?.id); 
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
                
                {/* Header */}
                <div className="bg-[#10B981] p-6 text-center relative">
                    <h2 className="text-white font-bold text-lg uppercase tracking-wider">
                        {initialData ? 'Edit Position' : 'New Job'}
                    </h2>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="absolute right-6 top-6 text-white/80 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    {/* Job Title */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Job Title</label>
                        <input 
                            required
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-[#10B981] rounded-2xl px-5 py-3 text-sm transition-all outline-none"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            placeholder="e.g. Senior Software Developer"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Applicant Limit */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Limit</label>
                            <input 
                                type="number"
                                min="1"
                                required
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-[#10B981] outline-none"
                                value={formData.applicant_limit}
                                onChange={(e) => setFormData({...formData, applicant_limit: parseInt(e.target.value) || 0})}
                            />
                        </div>

                        {/* Department */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Dept</label>
                            <select 
                                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#10B981] outline-none appearance-none"
                                value={formData.department}
                                onChange={(e) => setFormData({...formData, department: e.target.value})}
                            >
                                <option value="IT">IT</option>
                                <option value="Creative">Creative</option>
                                <option value="Marketing">Marketing</option>
                                <option value="HR">HR</option>
                            </select>
                        </div>
                    </div>

                    {/* Status Toggle */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Status</label>
                        <div className="flex bg-slate-100 rounded-2xl p-1.5 mt-1">
                            {['Draft', 'Open', 'Closed'].map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setFormData({...formData, status: opt})}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${
                                        formData.status === opt 
                                        ? 'bg-white text-[#10B981] shadow-sm' 
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 px-6 py-4 rounded-2xl bg-[#10B981] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#059669] shadow-lg shadow-emerald-100 transition-all"
                        >
                            {initialData ? 'Update' : 'Confirm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JobModal;
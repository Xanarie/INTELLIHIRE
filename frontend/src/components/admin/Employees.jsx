import React, { useState } from 'react';
import { X, UserPlus, Eye, EyeOff, Shield, Trash2 } from 'lucide-react';

const ROLE_OPTIONS = ['Recruiter', 'Admin'];

const EmployeeTab = ({ employees = [], onSave, onDelete }) => {
    const [isModalOpen,  setIsModalOpen]  = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [newEmp, setNewEmp] = useState({
        name:            '',
        email:           '',
        password:        '',
        permission_role: 'Recruiter',
    });

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        if (onSave) {
            await onSave(newEmp);
            setIsModalOpen(false);
            setNewEmp({ name: '', email: '', password: '', permission_role: 'Recruiter' });
            setShowPassword(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center px-4">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[#2A5C9A] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all"
                >
                    <UserPlus size={18} /> Add Employee
                </button>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-blue-100 shadow-sm min-h-[60vh]">
                <div className="mb-8">
                    <h3 className="text-xl font-black text-[#2A5C9A]">Current Staff</h3>
                    <div className="h-1 w-12 bg-blue-400 mt-1 rounded-full" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {employees.map((emp) => (
                        <div
                            key={emp.id || emp.email}
                            className="relative border border-blue-200 rounded-2xl p-6 flex flex-col items-center text-center bg-white hover:border-[#2A5C9A] hover:shadow-xl transition-all duration-300 group"
                        >
                            {/* Delete button */}
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(emp.id)}
                                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                                    title="Delete employee"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}

                            <div className="w-20 h-20 bg-blue-50 rounded-full mb-4 flex items-center justify-center overflow-hidden ring-4 ring-blue-50/50">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}`} alt="avatar" />
                            </div>
                            <h3 className="text-sm font-black text-[#2A5C9A] mb-1">{emp.name}</h3>
                            {emp.email && (
                                <p className="text-[10px] text-slate-400 truncate w-full mb-2">{emp.email}</p>
                            )}
                            {emp.permission_role && (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                                    emp.permission_role === 'Admin'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-slate-100 text-slate-500'
                                }`}>
                                    <Shield size={9} />
                                    {emp.permission_role}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800">New Employee</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddEmployee} className="space-y-4">

                            {/* Full Name */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
                                <input
                                    className="w-full bg-slate-50 border-none rounded-xl p-4 mt-1 outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-[#2A5C9A]"
                                    placeholder="e.g. John Doe"
                                    value={newEmp.name}
                                    required
                                    onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-slate-50 border-none rounded-xl p-4 mt-1 outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-[#2A5C9A]"
                                    placeholder="e.g. john@progresspro.com"
                                    value={newEmp.email}
                                    required
                                    onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                                <div className="relative mt-1">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="w-full bg-slate-50 border-none rounded-xl p-4 pr-12 outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-[#2A5C9A]"
                                        placeholder="Min. 6 characters"
                                        value={newEmp.password}
                                        required
                                        minLength={6}
                                        onChange={(e) => setNewEmp({ ...newEmp, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Permission */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Permission</label>
                                <select
                                    className="w-full bg-slate-50 border-none rounded-xl p-4 mt-1 outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-[#2A5C9A] text-sm font-semibold text-slate-700"
                                    value={newEmp.permission_role}
                                    onChange={(e) => setNewEmp({ ...newEmp, permission_role: e.target.value })}
                                >
                                    {ROLE_OPTIONS.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-400 mt-1 ml-1">
                                    {newEmp.permission_role === 'Admin'
                                        ? 'Full access to all features including Employees and Onboarding.'
                                        : 'Access to Recruitment, Jobs, AI Screening, and Activity Logs only.'}
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 text-slate-400 font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-[#2A5C9A] text-white font-bold rounded-xl shadow-lg shadow-blue-900/20"
                                >
                                    Add Employee
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeTab;
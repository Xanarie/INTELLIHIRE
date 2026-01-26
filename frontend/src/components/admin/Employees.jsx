import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';

const EmployeeTab = ({ employees = [], onSave }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEmp, setNewEmp] = useState({ name: '', role: '', dept: 'General' });

    const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    if (onSave) {
        await onSave(newEmp); 
        setIsModalOpen(false); 
        setNewEmp({ name: '', role: '', dept: '' }); 
    } else {
        console.error("The onSave prop was not passed to EmployeeTab!");
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
                    <div className="h-1 w-12 bg-blue-400 mt-1 rounded-full"></div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Map through the employees passed from the database */}
                    {employees.map((emp) => (
                        <div key={emp.id || emp.name} className="border border-blue-200 rounded-2xl p-6 flex flex-col items-center text-center bg-white hover:border-[#2A5C9A] hover:shadow-xl transition-all duration-300">
                            <div className="w-20 h-20 bg-blue-50 rounded-full mb-4 flex items-center justify-center overflow-hidden ring-4 ring-blue-50/50">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}`} alt="avatar" />
                            </div>
                            <h3 className="text-sm font-black text-[#2A5C9A] mb-1">{emp.name}</h3>
                            <p className="text-[11px] font-bold text-blue-400 uppercase">{emp.role}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal remains the same */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800">New Employee</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleAddEmployee} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
                                <input 
                                    className="w-full bg-slate-50 border-none rounded-xl p-4 mt-1 outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-[#2A5C9A]"
                                    placeholder="e.g. John Doe"
                                    value={newEmp.name}
                                    required
                                    onChange={(e) => setNewEmp({...newEmp, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Job Title</label>
                                <input 
                                    className="w-full bg-slate-50 border-none rounded-xl p-4 mt-1 outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-[#2A5C9A]"
                                    placeholder="e.g. Software Engineer"
                                    value={newEmp.role}
                                    required
                                    onChange={(e) => setNewEmp({...newEmp, role: e.target.value})}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-[#2A5C9A] text-white font-bold rounded-xl shadow-lg shadow-blue-900/20">Add Staff</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeTab;
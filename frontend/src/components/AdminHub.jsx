import React, { useState, useMemo } from 'react';
import { useAdminData } from '../hooks/useAdminData';
import { 
    LayoutDashboard, Users, Briefcase, Sparkles, 
    Search, Plus, LogOut, X, Save, TrendingUp, CheckCircle2 
} from 'lucide-react';

// Tab Components - Ensure these files exist in the /admin folder!
import RecruitmentTab from "./admin/Recruitment";
import JobTab from "./admin/Job";
import OnboardingTab from "./admin/Onboarding";
import AITab from "./admin/AI";
import ApplicantDetail from "../components/ApplicantDetail";

const AdminPortal = () => {
    // Safety check: ensure hook data exists
    const adminData = useAdminData() || {};
    const { 
        applicants = [], 
        jobs = [], 
        loading = false, 
        handleSaveJob, 
        handleDeleteJob, 
        handleDeleteApplicant, 
        refresh 
    } = adminData;
    
    const [activeTab, setActiveTab] = useState('applicants');
    const [searchTerm, setSearchTerm] = useState("");
    const [collapsed, setCollapsed] = useState(false);
    const [selectedApplicantId, setSelectedApplicantId] = useState(null);
    const [isJobModalOpen, setIsJobModalOpen] = useState(false);
    const [editingJob, setEditingJob] = useState(null);

    // --- Search Logic ---
    const filteredApplicants = useMemo(() => (applicants || []).filter(app => 
        `${app?.f_name || ''} ${app?.l_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    ), [applicants, searchTerm]);

    const filteredJobs = useMemo(() => (jobs || []).filter(j => 
        (j?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    ), [jobs, searchTerm]);TTTTTYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY

    return (
        <div className="flex h-screen w-full bg-[#F3F7F6] overflow-hidden font-sans text-slate-900">
            {/* Sidebar */}
            <aside className={`bg-white border-r border-slate-100 p-6 flex flex-col transition-all duration-300 z-30 ${collapsed ? 'w-20' : 'w-64'}`}>
                <Brand collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} />
                <nav className="flex flex-col gap-1 flex-1 mt-10">
                    <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} collapsed={collapsed} />
                    <NavItem icon={Users} label="Applicants" active={activeTab === 'applicants'} onClick={() => setActiveTab('applicants')} collapsed={collapsed} />
                    <NavItem icon={Briefcase} label="Jobs" active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')} collapsed={collapsed} />
                    <NavItem icon={Sparkles} label="AI" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} collapsed={collapsed} />
                </nav>
                <button className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-500 transition-colors mt-auto">
                    <LogOut size={18} /> {!collapsed && <span className="text-sm font-medium">Logout</span>}
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 capitalize tracking-tight">{activeTab}</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Admin Management</p>
                    </div>
                    <div className="flex gap-4">
                        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder={activeTab} />
                        {activeTab === 'jobs' && (
                            <button 
                                onClick={() => { setEditingJob(null); setIsJobModalOpen(true); }} 
                                className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                            >
                                <Plus size={18} /> New Job
                            </button>
                        )}
                    </div>
                </header>

                {/* Tab Switcher */}
                {activeTab === 'dashboard' && <DashboardStats applicants={applicants} jobs={jobs} />}
                {activeTab === 'applicants' && (
                    <RecruitmentTab 
                        applicants={filteredApplicants} 
                        onSelect={setSelectedApplicantId} 
                        onDelete={(e, id) => handleDeleteApplicant(id)} 
                    />
                )}
                {activeTab === 'jobs' && (
                    <JobTab 
                        jobs={filteredJobs} 
                        onEdit={(job) => { setEditingJob(job); setIsJobModalOpen(true); }} 
                        onDelete={handleDeleteJob} 
                    />
                )}
                {activeTab === 'onboarding' && <OnboardingTab />}
                {activeTab === 'ai' && <AITab />}
            </main>

            {/* Job Modal */}
            {isJobModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
                        <JobForm 
                            initialData={editingJob} 
                            onSave={(data) => { handleSaveJob(data, editingJob?.id); setIsJobModalOpen(false); }} 
                            onClose={() => setIsJobModalOpen(false)} 
                        />
                    </div>
                </div>
            )}
            
            {/* Applicant Detail Slide-over */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-[100] transform transition-transform duration-500 ease-in-out border-l border-slate-100 ${selectedApplicantId ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedApplicantId && (
                    <ApplicantDetail 
                        applicantId={selectedApplicantId} 
                        onClose={() => setSelectedApplicantId(null)} 
                        onRefresh={refresh} 
                    />
                )}
            </div>
            {selectedApplicantId && <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-[90]" onClick={() => setSelectedApplicantId(null)} />}
        </div>
    );
};

// --- Sub-Components ---
const LoadingScreen = () => (
    <div className="h-screen w-full flex items-center justify-center bg-[#F3F7F6]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
    </div>
);

const Brand = ({ collapsed, toggle }) => (
    <div className={`flex items-center gap-3 mb-10 px-2 cursor-pointer ${collapsed ? 'justify-center' : ''}`} onClick={toggle}>
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg">IH</div>
        {!collapsed && <span className="text-xl font-bold tracking-tight">IntelliHire</span>}
    </div>
);

const NavItem = ({ icon: Icon, label, active, onClick, collapsed }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-emerald-500 text-white font-bold' : 'text-slate-400 hover:bg-slate-50'} ${collapsed ? 'justify-center' : ''}`}
    >
        <Icon size={18} />
        {!collapsed && <span className="text-sm">{label}</span>}
    </button>
);

const SearchBar = ({ value, onChange, placeholder }) => (
    <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
        <input 
            className="bg-white rounded-xl py-2.5 pl-10 pr-10 text-sm w-72 shadow-sm border outline-none" 
            placeholder={`Search ${placeholder}...`} 
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

const DashboardStats = ({ applicants, jobs }) => (
    <div className="grid grid-cols-3 gap-6">
        <StatCard label="Total Candidates" value={applicants?.length || 0} color="bg-emerald-500" icon={Users} trend="+12%" />
        <StatCard label="Active Positions" value={jobs?.filter(j => j.status === 'Open').length || 0} color="bg-blue-600" icon={Briefcase} trend="+2" />
        <StatCard label="Finalized Hires" value="4" color="bg-slate-800" icon={CheckCircle2} trend="+1" />
    </div>
);

const StatCard = ({ label, value, color, icon: Icon, trend }) => (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className={`w-12 h-12 rounded-2xl ${color} text-white flex items-center justify-center mb-4`}><Icon size={22} /></div>
        <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
        <h3 className="text-3xl font-black text-slate-800 mt-1">{value}</h3>
    </div>
);

const JobForm = ({ initialData, onClose, onSave }) => {
    const [formData, setFormData] = useState(initialData || { title: '', department: '', status: 'Open' });
    return (
        <div className="p-8 space-y-4">
            <h2 className="text-xl font-bold">{initialData ? 'Edit Job' : 'New Job'}</h2>
            <input className="w-full border p-2 rounded" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Title" />
            <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 p-2 bg-slate-100 rounded">Cancel</button>
                <button onClick={() => onSave(formData)} className="flex-1 p-2 bg-emerald-500 text-white rounded">Save</button>
            </div>
        </div>
    );
};

export default AdminPortal;
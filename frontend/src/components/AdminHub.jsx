<<<<<<< HEAD
import React, { useState, useMemo, useEffect } from 'react';
import { useAdminData } from '../hooks/useAdminData';
import { useJobData }   from '../hooks/useJobData';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Sparkles,
  Search,
  LogOut,
  X,
  CheckCircle2,
} from 'lucide-react';

import RecruitmentTab  from "./admin/Recruitment";
import DashboardTab    from "./admin/Dashboard";
import EmployeeTab     from "./admin/Employees";
import JobTab          from "./admin/Job";
import OnboardingTab   from "./admin/Onboarding";
import AITab           from "./admin/AI";
import ApplicantDetail from "./ApplicantDetail";
import JobModal        from './modals/JobModal';

const AdminPortal = () => {
  // ── Data hooks ───────────────────────────────────────────────────────────────
  const {
    applicants,
    employees,
    loading: appLoading,
    handleSaveEmployee,
    handleDeleteApplicant,
    refresh: refreshApplicants,
  } = useAdminData();

  const {
    jobs,
    jobsLoading,
    handleSaveJob,
    handleDeleteJob,
    refreshJobs,
  } = useJobData();

  const loading = appLoading || jobsLoading;
  const refresh = () => { refreshApplicants(); refreshJobs(); };

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem('intellihire_active_tab') || 'recruitment'
  );
  const [searchTerm, setSearchTerm]                       = useState('');
  const [collapsed, setCollapsed]                         = useState(false);
  const [selectedApplicantId, setSelectedApplicantId]     = useState(null);
  const [isJobModalOpen, setIsJobModalOpen]               = useState(false);
  const [editingJob, setEditingJob]                       = useState(null);
  const [toast, setToast]                                 = useState(null);

  const switchTab = (tab) => {
    localStorage.setItem('intellihire_active_tab', tab);
    setActiveTab(tab);
    setSearchTerm('');
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredApplicants = useMemo(
    () => applicants.filter(app =>
      `${app?.f_name || ''} ${app?.l_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [applicants, searchTerm]
  );

  const filteredJobs = useMemo(
    () => jobs.filter(j =>
      (j?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [jobs, searchTerm]
  );

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('hired'))     return 'bg-emerald-100 text-emerald-700';
    if (s.includes('rejected'))  return 'bg-rose-100 text-rose-700';
    if (s.includes('interview')) return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
  };

  const getAssessmentBadge = (rating) => {
    const score = parseInt(rating, 10) || 0;
    if (score >= 80) return 'border-emerald-200 text-emerald-600 bg-emerald-50';
    if (score >= 50) return 'border-amber-200 text-amber-600 bg-amber-50';
    return 'border-slate-200 text-slate-400 bg-slate-50';
  };

  const onboardingApplicants = useMemo(
    () => applicants.filter(app =>
      (app?.status || app?.hiring_status || '').toLowerCase() === 'onboarding'
    ),
    [applicants]
  );

  // Keep editingJob in sync with live jobs state while modal is open
  useEffect(() => {
    if (!isJobModalOpen) return;
    if (!editingJob?.id) return;
    const latest = jobs.find(j => j.id === editingJob.id);
    if (!latest) return;
    setEditingJob(prev => {
      if (!prev) return latest;
      return JSON.stringify(prev) === JSON.stringify(latest) ? prev : latest;
    });
  }, [jobs, isJobModalOpen, editingJob?.id]);

  const handleStatusUpdate = async (job, newStatus) => {
    const result = await handleSaveJob({ ...job, status: newStatus }, job.id);
    if (result?.ok) {
      setToast({ type: 'success', message: result.message || `Job moved to ${newStatus}` });
      return;
    }
    setToast({ type: 'error', message: result?.message || 'Failed to update job status.' });
  };

  const handleSaveJobWithToast = async (payload, jobId) => {
    const result = await handleSaveJob(payload, jobId);
    if (result?.ok) {
      setToast({ type: 'success', message: result.message || 'Saved.' });
      if (result?.job) setEditingJob(result.job);
      return true;
    }
    setToast({ type: 'error', message: result?.message || 'Save failed.' });
    return false;
  };

  const handleEditJob    = (job) => { setEditingJob(job); setIsJobModalOpen(true); };
  const handleCloseJobModal = () => { setIsJobModalOpen(false); setEditingJob(null); };

  if (loading) return <LoadingScreen />;

  const isRecruitment = activeTab === 'recruitment';

  return (
    <div className="flex h-screen w-full bg-[#F3F7F6] overflow-hidden font-sans text-slate-900">

      {/* Sidebar */}
      <aside className={`bg-white border-r border-slate-100 p-6 flex flex-col transition-all duration-300 z-30 shrink-0 ${collapsed ? 'w-20' : 'w-64'}`}>
        <Brand collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} />
        <nav className="flex flex-col gap-1 flex-1 mt-10">
          <NavItem icon={LayoutDashboard} label="Dashboard"   active={activeTab === 'dashboard'}   onClick={() => switchTab('dashboard')}   collapsed={collapsed} />
          <NavItem icon={Users}           label="Recruitment" active={activeTab === 'recruitment'} onClick={() => switchTab('recruitment')} collapsed={collapsed} />
          <NavItem icon={Users}           label="Onboarding"  active={activeTab === 'onboarding'}  onClick={() => switchTab('onboarding')}  collapsed={collapsed} />
          <NavItem icon={Users}           label="Employee"    active={activeTab === 'employee'}    onClick={() => switchTab('employee')}    collapsed={collapsed} />
          <NavItem icon={Briefcase}       label="Jobs"        active={activeTab === 'jobs'}        onClick={() => switchTab('jobs')}        collapsed={collapsed} />
          <NavItem icon={Sparkles}        label="AI"          active={activeTab === 'ai'}          onClick={() => switchTab('ai')}          collapsed={collapsed} />
        </nav>
        <button className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-500 transition-colors mt-auto">
          <LogOut size={18} /> {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </aside>

      {/* Main */}
      <main className={`flex-1 flex flex-col min-w-0 ${isRecruitment ? 'overflow-hidden' : 'overflow-y-auto'}`}>

        {/* Header */}
        <header className="shrink-0 flex justify-between items-center px-8 pt-8 pb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800 capitalize tracking-tight">{activeTab}</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Admin Management</p>
          </div>
          <div className="flex gap-4">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder={activeTab} />
          </div>
        </header>

        {/* Tab content */}

        {activeTab === 'dashboard' && (
          <div className="px-8 pb-8">
            <DashboardTab applicants={applicants} jobs={jobs} />
          </div>
        )}

        {activeTab === 'recruitment' && (
          <div className="flex-1 min-h-0 px-8 pb-8 flex flex-col">
            <RecruitmentTab
              applicants={filteredApplicants}
              onSelect={setSelectedApplicantId}
              onDelete={(e, id) => handleDeleteApplicant(id)}
              getStatusBadge={getStatusBadge}
              getAssessmentBadge={getAssessmentBadge}
            />
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="px-8 pb-8">
            <JobTab
              jobs={filteredJobs}
              applicants={applicants}
              onEdit={handleEditJob}
              onDelete={async (id) => {
                const result = await handleDeleteJob(id);
                if (result?.ok) setToast({ type: 'success', message: result.message || 'Deleted.' });
                else if (result?.message && result.message !== 'Cancelled.') setToast({ type: 'error', message: result.message });
              }}
              onStatusUpdate={handleStatusUpdate}
            />
          </div>
        )}

        {activeTab === 'employee' && (
          <div className="px-8 pb-8">
            <EmployeeTab
              employees={employees}
              onSave={async (emp) => {
                const result = await handleSaveEmployee(emp);
                if (result?.ok) setToast({ type: 'success', message: result.message || 'Employee saved.' });
                else setToast({ type: 'error', message: result?.message || 'Employee save failed.' });
                return result?.ok === true;
              }}
            />
          </div>
        )}

        {activeTab === 'onboarding' && (
          <div className="px-8 pb-8">
            <OnboardingTab applicants={onboardingApplicants} onRefresh={refresh} />
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="px-8 pb-8">
            <AITab applicants={applicants} jobs={jobs} onSelectApplicant={setSelectedApplicantId} />
          </div>
        )}

      </main>

      {/* Job Modal */}
      <JobModal
        isOpen={isJobModalOpen}
        onClose={handleCloseJobModal}
        onSave={handleSaveJobWithToast}
        initialData={editingJob}
      />

      {/* Applicant Detail slide-over */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-[100] transform transition-transform duration-500 ease-in-out border-l border-slate-100 ${selectedApplicantId ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedApplicantId && (
          <ApplicantDetail
            applicantId={selectedApplicantId}
            onClose={() => setSelectedApplicantId(null)}
            onRefresh={refresh}
          />
        )}
      </div>
      {selectedApplicantId && (
        <div
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-[90]"
          onClick={() => setSelectedApplicantId(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200]">
          <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border ${toast.type === 'success' ? 'bg-white border-emerald-100' : 'bg-white border-rose-100'}`}>
            <div className={`mt-0.5 ${toast.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {toast.type === 'success' ? <CheckCircle2 size={18} /> : <X size={18} />}
            </div>
            <div className="min-w-[220px]">
              <div className="text-sm font-bold text-slate-800">{toast.type === 'success' ? 'Success' : 'Error'}</div>
              <div className="text-xs text-slate-500 mt-0.5">{toast.message}</div>
            </div>
            <button type="button" onClick={() => setToast(null)} className="ml-2 text-slate-300 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const LoadingScreen = () => (
  <div className="h-screen w-full flex items-center justify-center bg-[#F3F7F6]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
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

=======
import React, { useState, useMemo } from 'react';
import { useAdminData } from '../hooks/useAdminData';
import { 
    LayoutDashboard, Users, Briefcase, Sparkles, 
    Search, Plus, LogOut, X, Save, TrendingUp, CheckCircle2 
} from 'lucide-react';

import RecruitmentTab from "./admin/Recruitment";
import DashboardTab from "./admin/Dashboard";
import EmployeeTab from "./admin/Employees";
import JobTab from "./admin/Job";
import OnboardingTab from "./admin/Onboarding";
import AITab from "./admin/AI";
import ApplicantDetail from "./ApplicantDetail";
import JobModal from './modals/JobModal';

const AdminPortal = () => {
    const adminData = useAdminData() || {};
    const { 
        applicants = [], 
        jobs = [], 
        loading = false, 
        employees = [],
        handleSaveEmployee,
        handleSaveJob, 
        handleDeleteJob, 
        handleDeleteApplicant, 
        refresh 
    } = adminData;
    
    const [activeTab, setActiveTab] = useState('recruitment');
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
    ), [jobs, searchTerm]);
    const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('hired')) return 'bg-emerald-100 text-emerald-700';
    if (s.includes('rejected')) return 'bg-rose-100 text-rose-700';
    if (s.includes('interview')) return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
    };

    const getAssessmentBadge = (rating) => {
    const score = parseInt(rating) || 0;
    if (score >= 80) return 'border-emerald-200 text-emerald-600 bg-emerald-50';
    if (score >= 50) return 'border-amber-200 text-amber-600 bg-amber-50';
    return 'border-slate-200 text-slate-400 bg-slate-50';
    };

    const onboardingApplicants = useMemo(() => 
    applicants.filter(app => app.status?.toLowerCase() === 'onboarding'),
    [applicants]
    );

    const handleStatusUpdate = async (job, newStatus) => {
    const success = await handleSaveJob({ ...job, status: newStatus }, job.id);
    if (success) {
        console.log(`Job moved to ${newStatus}`);
        refresh(); 
    }
    };

    return (
        <div className="flex h-screen w-full bg-[#F3F7F6] overflow-hidden font-sans text-slate-900">
            {/* Sidebar */}
            <aside className={`bg-white border-r border-slate-100 p-6 flex flex-col transition-all duration-300 z-30 ${collapsed ? 'w-20' : 'w-64'}`}>
                <Brand collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} />
                <nav className="flex flex-col gap-1 flex-1 mt-10">
                    <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} collapsed={collapsed} />
                    <NavItem icon={Users} label="Recruitment" active={activeTab === 'recruitment'} onClick={() => setActiveTab('recruitment')} collapsed={collapsed} />
                    <NavItem icon={Users} label="Onboarding" active={activeTab === 'onboarding'} onClick={() => setActiveTab('onboarding')} collapsed={collapsed} />
                    <NavItem icon={Users} label="Employee" active={activeTab === 'employee'} onClick={() => setActiveTab('employee')} collapsed={collapsed} />
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
                        </div>
                </header>

                {/* Tab Switcher */}
                {activeTab === 'dashboard' && <DashboardTab applicants={applicants} jobs={jobs} />}
                {activeTab === 'recruitment' && ( 
                    <RecruitmentTab 
                    applicants={filteredApplicants} 
                    onSelect={setSelectedApplicantId} 
                    onDelete={(e, id) => handleDeleteApplicant(id)} 
                    getStatusBadge={getStatusBadge} 
                    getAssessmentBadge={getAssessmentBadge} 
                    />)
                }
                {activeTab === 'jobs' && (
                    <JobTab 
                        jobs={filteredJobs} 
                        onEdit={(job) => { setEditingJob(job); setIsJobModalOpen(true); }}
                        applicants={applicants}
                        onDelete={handleDeleteJob} 
                    />
                )}
                {activeTab === 'employee' && (
                    <EmployeeTab 
                        employees={employees} 
                        onSave={handleSaveEmployee} 
                    />
            )}
                {activeTab === 'onboarding' && (
                    <OnboardingTab 
                        applicants={onboardingApplicants} 
                        onRefresh={refresh}
                    />
                )}
                {activeTab === 'ai' && <AITab />}
            </main>

            <JobModal 
            isOpen={isJobModalOpen}
            onClose={() => { setIsJobModalOpen(false); setEditingJob(null); }}
            onSave={handleSaveJob} 
            initialData={editingJob}
            />
            
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


>>>>>>> 05ef615b6d098f2c2a9b43995a0643c6bbcd19a2
export default AdminPortal;
// frontend/src/components/AdminHub.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAdminData } from '../hooks/useAdminData';
import { useJobData }   from '../hooks/useJobData';
import {
  LayoutDashboard, Users, Briefcase, Sparkles,
  Search, LogOut, X, CheckCircle2, GraduationCap, ScrollText,
} from 'lucide-react';
import { buildFlagMap } from '../utils/flagUtils';

import RecruitmentTab  from "./admin/Recruitment";
import DashboardTab    from "./admin/Dashboard";
import EmployeeTab     from "./admin/Employees";
import JobTab          from "./admin/Job";
import OnboardingTab   from "./admin/Onboarding";
import AITab           from "./admin/AI";
import ActivityLog     from "./admin/ActivityLog";
import ApplicantDetail from "./ApplicantDetail";
import JobModal        from './modals/JobModal';
import { useNavigate } from 'react-router-dom';

// ── ProgressPro brand ─────────────────────────────────────────────────────────
const NAVY      = '#1A3C6E';
const TEAL      = '#00AECC';
const TEAL_LIGHT = '#E6F7FB';

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',   label: 'Dashboard',     icon: LayoutDashboard, searchable: false },
  { id: 'recruitment', label: 'Recruitment',   icon: Users,           searchable: true  },
  { id: 'onboarding',  label: 'Onboarding',    icon: GraduationCap,   searchable: false },
  { id: 'employee',    label: 'Employees',     icon: Users,           searchable: true  },
  { id: 'jobs',        label: 'Jobs',          icon: Briefcase,       searchable: true  },
  { id: 'ai',          label: 'AI Screening',  icon: Sparkles,        searchable: false },
  { id: 'logs',        label: 'Activity Logs', icon: ScrollText,      searchable: false },
];

// ── Sub-components ────────────────────────────────────────────────────────────

const LoadingScreen = () => (
  <div className="h-screen w-full flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: TEAL }} />
  </div>
);

const Brand = ({ collapsed, toggle }) => (
  <div
    className={`flex items-center gap-3 cursor-pointer px-1 ${collapsed ? 'justify-center' : ''}`}
    onClick={toggle}
  >
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-md shrink-0"
      style={{ background: NAVY }}
    >
      IH
    </div>
    {!collapsed && (
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-800 leading-none">IntelliHire</p>
        <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: TEAL }}>
          ProgressPro
        </p>
      </div>
    )}
  </div>
);

const NavItem = ({ icon: Icon, label, active, onClick, collapsed }) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${collapsed ? 'justify-center' : ''}`}
    style={active ? { background: TEAL_LIGHT, color: NAVY, fontWeight: 700 } : {}}
  >
    <Icon
      size={17}
      style={{ color: active ? NAVY : undefined }}
      className={active ? '' : 'text-slate-400'}
    />
    {!collapsed && <span className={active ? '' : 'text-slate-500'}>{label}</span>}
    {!collapsed && active && (
      <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: TEAL }} />
    )}
  </button>
);

const SearchBar = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
    <input
      className="bg-white rounded-xl py-2.5 pl-9 pr-8 text-sm w-64 shadow-sm border border-slate-200 outline-none focus:border-slate-400 transition-colors placeholder:text-slate-300"
      placeholder={`Search ${placeholder}…`}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
    {value && (
      <button
        onClick={() => onChange('')}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
      >
        <X size={13} />
      </button>
    )}
  </div>
);



// ── Main component ────────────────────────────────────────────────────────────

const AdminPortal = () => {
  

const navigate = useNavigate();

useEffect(() => {
  const token = localStorage.getItem('token');
  const role  = localStorage.getItem('role'); // if you store admin role

  // Redirect if not logged in or not admin
  if (!token || role !== 'admin') {
    navigate('/login');
  }
}, [navigate]);

  const {
    applicants, employees, loading: appLoading,
    handleSaveEmployee, handleDeleteApplicant, refresh: refreshApplicants,
  } = useAdminData();

  const {
    jobs, jobsLoading, handleSaveJob, handleDeleteJob, refreshJobs,
  } = useJobData();

  const loading = appLoading || jobsLoading;
  const refresh = () => { refreshApplicants(); refreshJobs(); };

  const [activeTab,           setActiveTab]           = useState(() => localStorage.getItem('intellihire_active_tab') || 'recruitment');
  const [searchTerm,          setSearchTerm]          = useState('');
  const [collapsed,           setCollapsed]           = useState(false);
  const [selectedApplicantId, setSelectedApplicantId] = useState(null);
  const [isJobModalOpen,      setIsJobModalOpen]      = useState(false);
  const [editingJob,          setEditingJob]          = useState(null);
  const [ ,               setToast]               = useState(null);

  // Document title
  useEffect(() => {
    const meta = TABS.find(t => t.id === activeTab);
    document.title = meta?.label ?? activeTab;
  }, [activeTab]);

  const switchTab = tab => {
    localStorage.setItem('intellihire_active_tab', tab);
    setActiveTab(tab);
    setSearchTerm('');
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Filtered slices
  const filteredApplicants = useMemo(
    () => applicants.filter(app => {
      const term = searchTerm.toLowerCase();
      return (
        `${app?.f_name || ''} ${app?.l_name || ''}`.toLowerCase().includes(term) ||
        (app?.applied_position || '').toLowerCase().includes(term) ||
        (app?.email || '').toLowerCase().includes(term)
      );
    }),
    [applicants, searchTerm]
  );

  const filteredEmployees = useMemo(
    () => employees.filter(e =>
      `${e?.f_name || ''} ${e?.l_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [employees, searchTerm]
  );

  const filteredJobs = useMemo(
    () => jobs.filter(j =>
      (j?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j?.department || '').toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [jobs, searchTerm]
  );

  const flagMap = useMemo(() => buildFlagMap(applicants), [applicants]);

  const onboardingApplicants = useMemo(
    () => applicants.filter(app => (app?.status || app?.hiring_status || '').toLowerCase() === 'onboarding'),
    [applicants]
  );

  const getStatusBadge = status => {
    const s = status?.toLowerCase() || '';
    if (s.includes('hired'))     return 'bg-emerald-100 text-emerald-700';
    if (s.includes('rejected'))  return 'bg-rose-100 text-rose-700';
    if (s.includes('interview')) return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
  };

  const getAssessmentBadge = rating => {
    const score = parseInt(rating, 10) || 0;
    if (score >= 80) return 'border-emerald-200 text-emerald-600 bg-emerald-50';
    if (score >= 50) return 'border-amber-200 text-amber-600 bg-amber-50';
    return 'border-slate-200 text-slate-400 bg-slate-50';
  };

  useEffect(() => {
    if (!isJobModalOpen || !editingJob?.id) return;
    const latest = jobs.find(j => j.id === editingJob.id);
    if (!latest) return;
    setEditingJob(prev =>
      !prev || JSON.stringify(prev) === JSON.stringify(latest) ? prev : latest
    );
  }, [jobs, isJobModalOpen, editingJob?.id]);

  const handleStatusUpdate = async (job, newStatus) => {
    const result = await handleSaveJob({ ...job, status: newStatus }, job.id);
    if (result?.ok) setToast({ type: 'success', message: result.message || `Job moved to ${newStatus}` });
    else            setToast({ type: 'error',   message: result?.message || 'Failed to update job status.' });
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

  const handleEditJob    = job => { setEditingJob(job); setIsJobModalOpen(true); };
  const handleCloseJobModal = () => { setIsJobModalOpen(false); setEditingJob(null); };

  if (loading) return <LoadingScreen />;

  const isRecruitment = activeTab === 'recruitment';
  const activeTabMeta = TABS.find(t => t.id === activeTab);
  const showSearch    = activeTabMeta?.searchable ?? false;

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-900">

      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-slate-100 flex flex-col transition-all duration-300 z-30 shrink-0 ${
          collapsed ? 'w-[68px] px-3 py-5' : 'w-60 px-5 py-6'
        }`}
      >
        <Brand collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} />
        <nav className="flex flex-col gap-0.5 flex-1 mt-8">
          {TABS.map(({ id, label, icon }) => (
            <NavItem
              key={id} icon={icon} label={label}
              active={activeTab === id}
              onClick={() => switchTab(id)}
              collapsed={collapsed}
            />
          ))}
        </nav>
      <button
       onClick={() => {
    
      setToast({ type: 'success', message: 'Logged out successfully.' });
      localStorage.removeItem("token");
      localStorage.removeItem("role");

      setTimeout(() => window.location.href = "/login", 1500);
        }}
        className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-rose-500 transition-colors mt-2 rounded-xl hover:bg-rose-50 text-sm"
        style={collapsed ? { justifyContent: 'center' } : {}}
      >
        <LogOut size={17} />
        {!collapsed && <span className="font-medium">Logout</span>}
      z</button>
      </aside>

      {/* Main */}
      <main className={`flex-1 flex flex-col min-w-0 ${isRecruitment ? 'overflow-hidden' : 'overflow-y-auto'}`}>

        {/* Header */}
        <header className="shrink-0 flex justify-between items-center px-8 pt-7 pb-5 bg-slate-50 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              {activeTabMeta?.label ?? activeTab}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              IntelliHire — ProgressPro Services Inc.
            </p>
          </div>
          {showSearch && (
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder={activeTabMeta?.label ?? activeTab} />
          )}
        </header>

        {/* Tab content */}
        {activeTab === 'dashboard' && (
          <div className="px-8 py-8"><DashboardTab applicants={applicants} jobs={jobs} onSelectApplicant={setSelectedApplicantId} /></div>
        )}

        {activeTab === 'recruitment' && (
          <div className="flex-1 min-h-0 px-8 py-6 flex flex-col">
            <RecruitmentTab
              applicants={filteredApplicants}
              flagMap={flagMap}
              onSelect={setSelectedApplicantId}
              onDelete={(e, id) => handleDeleteApplicant(id)}
              getStatusBadge={getStatusBadge}
              getAssessmentBadge={getAssessmentBadge}
            />
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="px-8 py-8">
            <JobTab
              jobs={filteredJobs} applicants={applicants}
              onEdit={handleEditJob}
              onSelectApplicant={setSelectedApplicantId}
              onDelete={async id => {
                const result = await handleDeleteJob(id);
                if (result?.ok) setToast({ type: 'success', message: result.message || 'Deleted.' });
                else if (result?.message && result.message !== 'Cancelled.')
                  setToast({ type: 'error', message: result.message });
              }}
              onStatusUpdate={handleStatusUpdate}
            />
          </div>
        )}

        {activeTab === 'employee' && (
          <div className="px-8 py-8">
            <EmployeeTab
              employees={filteredEmployees}
              onSave={async emp => {
                const result = await handleSaveEmployee(emp);
                if (result?.ok) setToast({ type: 'success', message: result.message || 'Employee saved.' });
                else setToast({ type: 'error', message: result?.message || 'Employee save failed.' });
                return result?.ok === true;
              }}
            />
          </div>
        )}

        {activeTab === 'onboarding' && (
          <div className="px-8 py-8">
            <OnboardingTab applicants={onboardingApplicants} onRefresh={refresh} onSelectApplicant={setSelectedApplicantId} />
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="px-8 py-8">
            <AITab applicants={applicants} jobs={jobs} onSelectApplicant={setSelectedApplicantId} />
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="px-8 py-8">
            <ActivityLog />
          </div>
        )}

      </main>

      {/* Job Modal */}
      <JobModal isOpen={isJobModalOpen} onClose={handleCloseJobModal} onSave={handleSaveJobWithToast} initialData={editingJob} />

      {/* Applicant Detail slide-over */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-[100] transform transition-transform duration-500 ease-in-out border-l border-slate-100 ${selectedApplicantId ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedApplicantId && (
          <ApplicantDetail
            applicantId={selectedApplicantId}
            flagMap={flagMap}
            onClose={() => setSelectedApplicantId(null)}
            onRefresh={refresh}
          />
        )}
      </div>
      {selectedApplicantId && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-[90]" onClick={() => setSelectedApplicantId(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200]">
          <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border bg-white ${toast.type === 'success' ? 'border-emerald-100' : 'border-rose-100'}`}>
            <div className={`mt-0.5 ${toast.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {toast.type === 'success' ? <CheckCircle2 size={18} /> : <X size={18} />}
            </div>
            <div className="min-w-[220px]">
              <div className="text-sm font-bold text-slate-800">{toast.type === 'success' ? 'Success' : 'Error'}</div>
              <div className="text-xs text-slate-500 mt-0.5">{toast.message}</div>
            </div>
            <button type="button" onClick={() => setToast(null)} className="ml-2 text-slate-300 hover:text-slate-500 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPortal;
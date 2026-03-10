// frontend/src/components/AdminHub.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAdminData } from '../hooks/useAdminData';
import { useJobData }   from '../hooks/useJobData';
import {
  LayoutDashboard, Users, Briefcase, Sparkles,
  Search, LogOut, X, CheckCircle2, GraduationCap, ScrollText,
  Settings, Eye, EyeOff, ChevronRight, Shield, Lock, Mail, User,
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
import {
  onAuthStateChanged, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential,
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useNotifications, pushNotification } from '../hooks/useNotifications';
import NotificationBell from './NotificationBell';

// ── ProgressPro brand ─────────────────────────────────────────────────────────
const NAVY       = '#1A3C6E';
const TEAL       = '#00AECC';
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

const RECRUITER_RESTRICTED_TABS = new Set(['onboarding', 'employee']);

// ── Permissions breakdown ─────────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  Admin: [
    'View and manage all applicant profiles',
    'Create, edit, and delete job postings',
    'Move applicants through hiring stages',
    'Access AI screening and scoring results',
    'Manage employee records and accounts',
    'View and export activity logs',
    'Access onboarding workflows',
    'Manage system settings and user accounts',
    'View dashboard analytics and reports',
  ],
  Recruiter: [
    'View and manage all applicant profiles',
    'Create, edit, and delete job postings',
    'Move applicants through hiring stages',
    'Access AI screening and scoring results',
    'View and export activity logs',
    'View dashboard analytics and reports',
  ],
};

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

// ── Permissions Side Panel ────────────────────────────────────────────────────
const PermissionsPanel = ({ role, onClose }) => (
  <div className="absolute inset-0 bg-white z-10 flex flex-col">
    <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
      <button
        onClick={onClose}
        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
      >
        <ChevronRight size={16} className="rotate-180" />
      </button>
      <div>
        <p className="text-sm font-black text-slate-800">Permissions</p>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Role-based access overview</p>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
      <div className="flex gap-2 flex-wrap">
        {Object.keys(ROLE_PERMISSIONS).map(r => (
          <div
            key={r}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border"
            style={r === role
              ? { background: TEAL_LIGHT, color: NAVY, borderColor: '#b3e6f5' }
              : { background: '#f8fafc', color: '#94a3b8', borderColor: '#e2e8f0' }
            }
          >
            <Shield size={11} />
            {r}
            {r === role && (
              <span
                className="ml-1 px-1.5 py-0.5 text-[9px] font-black rounded-full text-white"
                style={{ background: TEAL }}
              >
                YOU
              </span>
            )}
          </div>
        ))}
      </div>

      {Object.entries(ROLE_PERMISSIONS).map(([r, perms]) => (
        <div key={r}>
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">{r} Access</p>
          <ul className="space-y-2">
            {perms.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: r === role ? TEAL : '#cbd5e1' }}
                />
                <span className={`text-sm leading-relaxed ${r === role ? 'text-slate-700' : 'text-slate-400'}`}>
                  {p}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
);

// ── Password Input ────────────────────────────────────────────────────────────
const PwInput = ({ label, value, onChange, show, onToggle }) => (
  <div>
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400 transition-colors pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  </div>
);

// ── Settings Panel ────────────────────────────────────────────────────────────
const SettingsPanel = ({ onClose, onToast, currentUserRole }) => {
  const user        = auth.currentUser;
  const displayRole = currentUserRole || 'Admin';
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Admin User';

  const [showPermissions, setShowPermissions] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCur,   setShowCur]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      onToast({ type: 'error', message: 'Please fill in all password fields.' });
      return;
    }
    if (newPw !== confirmPw) {
      onToast({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (newPw.length < 6) {
      onToast({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    try {
      setPwLoading(true);
      const credential = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      onToast({ type: 'success', message: 'Password updated successfully.' });
    } catch (err) {
      const msg =
        err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
          ? 'Current password is incorrect.'
          : err.message;
      onToast({ type: 'error', message: msg });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden">

      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
        <div>
          <p className="text-base font-black text-slate-800">Settings</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Manage your account</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        <div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3">
            Account Information
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: TEAL_LIGHT }}>
                <User size={14} style={{ color: NAVY }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: TEAL_LIGHT }}>
                <Mail size={14} style={{ color: NAVY }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.email || '—'}</p>
              </div>
            </div>

            <button
              onClick={() => setShowPermissions(true)}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: TEAL_LIGHT }}>
                <Shield size={14} style={{ color: NAVY }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Permissions</p>
                <p className="text-sm font-semibold text-slate-800">{displayRole}</p>
              </div>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lock size={13} className="text-slate-400" />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Change Password</p>
          </div>
          <div className="space-y-3">
            <PwInput label="Current Password"     value={currentPw} onChange={setCurrentPw} show={showCur}  onToggle={() => setShowCur(v => !v)} />
            <PwInput label="New Password"         value={newPw}     onChange={setNewPw}     show={showNew}  onToggle={() => setShowNew(v => !v)} />
            <PwInput label="Confirm New Password" value={confirmPw} onChange={setConfirmPw} show={showConf} onToggle={() => setShowConf(v => !v)} />
            <button
              onClick={handleChangePassword}
              disabled={pwLoading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 mt-1"
              style={{ background: NAVY }}
            >
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>

      </div>

      <div
        className={`absolute inset-0 transform transition-transform duration-300 ease-in-out ${
          showPermissions ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <PermissionsPanel
          role={displayRole}
          onClose={() => setShowPermissions(false)}
        />
      </div>

    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const AdminPortal = () => {
  const navigate = useNavigate();

  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) navigate('/login');
      else setAuthChecked(true);
    });
    return () => unsubscribe();
  }, [navigate]);

  const {
    applicants, employees, loading: appLoading,
    handleSaveEmployee, handleDeleteEmployee, handleDeleteApplicant, refresh: refreshApplicants,
  } = useAdminData();

  const {
    jobs, jobsLoading, handleSaveJob, handleDeleteJob, refreshJobs,
  } = useJobData();

  const loading = appLoading || jobsLoading;
  const refresh = () => { refreshApplicants(); refreshJobs(); };

  const currentUserRole = useMemo(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return 'Admin';
    const match = employees.find(e => e.uid === uid);
    return match?.permission_role || 'Admin';
  }, [employees]);

  const visibleTabs = useMemo(() => {
    if (currentUserRole === 'Admin') return TABS;
    return TABS.filter(t => !RECRUITER_RESTRICTED_TABS.has(t.id));
  }, [currentUserRole]);

  const [activeTab,           setActiveTab]           = useState(() => localStorage.getItem('intellihire_active_tab') || 'recruitment');
  const [searchTerm,          setSearchTerm]          = useState('');
  const [collapsed,           setCollapsed]           = useState(false);
  const [selectedApplicantId, setSelectedApplicantId] = useState(null);
  const [isJobModalOpen,      setIsJobModalOpen]      = useState(false);
  const [editingJob,          setEditingJob]          = useState(null);
  const [toast,               setToast]               = useState(null);
  const [isSettingsOpen,      setIsSettingsOpen]      = useState(false);
  const { notifications, unreadCount, popupQueue, markAllRead, dismissPopup } = useNotifications();

  useEffect(() => {
    if (currentUserRole !== 'Admin' && RECRUITER_RESTRICTED_TABS.has(activeTab)) {
      setActiveTab('recruitment');
    }
  }, [currentUserRole, activeTab]);

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
      `${e?.name || ''} ${e?.email || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
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
    () => applicants.filter(app => (app?.hiring_status || '').toLowerCase() === 'accepted'),
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
    if (result?.ok) {
      setToast({ type: 'success', message: result.message || `Job moved to ${newStatus}` });
      pushNotification(`moved job "${job.title}" to ${newStatus}`, 'jobs', job.id);
    } else {
      setToast({ type: 'error', message: result?.message || 'Failed to update job status.' });
    }
  };

  const handleSaveJobWithToast = async (payload, jobId) => {
    const result = await handleSaveJob(payload, jobId);
    if (result?.ok) {
      setToast({ type: 'success', message: result.message || 'Saved.' });
      if (result?.job) setEditingJob(result.job);
      const action = jobId ? 'updated' : 'created';
      pushNotification(`${action} job "${payload.title}"`, 'jobs', result.job?.id || jobId);
      return true;
    }
    setToast({ type: 'error', message: result?.message || 'Save failed.' });
    return false;
  };

  const handleEditJob       = job => { setEditingJob(job); setIsJobModalOpen(true); };
  const handleCloseJobModal = ()  => { setIsJobModalOpen(false); setEditingJob(null); };

  if (!authChecked || loading) return <LoadingScreen />;

  const isRecruitment = activeTab === 'recruitment';
  const activeTabMeta = TABS.find(t => t.id === activeTab);
  const showSearch    = activeTabMeta?.searchable ?? false;

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-900">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={`bg-white border-r border-slate-100 flex flex-col transition-all duration-300 z-30 shrink-0 ${
          collapsed ? 'w-[68px] px-3 py-5' : 'w-60 px-5 py-6'
        }`}
      >
        <Brand collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} />
        <nav className="flex flex-col gap-0.5 flex-1 mt-8">
          {visibleTabs.map(({ id, label, icon }) => (
            <NavItem
              key={id} icon={icon} label={label}
              active={activeTab === id}
              onClick={() => switchTab(id)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <button
          onClick={() => setIsSettingsOpen(true)}
          title={collapsed ? 'Settings' : undefined}
          className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-slate-700 transition-colors mt-2 rounded-xl hover:bg-slate-100 text-sm"
          style={collapsed ? { justifyContent: 'center' } : {}}
        >
          <Settings size={17} />
          {!collapsed && <span className="font-medium">Settings</span>}
        </button>

        <button
          onClick={() => {
            auth.signOut();
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            navigate('/login');
          }}
          title={collapsed ? 'Logout' : undefined}
          className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-rose-500 transition-colors mt-1 rounded-xl hover:bg-rose-50 text-sm"
          style={collapsed ? { justifyContent: 'center' } : {}}
        >
          <LogOut size={17} />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className={`flex-1 flex flex-col min-w-0 ${isRecruitment ? 'overflow-hidden' : 'overflow-y-auto'}`}>

        <header className="shrink-0 flex justify-between items-center px-8 pt-7 pb-5 bg-slate-50 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              {activeTabMeta?.label ?? activeTab}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              IntelliHire — ProgressPro Services Inc.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {showSearch && (
              <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder={activeTabMeta?.label ?? activeTab} />
            )}
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              popupQueue={popupQueue}
              markAllRead={markAllRead}
              dismissPopup={dismissPopup}
              currentUid={auth.currentUser?.uid}
              onNavigate={(tab, entityId) => {
                switchTab(tab);
                if (entityId) setSelectedApplicantId(entityId);
              }}
            />
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="px-8 py-8">
            <DashboardTab applicants={applicants} jobs={jobs} onSelectApplicant={setSelectedApplicantId} />
          </div>
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
                if (result?.ok) {
                  setToast({ type: 'success', message: result.message || 'Employee saved.' });
                  pushNotification(`added employee ${emp.name || ''}`.trim(), 'employee');
                } else {
                  setToast({ type: 'error', message: result?.message || 'Employee save failed.' });
                }
                return result?.ok === true;
              }}
              onDelete={async id => {
                const result = await handleDeleteEmployee(id);
                if (result?.ok) setToast({ type: 'success', message: result.message || 'Employee deleted.' });
                else if (result?.message && result.message !== 'Cancelled.')
                  setToast({ type: 'error', message: result.message });
              }}
            />
          </div>
        )}
        {activeTab === 'onboarding' && (
          <div className="px-8 py-8">
            <OnboardingTab
              applicants={onboardingApplicants}
              jobs={jobs}
              onRefresh={refresh}
              onSelectApplicant={setSelectedApplicantId}
              onNotify={pushNotification}
            />
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

      {/* ── Job Modal ───────────────────────────────────────────────────────── */}
      <JobModal isOpen={isJobModalOpen} onClose={handleCloseJobModal} onSave={handleSaveJobWithToast} initialData={editingJob} />

      {/* ── Applicant Detail slide-over ──────────────────────────────────────── */}
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

      {/* ── Settings slide-over ──────────────────────────────────────────────── */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-[110] transform transition-transform duration-500 ease-in-out border-l border-slate-100 ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {isSettingsOpen && (
          <SettingsPanel
            onClose={() => setIsSettingsOpen(false)}
            onToast={setToast}
            currentUserRole={currentUserRole}
          />
        )}
      </div>
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-[105]" onClick={() => setIsSettingsOpen(false)} />
      )}

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200]">
          <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border bg-white ${
            toast.type === 'success' ? 'border-emerald-100' : 'border-rose-100'
          }`}>
            <div className={`mt-0.5 ${toast.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {toast.type === 'success' ? <CheckCircle2 size={18} /> : <X size={18} />}
            </div>
            <div className="min-w-[220px]">
              <div className="text-sm font-bold text-slate-800">
                {toast.type === 'success' ? 'Success' : 'Error'}
              </div>
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
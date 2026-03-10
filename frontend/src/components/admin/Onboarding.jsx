import React, { useState, useMemo, useCallback } from 'react';
import { CheckSquare, Square, UserCheck, XCircle, Building2, Briefcase, AlertTriangle } from 'lucide-react';

import { api } from '../../config/api';
const NAVY = '#1A3C6E';
const TEAL = '#00AECC';
const TEAL_LIGHT = '#E6F7FB';

const CHECKLIST_ITEMS = [
  { key: 'accountCredentials', label: 'Account Credentials' },
  { key: 'trainingMaterials',  label: 'Training Materials'  },
  { key: 'onboardingMeeting',  label: 'Onboarding Meeting'  },
  { key: 'clientAssignment',   label: 'Client Assignment'   },
];

const DEFAULT_CHECKLIST = {
  accountCredentials: false,
  trainingMaterials:  false,
  onboardingMeeting:  false,
  clientAssignment:   false,
};

// ── Confirmation Modal ────────────────────────────────────────────────────────
const ConfirmModal = ({ type, name, onConfirm, onCancel, loading }) => {
  const isOnboard = type === 'onboard';
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">

        {/* Icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: isOnboard ? TEAL_LIGHT : '#fff1f2' }}
        >
          {isOnboard
            ? <UserCheck size={22} style={{ color: TEAL }} />
            : <AlertTriangle size={22} className="text-rose-500" />
          }
        </div>

        {/* Title */}
        <p className="text-base font-black text-slate-800 text-center">
          {isOnboard ? 'Confirm Onboarding' : 'Confirm Rejection'}
        </p>
        <p className="text-sm text-slate-500 text-center mt-1.5 leading-relaxed">
          {isOnboard
            ? <>Are you sure you want to fully onboard <span className="font-bold text-slate-700">{name}</span>? This will archive their record.</>
            : <>Are you sure you want to reject <span className="font-bold text-slate-700">{name}</span>? Their status will be set to Rejected in the Recruitment board.</>
          }
        </p>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: isOnboard ? NAVY : '#ef4444' }}
          >
            {loading ? 'Processing…' : isOnboard ? 'Onboard' : 'Reject'}
          </button>
        </div>

      </div>
    </div>
  );
};

// ── Candidate Card ────────────────────────────────────────────────────────────
const CandidateCard = ({ person, onStatusChange, onNotify, onSwitchTab }) => {
  const id = person.id || person.applicantid || person.applicant_id;
  const name = `${person.f_name} ${person.l_name}`;

  const [checklist, setChecklist] = useState({ ...DEFAULT_CHECKLIST });
  const [confirm,   setConfirm]   = useState(null); // 'onboard' | 'reject' | null
  const [loading,   setLoading]   = useState(false);

  const allChecked = Object.values(checklist).every(Boolean);

  const toggleItem = (key) =>
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));

  const handleAction = useCallback(async () => {
    if (!confirm) return;
    try {
      setLoading(true);
      const newStatus = confirm === 'onboard' ? 'Archived' : 'Rejected';
      await api.patch(`/applicants/${id}`, { hiring_status: newStatus });
      if (onNotify) {
        const msg = newStatus === 'Archived'
          ? `fully onboarded ${name}`
          : `rejected ${name} during onboarding`;
        onNotify(msg, newStatus === 'Archived' ? 'onboarding' : 'recruitment', id);
      }
      onStatusChange(id, newStatus);
      if (onSwitchTab) onSwitchTab('recruitment');
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setLoading(false);
      setConfirm(null);
    }
  }, [confirm, id, name, onStatusChange, onNotify, onSwitchTab]);

  return (
    <>
      <div className="bg-white rounded-[1.5rem] border border-blue-50 shadow-sm hover:shadow-md transition-all p-5">

        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <h4 className="font-black text-slate-800 text-sm leading-tight">{name}</h4>
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-emerald-50">
            <UserCheck size={13} className="text-emerald-600" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mb-4">
          <Briefcase size={10} className="text-blue-300 shrink-0" />
          <p className="text-xs font-bold text-blue-400 uppercase tracking-wider truncate">
            {person.endorsed_position || person.applied_position || 'New Hire'}
          </p>
        </div>

        {/* Checklist */}
        <div className="space-y-2 mb-5">
          {CHECKLIST_ITEMS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleItem(key)}
              className="w-full flex items-center gap-3 text-left group"
            >
              {checklist[key]
                ? <CheckSquare size={16} style={{ color: TEAL }} className="shrink-0" />
                : <Square      size={16} className="text-slate-300 group-hover:text-slate-400 shrink-0 transition-colors" />
              }
              <span className={`text-sm transition-colors ${checklist[key] ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
            <span>Progress</span>
            <span>{Object.values(checklist).filter(Boolean).length} / {CHECKLIST_ITEMS.length}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(Object.values(checklist).filter(Boolean).length / CHECKLIST_ITEMS.length) * 100}%`,
                background: allChecked ? TEAL : '#94a3b8',
              }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setConfirm('onboard')}
            disabled={!allChecked}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: allChecked ? NAVY : '#94a3b8' }}
            title={!allChecked ? 'Complete all checklist items first' : undefined}
          >
            <UserCheck size={13} />
            Onboard
          </button>
          <button
            onClick={() => setConfirm('reject')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-all"
          >
            <XCircle size={13} />
            Reject
          </button>
        </div>

      </div>

      {/* Confirmation modal */}
      {confirm && (
        <ConfirmModal
          type={confirm}
          name={name}
          loading={loading}
          onConfirm={handleAction}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const OnboardingTab = ({ applicants = [], jobs = [], onRefresh, onSelectApplicant, onNotify, onSwitchTab }) => {
  const [localApplicants, setLocalApplicants] = useState(applicants);

  // Keep in sync when parent refreshes
  React.useEffect(() => { setLocalApplicants(applicants); }, [applicants]);

  const handleStatusChange = useCallback((id, newStatus) => {
    // Optimistically remove from this view
    setLocalApplicants(prev => prev.filter(a => (a.id || a.applicantid || a.applicant_id) !== id));
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  const groupedByDept = useMemo(() => {
    const groups = {};
    localApplicants.forEach(app => {
      const endorsedJob = jobs.find(j => j.title === app.endorsed_position);
      const dept = endorsedJob?.department || app.department || 'Unassigned';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(app);
    });
    return groups;
  }, [localApplicants, jobs]);

  if (localApplicants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-slate-400">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: TEAL_LIGHT }}>
          <UserCheck size={24} style={{ color: TEAL }} />
        </div>
        <p className="text-sm font-semibold text-slate-600">No candidates in onboarding</p>
        <p className="text-xs text-slate-400 mt-1">Move candidates to the Accepted column in Recruitment to begin onboarding.</p>
      </div>
    );
  }

  const departments = Object.keys(groupedByDept);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {departments.map(dept => (
          <div key={dept} className="flex flex-col gap-6">

            {/* Column Header */}
            <div className="flex items-center gap-2 border-b-2 border-blue-50 pb-2">
              <Building2 size={20} className="text-blue-400" />
              <h3 className="text-xl font-bold text-slate-700">{dept}</h3>
              <span className="ml-auto text-[10px] font-black bg-blue-50 text-blue-400 px-2 py-0.5 rounded-full">
                {groupedByDept[dept].length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-4">
              {groupedByDept[dept].map(person => (
                <CandidateCard
                  key={person.id || person.applicantid || person.applicant_id}
                  person={person}
                  onStatusChange={handleStatusChange}
                  onNotify={onNotify}
                  onSwitchTab={onSwitchTab}
                />
              ))}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default OnboardingTab;
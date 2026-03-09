import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  RefreshCw, Trash2, User, Briefcase, Users,
  Cpu, Filter, ChevronDown, RotateCcw,
} from 'lucide-react';

import { api } from '../config/api';

const NAVY       = '#1A3C6E';
const TEAL       = '#00AECC';
const TEAL_LIGHT = '#E6F7FB';

const ACTION_META = {
  status_changed:     { label: 'Stage Changed',      color: 'bg-blue-50 text-blue-700 border-blue-100'      },
  applicant_updated:  { label: 'Profile Updated',    color: 'bg-slate-50 text-slate-600 border-slate-200'   },
  applicant_deleted:  { label: 'Applicant Deleted',  color: 'bg-rose-50 text-rose-600 border-rose-100'      },
  notes_updated:      { label: 'Notes Updated',      color: 'bg-amber-50 text-amber-700 border-amber-100'   },
  resume_viewed:      { label: 'Resume Viewed',      color: 'bg-purple-50 text-purple-600 border-purple-100'},
  prescreen_rerun:    { label: 'AI Prescreen Rerun', color: 'bg-[#E6F7FB] text-[#1A3C6E] border-[#b3e6f5]' },
  job_created:        { label: 'Job Created',        color: 'bg-emerald-50 text-emerald-700 border-emerald-100'},
  job_updated:        { label: 'Job Updated',        color: 'bg-slate-50 text-slate-600 border-slate-200'   },
  job_deleted:        { label: 'Job Deleted',        color: 'bg-rose-50 text-rose-600 border-rose-100'      },
  employee_added:     { label: 'Employee Added',     color: 'bg-emerald-50 text-emerald-700 border-emerald-100'},
  archived:           { label: 'Archived',           color: 'bg-slate-100 text-slate-600 border-slate-200'  },
};

const ENTITY_ICONS = {
  applicant: <User size={14} />,
  job:       <Briefcase size={14} />,
  employee:  <Users size={14} />,
  system:    <Cpu size={14} />,
};

const ENTITY_FILTERS = [
  { value: '',          label: 'All Types'  },
  { value: 'applicant', label: 'Applicants' },
  { value: 'job',       label: 'Jobs'       },
  { value: 'employee',  label: 'Employees'  },
];

const ACTION_FILTERS = [
  { value: '',                  label: 'All Actions'   },
  { value: 'status_changed',    label: 'Stage Changes' },
  { value: 'prescreen_rerun',   label: 'AI Prescreen'  },
  { value: 'applicant_deleted', label: 'Deletions'     },
  { value: 'resume_viewed',     label: 'Resume Views'  },
  { value: 'job_created',       label: 'Jobs Created'  },
  { value: 'notes_updated',     label: 'Notes Updated' },
  { value: 'archived',          label: 'Archived'      },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Parses the previous hiring stage from a log details string.
 * e.g. "Stage moved: 'Accepted' → 'Archived'" → "Accepted"
 */
function parsePrevStatus(details) {
  const m = (details || '').match(/Stage moved: '(.+?)'\s*→/);
  return m?.[1] ?? 'Accepted';
}

// ── Log Row ───────────────────────────────────────────────────────────────────

const LogRow = ({ log, onRefresh }) => {
  const meta       = ACTION_META[log.action] || { label: log.action, color: 'bg-slate-50 text-slate-500 border-slate-200' };
  const entityIcon = ENTITY_ICONS[log.entity_type] || <Cpu size={14} />;
  const [unarchiving, setUnarchiving] = useState(false);

  // Show unarchive button when a status_changed log moved an applicant TO Archived
  const isArchivedLog =
    log.action === 'status_changed' &&
    log.entity_type === 'applicant' &&
    !!log.entity_id &&
    (log.details || '').includes("→ 'Archived'");

  const handleUnarchive = async () => {
    if (!log.entity_id) return;
    const prevStatus = parsePrevStatus(log.details);
    try {
      setUnarchiving(true);
      await axios.patch(`${api}/applicants/${log.entity_id}`, { hiring_status: prevStatus });
      onRefresh?.();
    } catch (err) {
      console.error('Unarchive failed:', err);
    } finally {
      setUnarchiving(false);
    }
  };

  return (
    <div className="flex items-start gap-4 px-6 py-4 border-b border-slate-100 hover:bg-slate-50/60 transition-colors">

      {/* Entity type icon */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: TEAL_LIGHT, color: NAVY }}
      >
        {entityIcon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.color}`}>
            {meta.label}
          </span>
          {log.entity_name && (
            <span className="text-sm font-bold text-slate-800 truncate">
              {log.entity_name}
            </span>
          )}
        </div>

        {/* Details */}
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{log.details}</p>

        {/* Who made the change */}
        {log.performed_by && log.performed_by !== 'System' && (
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">by {log.performed_by}</p>
        )}

        {/* Unarchive button — restores to previous stage parsed from log details */}
        {isArchivedLog && (
          <button
            onClick={handleUnarchive}
            disabled={unarchiving}
            className="mt-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <RotateCcw size={10} className={unarchiving ? 'animate-spin' : ''} />
            {unarchiving ? 'Restoring…' : `Unarchive → ${parsePrevStatus(log.details)}`}
          </button>
        )}
      </div>

      {/* Timestamp */}
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-slate-500">{timeAgo(log.timestamp)}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{formatTimestamp(log.timestamp)}</p>
      </div>

    </div>
  );
};

// ── Filter Pill ───────────────────────────────────────────────────────────────

const FilterPill = ({ options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:border-slate-300 transition-colors"
      >
        <Filter size={11} />
        {selected.label}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 min-w-[160px]">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 transition-colors"
              style={opt.value === value ? { color: NAVY, fontWeight: 700 } : { color: '#475569' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const ActivityLog = () => {
  const [logs,         setLogs]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [clearing,     setClearing]     = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (entityFilter) params.set('entity_type', entityFilter);
      if (actionFilter) params.set('action',      actionFilter);
      const res = await axios.get(`${api}/logs?${params}`);
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch activity logs', err);
    } finally {
      setLoading(false);
    }
  }, [entityFilter, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleClear = async () => {
    if (!window.confirm('Clear all activity logs? This cannot be undone.')) return;
    try {
      setClearing(true);
      await axios.delete(`${api}/logs`);
      setLogs([]);
    } catch (err) {
      console.error('Failed to clear logs', err);
    } finally {
      setClearing(false);
    }
  };

  const grouped = logs.reduce((acc, log) => {
    const date = log.timestamp
      ? new Date(log.timestamp).toLocaleDateString('en-PH', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })
      : 'Unknown Date';
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-800">Activity Logs</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {loading ? 'Loading…' : `${logs.length} event${logs.length !== 1 ? 's' : ''} recorded`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <FilterPill options={ENTITY_FILTERS} value={entityFilter} onChange={setEntityFilter} />
          <FilterPill options={ACTION_FILTERS} value={actionFilter} onChange={setActionFilter} />

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:border-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleClear}
            disabled={clearing || logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-100 bg-rose-50 text-xs font-bold text-rose-500 hover:bg-rose-100 transition-colors disabled:opacity-40"
          >
            <Trash2 size={11} />
            Clear All
          </button>
        </div>
      </div>

      {/* Log list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <RefreshCw size={18} className="animate-spin mr-2" />
            <span className="text-sm">Loading activity logs…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center" style={{ background: TEAL_LIGHT }}>
              <Filter size={20} style={{ color: TEAL }} />
            </div>
            <p className="text-sm font-semibold text-slate-600">No activity logs found</p>
            <p className="text-xs text-slate-400 mt-1">
              {entityFilter || actionFilter
                ? 'Try adjusting the filters above.'
                : 'Actions will appear here as the system is used.'}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, entries]) => (
            <div key={date}>
              <div className="sticky top-0 px-6 py-2 bg-slate-50 border-b border-slate-100 z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{date}</p>
              </div>
              {entries.map(log => (
                <LogRow key={log.id} log={log} onRefresh={fetchLogs} />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      {!loading && logs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(ACTION_META).map(([key, meta]) => (
            <span
              key={key}
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border cursor-pointer transition-opacity ${meta.color} ${actionFilter === key ? 'opacity-100 ring-1 ring-offset-1 ring-slate-300' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => setActionFilter(prev => prev === key ? '' : key)}
            >
              {meta.label}
            </span>
          ))}
        </div>
      )}

    </div>
  );
};

export default ActivityLog;
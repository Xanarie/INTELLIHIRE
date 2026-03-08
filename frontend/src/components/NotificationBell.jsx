// frontend/src/components/NotificationBell.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Bell, X, CheckCheck, Users, Briefcase, GraduationCap, LayoutDashboard, ScrollText, Sparkles } from 'lucide-react';

const NAVY = '#1A3C6E';
const TEAL = '#00AECC';
const TEAL_LIGHT = '#E6F7FB';

// Map tab id → icon
const TAB_ICONS = {
  recruitment: Users,
  onboarding:  GraduationCap,
  jobs:        Briefcase,
  dashboard:   LayoutDashboard,
  logs:        ScrollText,
  ai:          Sparkles,
  employee:    Users,
};

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Single popup toast (bottom-right) ─────────────────────────────────────────
const NotifToast = ({ notif, onDismiss, onNavigate }) => {
  const Icon = TAB_ICONS[notif.tab] || Bell;

  // Auto-dismiss after 6 s
  useEffect(() => {
    const t = setTimeout(() => onDismiss(notif.id), 6000);
    return () => clearTimeout(t);
  }, [notif.id, onDismiss]);

  return (
    <div
      className="w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden cursor-pointer hover:shadow-xl transition-shadow animate-in slide-in-from-bottom-4 fade-in duration-300"
      onClick={() => { onNavigate(notif.tab, notif.entityId); onDismiss(notif.id); }}
    >
      {/* Coloured top bar */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${NAVY}, ${TEAL})` }} />

      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: TEAL_LIGHT }}>
          <Icon size={16} style={{ color: NAVY }} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            {notif.actorName || notif.actorEmail}
          </p>
          <p className="text-sm font-semibold text-slate-800 mt-0.5 leading-snug">
            {notif.message}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">{timeAgo(notif.timestamp)}</p>
        </div>

        {/* Close */}
        <button
          onClick={e => { e.stopPropagation(); onDismiss(notif.id); }}
          className="text-slate-300 hover:text-slate-500 transition-colors shrink-0 mt-0.5"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

// ── Notification row inside the dropdown panel ────────────────────────────────
const NotifRow = ({ notif, isUnread, currentUid, onNavigate }) => {
  const Icon = TAB_ICONS[notif.tab] || Bell;
  const isMine = notif.actorUid === currentUid;

  return (
    <button
      onClick={() => onNavigate(notif.tab, notif.entityId)}
      className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50 border-b border-slate-50 last:border-0 ${isUnread && !isMine ? 'bg-blue-50/40' : ''}`}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: isUnread && !isMine ? TEAL_LIGHT : '#f1f5f9', color: NAVY }}
      >
        <Icon size={14} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-0.5">
          {isMine ? 'You' : (notif.actorName || notif.actorEmail)}
        </p>
        <p className={`text-sm leading-snug ${isUnread && !isMine ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
          {notif.message}
        </p>
        <p className="text-[10px] text-slate-400 mt-1">{timeAgo(notif.timestamp)}</p>
      </div>

      {/* Unread dot */}
      {isUnread && !isMine && (
        <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: TEAL }} />
      )}
    </button>
  );
};

// ── Main NotificationBell component ──────────────────────────────────────────
const NotificationBell = ({
  notifications,
  unreadCount,
  popupQueue,
  markAllRead,
  dismissPopup,
  onNavigate,
  currentUid,
}) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && unreadCount > 0) markAllRead();
  };

  const handleNavigate = (tab, entityId) => {
    setOpen(false);
    onNavigate(tab, entityId);
  };

  const recent = notifications.slice(0, 30);

  return (
    <>
      {/* ── Bell button ─────────────────────────────────────────────────────── */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={handleOpen}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] px-1 rounded-full text-[9px] font-black text-white flex items-center justify-center"
              style={{ background: '#ef4444' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* ── Dropdown panel ──────────────────────────────────────────────── */}
        {open && (
          <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-150">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="text-sm font-black text-slate-800">Notifications</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </p>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-[11px] font-bold transition-colors hover:opacity-70"
                  style={{ color: TEAL }}
                >
                  <CheckCheck size={13} />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
              {recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ background: TEAL_LIGHT }}>
                    <Bell size={18} style={{ color: TEAL }} />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">No notifications yet</p>
                  <p className="text-xs mt-1">Changes by other recruiters will appear here.</p>
                </div>
              ) : (
                recent.map(n => (
                  <NotifRow
                    key={n.id}
                    notif={n}
                    isUnread={n.timestamp > (Date.now() - 1)} // re-evaluated in parent via unreadCount
                    currentUid={currentUid}
                    onNavigate={handleNavigate}
                  />
                ))
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── Popup toast stack (bottom-right) ──────────────────────────────── */}
      {popupQueue.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[250] flex flex-col gap-3 pointer-events-none">
          {popupQueue.slice(-4).map(n => (
            <div key={n.id} className="pointer-events-auto">
              <NotifToast
                notif={n}
                onDismiss={dismissPopup}
                onNavigate={(tab, entityId) => { onNavigate(tab, entityId); dismissPopup(n.id); }}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default NotificationBell;
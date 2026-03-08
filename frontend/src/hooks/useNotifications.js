// frontend/src/hooks/useNotifications.js
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ref, push, onValue, off, get, set, serverTimestamp,
} from 'firebase/database';
import { db, auth } from '../firebaseConfig';

/**
 * Writes a single notification to Firebase RTDB.
 * Call this from any action handler after a successful operation.
 *
 * @param {string} message  - Human-readable description, e.g. "moved John Doe to Interview"
 * @param {string} tab      - AdminHub tab id to navigate to, e.g. "recruitment"
 * @param {string} [entityId] - Optional applicant/job id for deep-linking
 */
export async function pushNotification(message, tab, entityId = null) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await push(ref(db, 'notifications'), {
      actorUid:   user.uid,
      actorEmail: user.email,
      actorName:  user.displayName || user.email?.split('@')[0] || 'Someone',
      message,
      tab,
      entityId,
      timestamp:  Date.now(),
    });
  } catch (err) {
    console.warn('pushNotification failed:', err);
  }
}

/**
 * Main notifications hook.
 * Returns { notifications, unreadCount, popupQueue, markAllRead, dismissPopup }
 */
export function useNotifications() {
  const currentUid = auth.currentUser?.uid;

  const [notifications, setNotifications] = useState([]);  // full list (newest first)
  const [lastReadAt,    setLastReadAt]    = useState(null); // timestamp of last "mark read"
  const [popupQueue,    setPopupQueue]    = useState([]);   // items currently showing as toast

  const lastReadAtRef    = useRef(null);
  const isMountedRef     = useRef(true);
  const seenIdsRef       = useRef(new Set());               // prevent re-popping on re-subscribe

  // ── Load lastReadAt for this user ───────────────────────────────────────────
  useEffect(() => {
    if (!currentUid) return;
    const userRef = ref(db, `userActivity/${currentUid}/lastReadAt`);
    get(userRef).then(snap => {
      const val = snap.val() || 0;
      if (isMountedRef.current) {
        setLastReadAt(val);
        lastReadAtRef.current = val;
      }
    }).catch(() => {});

    return () => { isMountedRef.current = false; };
  }, [currentUid]);

  // ── Subscribe to /notifications ────────────────────────────────────────────
  useEffect(() => {
    if (!currentUid || lastReadAt === null) return;

    const notifRef = ref(db, 'notifications');

    const handler = (snap) => {
      if (!isMountedRef.current) return;
      const raw = snap.val() || {};
      const all = Object.entries(raw)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.timestamp - a.timestamp);

      setNotifications(all);

      // Show popups for NEW notifications from OTHER users that arrived
      // after we mounted (i.e., their timestamp > lastReadAtRef.current and
      // they're not in our seenIds set, and they're not ours)
      all.forEach(n => {
        if (
          n.actorUid !== currentUid &&
          n.timestamp > lastReadAtRef.current &&
          !seenIdsRef.current.has(n.id)
        ) {
          seenIdsRef.current.add(n.id);
          setPopupQueue(prev => [...prev, n]);
        }
      });
    };

    onValue(notifRef, handler);
    return () => off(notifRef, 'value', handler);
  }, [currentUid, lastReadAt]);

  // ── Mark all as read ────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (!currentUid) return;
    const now = Date.now();
    lastReadAtRef.current = now;
    setLastReadAt(now);
    try {
      await set(ref(db, `userActivity/${currentUid}/lastReadAt`), now);
    } catch (err) {
      console.warn('markAllRead failed:', err);
    }
  }, [currentUid]);

  // ── Dismiss a single popup toast ────────────────────────────────────────────
  const dismissPopup = useCallback((id) => {
    setPopupQueue(prev => prev.filter(n => n.id !== id));
  }, []);

  // ── Derived unread count (from others, after lastReadAt) ────────────────────
  const unreadCount = notifications.filter(
    n => n.actorUid !== currentUid && n.timestamp > (lastReadAt || 0)
  ).length;

  return { notifications, unreadCount, popupQueue, markAllRead, dismissPopup };
}
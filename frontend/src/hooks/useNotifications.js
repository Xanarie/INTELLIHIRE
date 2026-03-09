// frontend/src/hooks/useNotifications.js
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ref, push, onValue, off, get, set,
} from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebaseConfig';

/**
 * Writes a single notification to Firebase RTDB.
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
  // ── Reactive currentUid — waits for Firebase auth to resolve ─────────────
  const [currentUid, setCurrentUid] = useState(() => auth.currentUser?.uid ?? null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUid(user?.uid ?? null);
    });
    return () => unsubscribe();
  }, []);

  const [notifications, setNotifications] = useState([]);
  const [lastReadAt,    setLastReadAt]     = useState(null);
  const [popupQueue,    setPopupQueue]     = useState([]);

  const lastReadAtRef = useRef(null);
  const isMountedRef  = useRef(true);
  const seenIdsRef    = useRef(new Set());

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ── Load lastReadAt once currentUid is known ────────────────────────────
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
  }, [currentUid]);

  // ── Subscribe to notifications once currentUid is known ────────────────
  useEffect(() => {
    if (!currentUid) return;

    const notifRef = ref(db, 'notifications');

    const handler = (snap) => {
      if (!snap.exists() || !isMountedRef.current) return;

      const raw = snap.val();
      const list = Object.entries(raw)
        .map(([id, val]) => ({ id, ...val }))
        .sort((a, b) => b.timestamp - a.timestamp);

      setNotifications(list);

      // Show popup only for new notifications from others
      const newItems = list.filter(n =>
        !seenIdsRef.current.has(n.id) &&
        n.actorUid !== currentUid &&
        n.timestamp > (lastReadAtRef.current || 0)
      );

      newItems.forEach(n => seenIdsRef.current.add(n.id));

      if (newItems.length > 0) {
        setPopupQueue(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const toAdd = newItems.filter(n => !existingIds.has(n.id));
          return [...prev, ...toAdd];
        });
      }
    };

    onValue(notifRef, handler);
    return () => off(notifRef, 'value', handler);
  }, [currentUid]);

  const markAllRead = useCallback(() => {
    if (!currentUid) return;
    const now = Date.now();
    setLastReadAt(now);
    lastReadAtRef.current = now;
    set(ref(db, `userActivity/${currentUid}/lastReadAt`), now).catch(() => {});
  }, [currentUid]);

  const dismissPopup = useCallback((id) => {
    setPopupQueue(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadCount = notifications.filter(
    n => n.actorUid !== currentUid && n.timestamp > (lastReadAt || 0)
  ).length;

  return { notifications, unreadCount, popupQueue, markAllRead, dismissPopup };
}
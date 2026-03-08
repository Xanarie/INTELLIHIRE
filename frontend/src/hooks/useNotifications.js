// frontend/src/hooks/useNotifications.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, push, onValue, off, get, set } from 'firebase/database';
import { db, auth } from '../firebaseConfig';

/**
 * Writes a notification to Firebase RTDB.
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

export function useNotifications() {
  // ── Reactive auth — fixes the race where auth.currentUser is null on first render ──
  const [currentUid, setCurrentUid] = useState(() => auth.currentUser?.uid ?? null);

  useEffect(() => {
    // onAuthStateChanged returns unsubscribe — use as cleanup directly
    return onAuthStateChanged(auth, user => {
      setCurrentUid(user?.uid ?? null);
    });
  }, []);

  const [notifications, setNotifications] = useState([]);
  const [lastReadAt,    setLastReadAt]    = useState(null);
  const [popupQueue,    setPopupQueue]    = useState([]);

  const lastReadAtRef = useRef(null);
  const seenIdsRef    = useRef(new Set());

  // ── Load lastReadAt for this user ──────────────────────────────────────────
  useEffect(() => {
    if (!currentUid) return;
    let mounted = true;
    get(ref(db, `userActivity/${currentUid}/lastReadAt`))
      .then(snap => {
        if (!mounted) return;
        const val = snap.val() ?? 0;
        setLastReadAt(val);
        lastReadAtRef.current = val;
      })
      .catch(() => {
        if (!mounted) return;
        setLastReadAt(0);
        lastReadAtRef.current = 0;
      });
    return () => { mounted = false; };
  }, [currentUid]);

  // ── Subscribe to /notifications once auth + lastReadAt are ready ──────────
  useEffect(() => {
    if (!currentUid || lastReadAt === null) return;

    const notifRef = ref(db, 'notifications');
    let mounted = true;

    const handler = (snap) => {
      if (!mounted) return;
      const raw = snap.val() || {};
      const all = Object.entries(raw)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.timestamp - a.timestamp);

      setNotifications(all);

      // Only pop for notifications from OTHER users that arrived after lastReadAt
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
    return () => {
      mounted = false;
      off(notifRef, 'value', handler);
    };
  }, [currentUid, lastReadAt]);

  // ── Mark all as read ───────────────────────────────────────────────────────
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

  const dismissPopup = useCallback((id) => {
    setPopupQueue(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadCount = notifications.filter(
    n => n.actorUid !== currentUid && n.timestamp > (lastReadAt || 0)
  ).length;

  return { notifications, unreadCount, popupQueue, markAllRead, dismissPopup };
}
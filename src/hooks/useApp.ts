import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

/** Locks the app after a period of inactivity. Any pointer/key activity resets it. */
export function useInactivityLock(minutes: number): void {
  useEffect(() => {
    const touch = () => useAuthStore.getState().touch();
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, touch, { passive: true }));

    const timer = window.setInterval(() => {
      const { user, locked, lastActivity, lock } = useAuthStore.getState();
      if (!user || locked) return;
      if (minutes > 0 && Date.now() - lastActivity > minutes * 60_000) lock();
    }, 15_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, touch));
      window.clearInterval(timer);
    };
  }, [minutes]);
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Small helper for setState-style toggles in dialogs. */
export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return {
    open,
    show: () => setOpen(true),
    hide: () => setOpen(false),
    toggle: () => setOpen((value) => !value),
  };
}

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Circle } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { UpdatePrompt } from './UpdatePrompt';
import { ToastViewport } from '@/components/common/Toast';
import { useSettings } from '@/hooks/useDb';
import { useInactivityLock } from '@/hooks/useApp';

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const settings = useSettings();
  useInactivityLock(settings?.lockAfterMinutes ?? 15);

  return (
    <div className="min-h-screen lg:pl-[264px]">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-h-screen flex-col">
        <Topbar onMenu={() => setMenuOpen(true)} />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div key={location.pathname} className="mx-auto w-full max-w-[1440px] animate-fade-up">
            <Outlet />
          </div>
        </main>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-200/50 px-4 py-4 text-[11px] text-ink-400 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5">
            <Circle className="h-1.5 w-1.5 fill-sage-500 text-sage-500" />
            {settings?.businessName ?? 'Zine'} · data stored on this device
          </span>
          <span className="inline-flex items-center gap-3">
            <span>Works offline</span>
            <span className="text-ink-300">·</span>
            <span>Please back up weekly</span>
          </span>
        </footer>
      </div>

      <ToastViewport />
      <UpdatePrompt />
    </div>
  );
}

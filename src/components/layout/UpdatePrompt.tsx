import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/common/Button';

/**
 * PWA update prompt. Updates are never forced: an employee may be mid-bill, so
 * the new version waits until they choose to refresh.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-[110] w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 animate-fade-up">
      <div className="flex items-center gap-3 rounded-2xl border border-gold-300/60 bg-ink-950 px-4 py-3 text-cream shadow-lift">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400 text-ink-950">
          <RefreshCw className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">A new version of Zine is ready</p>
          <p className="text-[11.5px] text-ink-300">Finish your current bill, then refresh to update.</p>
        </div>
        <Button size="sm" variant="gold" onClick={() => void updateServiceWorker(true)}>
          Refresh
        </Button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-[12px] font-medium text-ink-300 hover:text-white"
        >
          Later
        </button>
      </div>
    </div>
  );
}

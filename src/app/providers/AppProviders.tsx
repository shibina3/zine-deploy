import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ownerExists } from '@/services/auth/authService';
import { ensureSettings, requestPersistentStorage } from '@/db/repositories/settingsRepo';
import { hydrateSession } from '@/stores/authStore';
import { BootContext, type BootState } from './bootContext';

/**
 * Opens the database, applies defaults, re-validates the stored session and asks
 * the browser for persistent storage. Everything else renders after this.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<BootState, 'completeSetup'>>({
    ready: false,
    needsSetup: false,
    storagePersisted: false,
  });

  const completeSetup = useCallback(() => {
    setState((previous) => ({ ...previous, needsSetup: false }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureSettings();
        const persisted = await requestPersistentStorage();
        const hasOwner = await ownerExists();
        await hydrateSession();
        if (!cancelled) {
          setState({ ready: true, needsSetup: !hasOwner, storagePersisted: persisted });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            ready: true,
            needsSetup: false,
            storagePersisted: false,
            bootError: error instanceof Error ? error.message : 'Could not open the local database.',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <BootContext.Provider value={{ ...state, completeSetup }}>{children}</BootContext.Provider>
  );
}

import { createContext, useContext } from 'react';

export interface BootState {
  ready: boolean;
  needsSetup: boolean;
  storagePersisted: boolean;
  bootError?: string;
  completeSetup: () => void;
}

export const BootContext = createContext<BootState>({
  ready: false,
  needsSetup: false,
  storagePersisted: false,
  completeSetup: () => undefined,
});

export function useBoot() {
  return useContext(BootContext);
}

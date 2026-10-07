import { createContext, useContext } from 'react';
import type { SessionProfile } from './auth-client';

export const PortalContext = createContext<SessionProfile | null>(null);
export const usePortalProfile = () => useContext(PortalContext);

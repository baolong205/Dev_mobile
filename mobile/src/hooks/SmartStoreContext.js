import React, { createContext, useContext } from 'react';
import { useSmartStoreSocket } from './useSmartStoreSocket';
import { useAlerts } from './useAlerts';
const Context = createContext(null);
export function SmartStoreProvider({ children }) {
  const state = useSmartStoreSocket();
  const alerts = useAlerts();
  return <Context.Provider value={{ ...state, alerts }}>{children}</Context.Provider>;
}
export const useSmartStore = () => useContext(Context);
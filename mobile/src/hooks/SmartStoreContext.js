import React, { createContext, useContext } from 'react';
import { useSmartStoreSocket } from './useSmartStoreSocket';
import { useAlerts } from './useAlerts';
import { useNotifications } from './useNotifications';
const Context = createContext(null);
export function SmartStoreProvider({ children }) {
  const state = useSmartStoreSocket();
  const alerts = useAlerts();
  const notifications = useNotifications();
  return <Context.Provider value={{ ...state, alerts, notifications }}>{children}</Context.Provider>;
}
export const useSmartStore = () => useContext(Context);

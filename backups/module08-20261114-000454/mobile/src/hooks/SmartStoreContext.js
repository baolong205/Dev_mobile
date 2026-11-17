import React, { createContext, useContext } from 'react';
import { useSmartStoreSocket } from './useSmartStoreSocket';
const Context = createContext(null);
export function SmartStoreProvider({ children }) {
  const state = useSmartStoreSocket();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export const useSmartStore = () => useContext(Context);
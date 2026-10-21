import type { StateStorage } from "zustand/middleware";

/**
 * localStorage wrapper that never throws. Private windows, blocked storage or a full quota
 * just mean the demo runs in memory and resets on reload.
 */
export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // ignore: storage unavailable or full
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

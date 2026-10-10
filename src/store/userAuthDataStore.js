import { create } from "zustand";

export const userAuthDataStore = create(set => ({
  user: null,
  setUser: user => set({ user }),
}));

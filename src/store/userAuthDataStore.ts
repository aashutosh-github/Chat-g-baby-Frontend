import { create } from "zustand";

import type { User } from "../types";

type UserAuthStore = {
  user: User | null;
  setUser: (user: User | null) => void;
};

export const userAuthDataStore = create<UserAuthStore>(set => ({
  user: null,
  setUser: user => set({ user }),
}));

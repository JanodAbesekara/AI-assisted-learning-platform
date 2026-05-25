import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  email: string | null;
  userId: number | null;
  setAuth: (token: string, email: string, userId: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      userId: null,
      setAuth: (token, email, userId) => set({ token, email, userId }),
      logout: () => set({ token: null, email: null, userId: null }),
    }),
    { name: "selflearn-auth" }
  )
);

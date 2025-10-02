import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

function decodeExp(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]))?.exp * 1000 || 0;
  } catch {
    return 0;
  }
}
function isExpired(token) {
  const expMs = decodeExp(token);
  return !token || (expMs && expMs < Date.now());
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isTokenExpired: () => isExpired(get().token),
    }),
    {
      name: "auth", // clave en localStorage
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }), // sólo guardamos lo necesario
    }
  )
);

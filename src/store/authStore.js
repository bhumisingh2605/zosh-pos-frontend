import { create } from 'zustand';
import * as authApi from '../api/auth';
import * as usersApi from '../api/users';

const savedUser = (() => {
  try {
    const raw = localStorage.getItem('zosh_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('zosh_jwt'),
  user: savedUser,
  loading: false,
  error: null,

  isAuthenticated: () => !!get().token,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.login({ email, password });
      localStorage.setItem('zosh_jwt', res.jwt);
      localStorage.setItem('zosh_user', JSON.stringify(res.user));
      set({ token: res.jwt, user: res.user, loading: false });
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Could not sign in. Check your details and try again.';
      set({ loading: false, error: msg });
      throw new Error(msg);
    }
  },

  signup: async (payload) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.signup(payload);
      localStorage.setItem('zosh_jwt', res.jwt);
      localStorage.setItem('zosh_user', JSON.stringify(res.user));
      set({ token: res.jwt, user: res.user, loading: false });
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Could not create your account.';
      set({ loading: false, error: msg });
      throw new Error(msg);
    }
  },

  refreshProfile: async () => {
    try {
      const profile = await usersApi.getProfile();
      localStorage.setItem('zosh_user', JSON.stringify(profile));
      set({ user: profile });
      return profile;
    } catch {
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem('zosh_jwt');
    localStorage.removeItem('zosh_user');
    set({ token: null, user: null });
  },

  clearError: () => set({ error: null }),
}));

// client/src/lib/auth.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiRequest } from './api';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isAuthChecked: boolean; // ✅ NOVO: Controla se a verificação inicial foi feita
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (credential: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isAuthChecked: false, // ✅ NOVO: Inicia como falso

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiRequest('POST', '/api/auth/login', { email, password });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Falha no login: Status ${response.status}` }));
            throw new Error(errorData.error || 'Credenciais inválidas ou erro no servidor.');
          }
          const data = await response.json();
          if (data.token && data.user) {
            set({
              user: data.user,
              token: data.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              isAuthChecked: true, // ✅ Ação de login define que a checagem foi feita
            });
            return true;
          } else {
            throw new Error('Resposta de login inválida do servidor.');
          }
        } catch (error: any) {
          set({ isLoading: false, error: error.message, isAuthenticated: false, user: null, token: null, isAuthChecked: true }); // ✅ Define como checado mesmo em erro
          return false;
        }
      },
      
      register: async (username, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiRequest('POST', '/api/auth/register', { username, email, password });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Falha no registro: Status ${response.status}` }));
            throw new Error(errorData.error || 'Erro ao registrar ou usuário já existe.');
          }
          const data = await response.json();
          if (data.token && data.user) {
            set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false, error: null, isAuthChecked: true }); // ✅
            return true;
          } else {
            throw new Error('Resposta de registro inválida do servidor.');
          }
        } catch (error: any) {
          set({ isLoading: false, error: error.message, isAuthenticated: false, user: null, token: null, isAuthChecked: true }); // ✅
          return false;
        }
      },

      loginWithGoogle: async (credential) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiRequest('POST', '/api/auth/google', { credential });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Falha no login com Google' }));
            throw new Error(errorData.error || 'Erro no servidor durante o login com Google.');
          }
          const data = await response.json();
          if (data.token && data.user) {
            set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false, error: null, isAuthChecked: true }); // ✅
            return true;
          } else {
            throw new Error('Resposta de login do Google inválida do servidor.');
          }
        } catch (error: any) {
          set({ isLoading: false, error: error.message, isAuthenticated: false, user: null, token: null, isAuthChecked: true }); // ✅
          return false;
        }
      },
      
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null, isAuthChecked: true }); // ✅
      },
      
      checkAuth: () => {
        try {
          const state = get();
          if (state.token && state.user) {
            set({ isAuthenticated: true, isLoading: false });
          } else {
            set({ isAuthenticated: false, user: null, token: null, isLoading: false });
          }
        } catch (error) {
            console.error("Falha ao checar autenticação:", error);
            set({ isAuthenticated: false, user: null, token: null, isLoading: false });
        } finally {
            set({ isAuthChecked: true }); // ✅ Define que a checagem terminou
        }
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);

/**
 * User Store - Manages user session state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, UserRole, UserSession } from '../domain/entities';

interface UserState {
  // State
  user: UserSession | null;
  player: Player | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (pin: string) => Promise<boolean>;
  loginAsSpectator: () => void;
  logout: () => void;
  setUser: (user: UserSession | null) => void;
  setPlayer: (player: Player | null) => void;
  clearError: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      player: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login with PIN
      login: async (pin: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin }),
          });

          if (!response.ok) {
            const data = await response.json();
            set({
              isLoading: false,
              error: data.error || 'Error de autenticación',
            });
            return false;
          }

          const data = await response.json();
          const { player } = data;

          if (!player) {
            set({
              isLoading: false,
              error: 'PIN no encontrado',
            });
            return false;
          }

          // Determine role based on player type
          let role: UserRole = 'player';
          if (player.isGuest) {
            role = 'guest';
          }
          // Organizer role is determined by admin PIN (0000 or configured)
          if (pin === '0000' || data.isOrganizer) {
            role = 'organizer';
          }

          const userSession: UserSession = {
            userId: player.id,
            name: player.name,
            role,
          };

          set({
            user: userSession,
            player,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return true;
        } catch (error) {
          set({
            isLoading: false,
            error: 'Error de conexión',
          });
          return false;
        }
      },

      // Login as spectator (no PIN required)
      loginAsSpectator: () => {
        const userSession: UserSession = {
          userId: 'spectator',
          name: 'Espectador',
          role: 'spectator',
        };

        set({
          user: userSession,
          player: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      // Logout
      logout: () => {
        set({
          user: null,
          player: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      // Direct setters for external updates
      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      setPlayer: (player) => {
        set({ player });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'f1-user-store',
      partialize: (state) => ({
        user: state.user,
        player: state.player,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors
export const selectUser = (state: UserState) => state.user;
export const selectPlayer = (state: UserState) => state.player;
export const selectIsAuthenticated = (state: UserState) => state.isAuthenticated;
export const selectIsOrganizer = (state: UserState) => state.user?.role === 'organizer';
export const selectIsPlayer = (state: UserState) =>
  state.user?.role === 'player' || state.user?.role === 'organizer';
export const selectIsSpectator = (state: UserState) => state.user?.role === 'spectator';
export const selectIsGuest = (state: UserState) => state.user?.role === 'guest';

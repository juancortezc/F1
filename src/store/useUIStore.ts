/**
 * UI Store - Manages UI state (modals, tabs, etc.)
 */

import { create } from 'zustand';

export type TabName = 'live' | 'times' | 'hall-of-fame' | 'admin' | 'puntaje' | 'stats';
export type AdminTab = 'players' | 'circuits' | 'guests' | 'tournaments';

interface EditingItem {
  type: 'player' | 'circuit' | 'guest' | 'tournament';
  id: string | 'new';
  data?: any;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface UIStore {
  // Navigation
  activeTab: TabName;
  adminTab: AdminTab;
  previousTab: TabName | null;

  // Modals
  isEditModalOpen: boolean;
  editingItem: EditingItem | null;
  isConfirmModalOpen: boolean;
  confirmModalData: {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null;

  // Toasts
  toasts: Toast[];

  // Loading states
  isPageLoading: boolean;
  loadingMessage: string | null;

  // Mobile
  isMobileMenuOpen: boolean;
  isLandscape: boolean;

  // Actions
  setActiveTab: (tab: TabName) => void;
  setAdminTab: (tab: AdminTab) => void;
  goBack: () => void;

  openEditModal: (item: EditingItem) => void;
  closeEditModal: () => void;

  openConfirmModal: (data: UIStore['confirmModalData']) => void;
  closeConfirmModal: () => void;

  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  setPageLoading: (loading: boolean, message?: string) => void;
  toggleMobileMenu: () => void;
  setLandscape: (isLandscape: boolean) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state
  activeTab: 'live',
  adminTab: 'players',
  previousTab: null,

  isEditModalOpen: false,
  editingItem: null,
  isConfirmModalOpen: false,
  confirmModalData: null,

  toasts: [],

  isPageLoading: false,
  loadingMessage: null,

  isMobileMenuOpen: false,
  isLandscape: false,

  // Navigation actions
  setActiveTab: (tab) => {
    const current = get().activeTab;
    set({
      activeTab: tab,
      previousTab: current,
      isMobileMenuOpen: false,
    });
  },

  setAdminTab: (tab) => {
    set({ adminTab: tab });
  },

  goBack: () => {
    const { previousTab } = get();
    if (previousTab) {
      set({
        activeTab: previousTab,
        previousTab: null,
      });
    }
  },

  // Modal actions
  openEditModal: (item) => {
    set({
      isEditModalOpen: true,
      editingItem: item,
    });
  },

  closeEditModal: () => {
    set({
      isEditModalOpen: false,
      editingItem: null,
    });
  },

  openConfirmModal: (data) => {
    set({
      isConfirmModalOpen: true,
      confirmModalData: data,
    });
  },

  closeConfirmModal: () => {
    set({
      isConfirmModalOpen: false,
      confirmModalData: null,
    });
  },

  // Toast actions
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },

  // Loading actions
  setPageLoading: (loading, message) => {
    set({
      isPageLoading: loading,
      loadingMessage: message || null,
    });
  },

  // Mobile actions
  toggleMobileMenu: () => {
    set((state) => ({
      isMobileMenuOpen: !state.isMobileMenuOpen,
    }));
  },

  setLandscape: (isLandscape) => {
    set({ isLandscape });
  },
}));

// Selectors
export const selectActiveTab = (state: UIStore) => state.activeTab;
export const selectAdminTab = (state: UIStore) => state.adminTab;
export const selectIsEditModalOpen = (state: UIStore) => state.isEditModalOpen;
export const selectEditingItem = (state: UIStore) => state.editingItem;
export const selectToasts = (state: UIStore) => state.toasts;
export const selectIsPageLoading = (state: UIStore) => state.isPageLoading;
export const selectIsMobileMenuOpen = (state: UIStore) => state.isMobileMenuOpen;
export const selectIsLandscape = (state: UIStore) => state.isLandscape;

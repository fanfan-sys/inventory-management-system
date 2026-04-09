import { create } from 'zustand';

export type PageType = 
  | 'dashboard' 
  | 'products' 
  | 'suppliers' 
  | 'customers' 
  | 'purchase-orders' 
  | 'sales-orders'
  | 'inventory';

interface AppState {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
}));

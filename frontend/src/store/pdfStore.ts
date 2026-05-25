import { create } from "zustand";

export interface PdfItem {
  id: number;
  filename: string;
  upload_date: string;
  chunk_count: number;
  indexed: boolean;
}

interface PdfState {
  pdfs: PdfItem[];
  selectedIds: number[];
  setPdfs: (pdfs: PdfItem[]) => void;
  toggleSelect: (id: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setSelectedIds: (ids: number[]) => void;
}

export const usePdfStore = create<PdfState>((set, get) => ({
  pdfs: [],
  selectedIds: [],
  setPdfs: (pdfs) => set({ pdfs }),
  toggleSelect: (id) => {
    const { selectedIds } = get();
    set({
      selectedIds: selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    });
  },
  selectAll: () => set({ selectedIds: get().pdfs.map((p) => p.id) }),
  clearSelection: () => set({ selectedIds: [] }),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
}));

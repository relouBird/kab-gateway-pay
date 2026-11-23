import { create } from "zustand";

export type FlashNotice = "registered" | "passwordReset" | "passwordChanged";

interface FlashState {
  notice: FlashNotice | null;
  setNotice: (notice: FlashNotice | null) => void;
}

/** Message à afficher une fois sur la page suivante (ex. connexion), sans passer par l'URL. */
export const useFlashStore = create<FlashState>((set) => ({
  notice: null,
  setNotice: (notice) => set({ notice }),
}));

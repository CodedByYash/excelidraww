import { create } from "zustand";
import { roomsApi } from "./api";

interface Room {
  id: string;
  slug: string;
  adminId: string;
  createdAt: string;
}

interface RoomsState {
  rooms: Room[];
  loading: boolean;
  error: string | null;
  fetchRooms: () => Promise<void>;
  createRoom: (name: string) => Promise<Room | null>;
  joinRoom: (roomId: string) => Promise<void>;
}

export const useRoomsStore = create<RoomsState>((set, get) => ({
  rooms: [],
  loading: false,
  error: null,

  fetchRooms: async () => {
    set({ loading: true, error: null });
    try {
      const response = await roomsApi.list();
      set({ rooms: response.data.rooms, loading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to fetch room",
        loading: false,
      });
    }
  },

  createRoom: async (name: string) => {
    set({ loading: true, error: null });
    try {
      const response = await roomsApi.create({ name });
      const newRoom = response.data;
      set((state) => ({
        rooms: [newRoom, ...state.rooms],
        loading: false,
      }));
      return newRoom;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to create room",
        loading: false,
      });
      return null;
    }
  },

  joinRoom: async (roomId: string) => {
    try {
      await roomsApi.join(roomId);
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to join room",
        loading: false,
      });
      throw error;
    }
  },
}));

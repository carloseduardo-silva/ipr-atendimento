import { useSyncExternalStore } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type RodizioSnapshot,
} from "@/lib/rodizio-store";

/** Assina o rodízio de vendedores em tempo real (Supabase Realtime). */
export function useRodizio(): RodizioSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

import { useSyncExternalStore } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/queue-store";
import type { Patient } from "@/types/patient";

/** Assina a fila em tempo real (localStorage + sync entre abas). */
export function useQueue(): Patient[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

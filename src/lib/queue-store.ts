import type { Patient } from "@/types/patient";

/**
 * Camada de acesso à fila.
 *
 * Hoje persiste em localStorage e sincroniza entre abas pelo evento `storage`,
 * simulando um canal realtime. A API é assíncrona de propósito: para migrar
 * para Lovable Cloud / Supabase Realtime basta reimplementar as funções abaixo
 * (listPatients, addPatient, callNext, resetQueue, subscribe) sem tocar na UI.
 */

const STORAGE_KEY = "ipr.queue.v1";
const CHANNEL_NAME = "ipr-queue";

type Listener = (patients: Patient[]) => void;

const listeners = new Set<Listener>();
let cache: Patient[] = [];
let channel: BroadcastChannel | null = null;
let initialized = false;

const isBrowser = () => typeof window !== "undefined";

function read(): Patient[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Patient[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(patients: Patient[]) {
  cache = patients;
  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
    channel?.postMessage("update");
  }
  emit();
}

function emit() {
  for (const listener of listeners) listener(cache);
}

function ensureInit() {
  if (initialized || !isBrowser()) return;
  initialized = true;
  cache = read();

  window.addEventListener("storage", (event) => {
    if (event.key && event.key !== STORAGE_KEY) return;
    cache = read();
    emit();
  });

  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => {
      cache = read();
      emit();
    };
  }
}

function createId(): string {
  if (isBrowser() && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Snapshot síncrono usado pelo hook (useSyncExternalStore). */
export function getSnapshot(): Patient[] {
  ensureInit();
  return cache;
}

const EMPTY: Patient[] = [];

export function getServerSnapshot(): Patient[] {
  return EMPTY;
}

export function subscribe(listener: Listener): () => void {
  ensureInit();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function listPatients(): Promise<Patient[]> {
  ensureInit();
  return cache;
}

export async function addPatient(nome: string): Promise<Patient> {
  ensureInit();
  const patient: Patient = {
    id: createId(),
    nome: nome.trim(),
    status: "aguardando",
    createdAt: Date.now(),
  };
  write([...cache, patient]);
  return patient;
}

/** Conclui o atendimento atual e promove o primeiro da fila. */
export async function callNext(): Promise<Patient | null> {
  ensureInit();
  const waiting = cache
    .filter((p) => p.status === "aguardando")
    .sort((a, b) => a.createdAt - b.createdAt);
  const next = waiting[0] ?? null;

  const updated = cache.map((p) => {
    if (p.status === "em_atendimento") return { ...p, status: "concluido" as const };
    if (next && p.id === next.id) return { ...p, status: "em_atendimento" as const };
    return p;
  });

  write(updated);
  return next;
}

export async function resetQueue(): Promise<void> {
  ensureInit();
  write([]);
}

/** Ordena a fila de espera por ordem de chegada. */
export function sortWaiting(patients: Patient[]): Patient[] {
  return patients
    .filter((p) => p.status === "aguardando")
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** Posição 1-based da paciente na fila; 0 quando não está aguardando. */
export function getQueuePosition(patients: Patient[], patientId: string): number {
  return sortWaiting(patients).findIndex((p) => p.id === patientId) + 1;
}

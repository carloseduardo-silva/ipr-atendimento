import { toast } from "sonner";
import type { Patient } from "@/types/patient";
import { COLUMNS, TABLE, supabase, toPatient, type PacienteFilaRow } from "@/lib/supabase";

/**
 * Camada de acesso à fila (visão do painel `/admin`).
 *
 * Persiste na tabela `pacientes_fila` do Supabase e mantém um cache local
 * sincronizado por Supabase Realtime: qualquer INSERT/UPDATE/DELETE na tabela
 * dispara um refetch e notifica os assinantes (`useQueue`).
 *
 * A API pública é a mesma de antes (localStorage), então os componentes de UI
 * não precisam conhecer o banco.
 *
 * Atenção: este módulo carrega a fila inteira, incluindo nomes. Use-o apenas
 * em telas autenticadas. A sala de espera da paciente usa
 * `use-patient-queue-status`, que consulta somente a própria linha.
 */

type Listener = (patients: Patient[]) => void;

const listeners = new Set<Listener>();
let cache: Patient[] = [];
let initialized = false;

const isBrowser = () => typeof window !== "undefined";

function emit() {
  for (const listener of listeners) listener(cache);
}

/** Reporta a falha para a atendente — as chamadas na UI são fire-and-forget. */
function reportError(message: string, error: unknown): void {
  console.error(message, error);
  toast.error(message);
}

async function fetchPatients(): Promise<Patient[] | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .order("created_at", { ascending: true });

  if (error) {
    reportError("Não foi possível carregar a fila.", error);
    return null;
  }

  return (data as PacienteFilaRow[]).map(toPatient);
}

/** Recarrega a fila do banco e avisa os assinantes. */
async function refetch(): Promise<void> {
  const patients = await fetchPatients();
  if (!patients) return;
  cache = patients;
  emit();
}

function ensureInit() {
  if (initialized || !isBrowser()) return;
  initialized = true;

  void refetch();

  supabase
    .channel("pacientes_fila_admin")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => {
      // Um refetch completo por evento é suficiente para o volume do MVP e
      // evita erros de merge incremental dos payloads.
      void refetch();
    })
    .subscribe();
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
  const patients = await fetchPatients();
  if (patients) {
    cache = patients;
    emit();
  }
  return cache;
}

/** Insere a paciente enviando apenas o nome: id, status e created_at têm default no banco. */
export async function addPatient(nome: string): Promise<Patient> {
  ensureInit();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ nome: nome.trim() })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    reportError("Não foi possível adicionar a paciente.", error);
    throw error ?? new Error("INSERT em pacientes_fila não retornou a linha criada.");
  }

  const patient = toPatient(data as PacienteFilaRow);
  await refetch();
  return patient;
}

/** Conclui o atendimento atual e promove a primeira da fila. */
export async function callNext(): Promise<Patient | null> {
  ensureInit();

  const { error: concludeError } = await supabase
    .from(TABLE)
    .update({ status: "concluido" })
    .eq("status", "em_atendimento");

  if (concludeError) {
    reportError("Não foi possível concluir o atendimento atual.", concludeError);
    return null;
  }

  const { data: nextRow, error: nextError } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq("status", "aguardando")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextError) {
    reportError("Não foi possível encontrar a próxima paciente.", nextError);
    return null;
  }

  if (!nextRow) {
    await refetch();
    return null;
  }

  const next = nextRow as PacienteFilaRow;
  const { data: updated, error: promoteError } = await supabase
    .from(TABLE)
    .update({ status: "em_atendimento" })
    .eq("id", next.id)
    .select(COLUMNS)
    .single();

  if (promoteError || !updated) {
    reportError("Não foi possível chamar a próxima paciente.", promoteError);
    return null;
  }

  await refetch();
  return toPatient(updated as PacienteFilaRow);
}

/** Apaga todas as pacientes da tabela. Destrutivo e compartilhado — confirme antes de chamar. */
export async function resetQueue(): Promise<void> {
  ensureInit();

  const { error } = await supabase.from(TABLE).delete().not("id", "is", null);

  if (error) {
    reportError("Não foi possível limpar a fila.", error);
    return;
  }

  await refetch();
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

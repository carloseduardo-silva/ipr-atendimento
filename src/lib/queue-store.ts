import { toast } from "sonner";
import type { Patient } from "@/types/patient";
import { ESTIMATED_MINUTES_PER_PATIENT } from "@/types/patient";
import {
  COLUMNS,
  MISSING_COLUMN_MESSAGE,
  TABLE,
  isMissingColumnError,
  supabase,
  toPatient,
  type PacienteFilaRow,
} from "@/lib/supabase";

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

/**
 * Reporta a falha para a atendente — as chamadas na UI são fire-and-forget.
 *
 * Schema desatualizado ganha mensagem própria: o texto genérico de cada chamador
 * ("Não foi possível carregar a fila") esconderia a causa real e mandaria a
 * atendente investigar a fila em vez da migração.
 */
function reportError(message: string, error: unknown): void {
  console.error(message, error);
  toast.error(isMissingColumnError(error) ? MISSING_COLUMN_MESSAGE : message);
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

/**
 * Insere a paciente com nome, médico e telefone (opcional): id, status e
 * created_at têm default no banco.
 *
 * O `previsto_para` é calculado aqui, uma única vez, a partir da posição que ela
 * ocupa na fila do médico neste instante. Guardá-lo como timestamp absoluto (em
 * vez de recalcular pela posição atual) é o que mantém o prazo estável quando a
 * fila anda, sobrevive a um reload da sala de espera e dá ao painel um alvo real
 * para medir atraso.
 */
export async function addPatient(
  nome: string,
  medico: string,
  telefone?: string | null,
): Promise<Patient> {
  ensureInit();

  // Quantas já aguardam na fila deste médico: a nova entra logo atrás delas.
  const { count, error: countError } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("status", "aguardando")
    .eq("medico", medico);

  if (countError) {
    reportError("Não foi possível calcular o prazo estimado da paciente.", countError);
    throw countError;
  }

  const entryPosition = (count ?? 0) + 1;
  const previstoPara = new Date(
    Date.now() + entryPosition * ESTIMATED_MINUTES_PER_PATIENT * 60_000,
  ).toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      nome: nome.trim(),
      medico,
      telefone: telefone?.trim() || null,
      previsto_para: previstoPara,
    })
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

/**
 * Conclui o atendimento atual do médico e promove a primeira da fila dele.
 *
 * Escopado por médico: as filas são independentes, então cada médico pode ter
 * uma paciente em atendimento ao mesmo tempo e chamar a próxima em uma fila não
 * pode encerrar o atendimento de outra.
 */
export async function callNext(medico: string): Promise<Patient | null> {
  ensureInit();

  const { error: concludeError } = await supabase
    .from(TABLE)
    .update({ status: "concluido" })
    .eq("status", "em_atendimento")
    .eq("medico", medico);

  if (concludeError) {
    reportError("Não foi possível concluir o atendimento atual.", concludeError);
    return null;
  }

  const { data: nextRow, error: nextError } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq("status", "aguardando")
    .eq("medico", medico)
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

/**
 * Encerra o atendimento atual do médico sem chamar a próxima da fila — ao
 * contrário de `callNext`, a fila não anda: fica sem ninguém em atendimento
 * até a atendente chamar a próxima manualmente.
 */
export async function finishCurrentPatient(medico: string): Promise<void> {
  ensureInit();

  const { error } = await supabase
    .from(TABLE)
    .update({ status: "concluido" })
    .eq("status", "em_atendimento")
    .eq("medico", medico);

  if (error) {
    reportError("Não foi possível encerrar o atendimento.", error);
    return;
  }

  await refetch();
}

/**
 * Move a paciente uma posição para cima/baixo trocando o `created_at` com a
 * adjacente. A ordem da fila deriva inteiramente dessa coluna, então o swap
 * reordena o painel e a sala de espera ao mesmo tempo.
 *
 * O `currentIndex` vem da lista já filtrada pelo médico na tela, então o SELECT
 * abaixo precisa aplicar o mesmo filtro — sem ele os índices apontariam para a
 * fila global e o swap trocaria as pacientes erradas.
 */
export async function movePatient(
  medico: string,
  currentIndex: number,
  direction: "up" | "down",
): Promise<void> {
  ensureInit();

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  // Lê a fila fresca do banco: o `createdAt` do cache é epoch em ms e perde a
  // precisão de microssegundos do timestamptz, o que empataria as duas linhas.
  const { data, error: readError } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq("status", "aguardando")
    .eq("medico", medico)
    .order("created_at", { ascending: true });

  if (readError || !data) {
    reportError("Não foi possível reordenar a fila.", readError);
    return;
  }

  const rows = data as PacienteFilaRow[];
  const current = rows[currentIndex];
  const target = rows[targetIndex];

  // Índice fora da lista = a fila mudou entre o render e o clique.
  if (!current || !target) {
    await refetch();
    return;
  }

  const [{ error: currentError }, { error: targetError }] = await Promise.all([
    supabase.from(TABLE).update({ created_at: target.created_at }).eq("id", current.id),
    supabase.from(TABLE).update({ created_at: current.created_at }).eq("id", target.id),
  ]);

  if (currentError || targetError) {
    reportError("Não foi possível reordenar a fila.", currentError ?? targetError);
  }

  await refetch();
}

/**
 * Transfere a paciente para outro médico. Ela some da fila do médico atual e
 * aparece na do novo por Realtime — nenhum estado local precisa ser gerido aqui.
 */
export async function transferPatient(id: string, medico: string): Promise<void> {
  ensureInit();

  const { error } = await supabase.from(TABLE).update({ medico }).eq("id", id);

  if (error) {
    reportError("Não foi possível transferir a paciente.", error);
    return;
  }

  await refetch();
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

/** Apaga definitivamente a paciente da fila. Destrutivo — confirme antes de chamar. */
export async function removePatient(id: string): Promise<void> {
  ensureInit();

  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) {
    reportError("Não foi possível excluir a paciente.", error);
    return;
  }

  await refetch();
}

/**
 * Ordena a fila de espera por ordem de chegada. Quando `medico` é informado,
 * devolve apenas a fila daquele médico.
 */
export function sortWaiting(patients: Patient[], medico?: string): Patient[] {
  return patients
    .filter((p) => p.status === "aguardando" && (!medico || p.medico === medico))
    .sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Compara o texto buscado com nome (substring, case-insensitive) e telefone
 * (por dígitos, ignorando pontuação) da paciente.
 */
export function matchesSearch(patient: Patient, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const nameMatch = patient.nome.toLowerCase().includes(trimmed.toLowerCase());

  const queryDigits = trimmed.replace(/\D/g, "");
  const phoneMatch =
    queryDigits.length > 0 && (patient.telefone ?? "").replace(/\D/g, "").includes(queryDigits);

  return nameMatch || phoneMatch;
}

/** Posição 1-based da paciente na fila do seu médico; 0 quando não está aguardando. */
export function getQueuePosition(patients: Patient[], patientId: string): number {
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return 0;
  return sortWaiting(patients, patient.medico).findIndex((p) => p.id === patientId) + 1;
}

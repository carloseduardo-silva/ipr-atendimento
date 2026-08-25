import type { Patient } from "@/types/patient";
import { ESTIMATED_MINUTES_PER_PATIENT } from "@/types/patient";

const MS_PER_MINUTE = 60_000;

/**
 * Horário em que a paciente deveria ter sido chamada.
 *
 * A fonte de verdade é o `scheduledFor` gravado na entrada (coluna
 * `previsto_para`): é a promessa feita à paciente, calculada com a posição que
 * ela ocupava ao chegar. Medir o atraso contra ele — e não contra a posição
 * atual — é o que faz o prazo parar de encolher sozinho conforme a fila anda.
 *
 * O `index` só alimenta o fallback das linhas anteriores à migração, que não têm
 * `previsto_para`. Nesse caminho legado vale a ressalva de sempre: `movePatient`
 * reordena trocando o `created_at`, então o prazo conta a partir do timestamp
 * herdado, não da chegada real.
 */
export function getTargetTime(patient: Patient, index: number): number {
  if (patient.scheduledFor !== null) return patient.scheduledFor;
  return patient.createdAt + (index + 1) * ESTIMATED_MINUTES_PER_PATIENT * MS_PER_MINUTE;
}

/** Minutos de atraso em relação ao prazo; 0 quando ainda está dentro do prazo. */
export function getOverdueMinutes(patient: Patient, index: number, now: number): number {
  const target = getTargetTime(patient, index);
  if (now <= target) return 0;
  // Arredonda para cima para não exibir "Atrasado 0 min" no primeiro minuto.
  return Math.ceil((now - target) / MS_PER_MINUTE);
}

/** Minutos completos de espera desde a entrada na fila. */
export function getWaitedMinutes(patient: Patient, now: number): number {
  return Math.max(0, Math.floor((now - patient.createdAt) / MS_PER_MINUTE));
}

export interface QueueMetrics {
  /** Quantidade de pacientes aguardando na fila do médico. */
  total: number;
  /** Quantas já estouraram o prazo estimado. */
  late: number;
  /** Espera da paciente mais antiga, em minutos; 0 com a fila vazia. */
  longestWaitMinutes: number;
}

/** `waiting` deve vir de `sortWaiting` — já filtrado por médico e ordenado por chegada. */
export function getQueueMetrics(waiting: Patient[], now: number): QueueMetrics {
  const late = waiting.filter(
    (patient, index) => getOverdueMinutes(patient, index, now) > 0,
  ).length;

  return {
    total: waiting.length,
    late,
    // Índice 0 é a mais antiga porque `sortWaiting` ordena por createdAt asc.
    longestWaitMinutes: waiting.length > 0 ? getWaitedMinutes(waiting[0], now) : 0,
  };
}

export type PatientStatus = "aguardando" | "em_atendimento" | "concluido";

export interface Patient {
  /** UUID v4 */
  id: string;
  nome: string;
  /** Médico responsável — cada um tem a sua fila isolada. */
  medico: string;
  /** Formatado como (DD) NNNNN-NNNN; null quando não informado. */
  telefone: string | null;
  status: PatientStatus;
  /** epoch milliseconds */
  createdAt: number;
}

export const ESTIMATED_MINUTES_PER_PATIENT = 5;

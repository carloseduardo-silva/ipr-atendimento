export type PatientStatus = "aguardando" | "em_atendimento" | "concluido";

export interface Patient {
  /** UUID v4 */
  id: string;
  nome: string;
  status: PatientStatus;
  /** epoch milliseconds */
  createdAt: number;
}

export const ESTIMATED_MINUTES_PER_PATIENT = 15;

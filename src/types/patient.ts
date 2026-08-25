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
  /**
   * Horário prometido no momento da entrada, em epoch ms: a hora da chegada mais
   * a posição que ela ocupava na fila naquele instante × ESTIMATED_MINUTES_PER_PATIENT.
   *
   * Gravado uma única vez, no INSERT, e nunca recalculado — é a promessa feita à
   * paciente. Por isso não acompanha mudanças de posição: é o que permite o
   * cronômetro da sala de espera sobreviver a um reload e o atraso do painel ser
   * medido contra o prazo real, e não contra a posição atual.
   *
   * `null` nas linhas criadas antes da coluna `previsto_para` existir.
   */
  scheduledFor: number | null;
}

export const ESTIMATED_MINUTES_PER_PATIENT = 5;

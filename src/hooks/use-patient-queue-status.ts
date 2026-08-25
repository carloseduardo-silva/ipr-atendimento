import { useEffect, useState } from "react";
import {
  COLUMNS,
  MISSING_COLUMN_MESSAGE,
  TABLE,
  isMissingColumnError,
  supabase,
  toPatient,
  type PacienteFilaRow,
} from "@/lib/supabase";
import type { Patient } from "@/types/patient";

/**
 * Status da paciente na sala de espera, em tempo real.
 *
 * Consulta apenas a própria linha e um `count` das pacientes que chegaram
 * antes dela — o navegador da paciente nunca recebe os nomes das demais.
 * Qualquer mudança na tabela `pacientes_fila` (via Supabase Realtime)
 * dispara um novo cálculo de status e posição.
 */

export interface PatientQueueStatus {
  patient: Patient | null;
  /** Posição 1-based na fila; 0 quando não está aguardando. */
  position: number;
  loading: boolean;
}

export function usePatientQueueStatus(id: string | undefined): PatientQueueStatus {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [position, setPosition] = useState(0);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) {
      setPatient(null);
      setPosition(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchStatus(patientId: string) {
      const { data, error } = await supabase
        .from(TABLE)
        .select(COLUMNS)
        .eq("id", patientId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        // A paciente segue vendo "Não encontramos o seu cadastro" — schema não é
        // problema dela —, mas o console precisa apontar a migração, senão o erro
        // se disfarça de id inválido.
        if (error) {
          console.error(
            isMissingColumnError(error)
              ? MISSING_COLUMN_MESSAGE
              : "Falha ao carregar o status da paciente.",
            error,
          );
        }
        setPatient(null);
        setPosition(0);
        setLoading(false);
        return;
      }

      const row = data as PacienteFilaRow;
      setPatient(toPatient(row));

      if (row.status !== "aguardando") {
        setPosition(0);
        setLoading(false);
        return;
      }

      // Quantas pacientes do mesmo médico ainda aguardando chegaram antes dela.
      // As filas são isoladas: pacientes de outros médicos não afetam a posição.
      const { count, error: countError } = await supabase
        .from(TABLE)
        .select("id", { count: "exact", head: true })
        .eq("status", "aguardando")
        .eq("medico", row.medico)
        .lt("created_at", row.created_at);

      if (cancelled) return;

      if (countError) {
        console.error("Falha ao calcular a posição na fila.", countError);
      }

      setPosition((count ?? 0) + 1);
      setLoading(false);
    }

    void fetchStatus(id);

    const channel = supabase
      .channel(`pacientes_fila_espera_${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => {
        // Qualquer alteração na fila pode mudar a posição desta paciente.
        void fetchStatus(id);
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [id]);

  return { patient, position, loading };
}

import { Link } from "@tanstack/react-router";
import { CheckCircle2, ExternalLink, Phone, Undo2, Video } from "lucide-react";
import type { Patient } from "@/types/patient";
import { DeletePatientDialog } from "@/components/admin/DeletePatientDialog";

interface CurrentPatientCardProps {
  patient: Patient | null;
  onDelete: (id: string) => void;
  onFinish: () => void;
  onReturnToQueue: (id: string) => void;
}

export function CurrentPatientCard({
  patient,
  onDelete,
  onFinish,
  onReturnToQueue,
}: CurrentPatientCardProps) {
  return (
    <section
      className={`rounded-2xl border p-6 ${
        patient ? "border-success/40 bg-success-soft" : "border-dashed border-border bg-card"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Em atendimento
      </p>
      {patient ? (
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success text-success-foreground">
            <Video className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-semibold text-foreground">{patient.nome}</p>
            <p className="text-sm text-muted-foreground">
              A paciente já foi avisada na sala de espera.
            </p>
            {patient.telefone ? (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {patient.telefone}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {patient ? (
        <div className="mt-4 flex items-center gap-2">
          <Link
            to="/espera"
            search={{ id: patient.id }}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir sala de espera
          </Link>
          <button
            type="button"
            onClick={() => onReturnToQueue(patient.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
          >
            <Undo2 className="h-4 w-4" />
            Voltar para fila
          </button>

          <button
            type="button"
            onClick={onFinish}
            className="inline-flex items-center gap-2 rounded-xl bg-success px-3 py-2 text-sm font-semibold text-success-foreground transition hover:opacity-90"
          >
            <CheckCircle2 className="h-4 w-4" />
            Encerrar atendimento
          </button>

          <DeletePatientDialog patient={patient} onConfirm={() => onDelete(patient.id)} />
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Ninguém em atendimento. Chame a próxima paciente da fila.
        </p>
      )}
    </section>
  );
}

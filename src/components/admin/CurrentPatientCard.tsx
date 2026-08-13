import { Video } from "lucide-react";
import type { Patient } from "@/types/patient";

interface CurrentPatientCardProps {
  patient: Patient | null;
}

export function CurrentPatientCard({ patient }: CurrentPatientCardProps) {
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
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Ninguém em atendimento. Chame a próxima paciente da fila.
        </p>
      )}
    </section>
  );
}

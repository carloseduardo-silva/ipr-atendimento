import { Clock, PhoneCall, Users } from "lucide-react";
import type { Patient } from "@/types/patient";
import { ESTIMATED_MINUTES_PER_PATIENT } from "@/types/patient";

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface QueueItemProps {
  patient: Patient;
  position: number;
  isNext: boolean;
  onCallNext: () => void;
}

function QueueItem({ patient, position, isNext, onCallNext }: QueueItemProps) {
  return (
    <li
      className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
        isNext ? "border-primary/40 bg-brand-soft" : "border-border bg-card"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          isNext
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        {position}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{patient.nome}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Entrou às {formatTime(patient.createdAt)} · espera estimada{" "}
          {position * ESTIMATED_MINUTES_PER_PATIENT} min
        </p>
      </div>
      {isNext ? (
        <button
          type="button"
          onClick={onCallNext}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <PhoneCall className="h-4 w-4" />
          Chamar próximo
        </button>
      ) : null}
    </li>
  );
}

interface QueueListProps {
  waiting: Patient[];
  onCallNext: () => void;
}

export function QueueList({ waiting, onCallNext }: QueueListProps) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Users className="h-5 w-5 text-primary" />
          Aguardando
        </h2>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {waiting.length} na fila
        </span>
      </div>

      {waiting.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma paciente aguardando no momento.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {waiting.map((patient, index) => (
            <QueueItem
              key={patient.id}
              patient={patient}
              position={index + 1}
              isNext={index === 0}
              onCallNext={onCallNext}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
